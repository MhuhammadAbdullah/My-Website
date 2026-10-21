"use client";

import * as React from "react";
import { AlertTriangle, Check, Copy, ImageOff, LayoutGrid, List as ListIcon, Loader2, Search, Sparkles, Trash2, Upload, X } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label, Textarea, cn, toast } from "@agency/ui";
import { request } from "@/lib/api";
import { uploadImageToCloudinary } from "@/lib/cloudinary-upload";
import { usePermissions } from "@/lib/use-permissions";

export interface MediaItem {
  id: string;
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
  altText: string | null;
  focalX: number | null;
  focalY: number | null;
}

interface Listing {
  items: MediaItem[];
  total: number;
  page: number;
  totalPages: number;
}

const HEAVY_BYTES = 5 * 1024 * 1024;
const ALT_MAX = 125;
const ACCEPT = "image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml";

/** Thumbnail via Cloudinary's on-the-fly resize + auto format/quality. */
export function thumb(url: string, width = 320) {
  return url.includes("/upload/") ? url.replace("/upload/", `/upload/c_limit,w_${width},f_auto,q_auto/`) : url;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "0 KB";
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

const fileName = (m: MediaItem) => m.publicId.split("/").pop() ?? m.publicId;
const dims = (m: MediaItem) => (m.width && m.height ? `${m.width}×${m.height}` : "");
const isTiny = (m: MediaItem) => !!m.width && !!m.height && (m.width < 64 || m.height < 64);
// A readable starting point for alt text, built from the file name.
const suggestAlt = (m: MediaItem) =>
  fileName(m)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+[a-z0-9]{6,}$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

type Filter = "all" | "missing" | "heavy" | "broken";
type Sort = "newest" | "largest" | "name";

function Chip({ tone, children }: { tone: "warn" | "danger" | "info" | "muted"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider",
        tone === "warn" && "bg-warning-500 text-[#0b0b0c]",
        tone === "danger" && "bg-[#ff7a3d] text-[#0b0b0c]",
        tone === "info" && "bg-[#7aa2ff] text-[#0b0b0c]",
        tone === "muted" && "bg-neutral-300 text-heading",
      )}
    >
      {children}
    </span>
  );
}

function badgesFor(m: MediaItem, broken: boolean) {
  const out: React.ReactNode[] = [];
  if (broken) out.push(<Chip key="b" tone="danger">Broken</Chip>);
  if (!m.altText?.trim()) out.push(<Chip key="a" tone="warn">No alt</Chip>);
  if ((m.bytes ?? 0) > HEAVY_BYTES) out.push(<Chip key="h" tone="info">Heavy</Chip>);
  if (isTiny(m)) out.push(<Chip key="t" tone="muted">Tiny</Chip>);
  return out;
}

function StatTile({ label, value, note, active, onClick, lead }: { label: string; value: React.ReactNode; note: string; active: boolean; onClick: () => void; lead?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-[10px] border p-4 text-left transition-colors",
        active ? "border-accent-500 bg-accent-500 text-on-accent" : "border-neutral-200 bg-neutral-50 text-heading hover:border-accent-500",
        lead && !active && "border-accent-500/40",
      )}
    >
      <p className={cn("text-[12px] font-medium", active ? "text-on-accent/70" : "text-neutral-500")}>{label}</p>
      <p className="mt-2 font-heading text-[2rem] font-extrabold leading-none tracking-tight">{value}</p>
      <p className={cn("mt-2 text-[12px]", active ? "text-on-accent/70" : "text-neutral-500")}>{note}</p>
    </button>
  );
}

export function MediaLibrary({ onSelect }: { onSelect?: (item: MediaItem) => void }) {
  const { can } = usePermissions();
  const manager = !onSelect;
  const [listing, setListing] = React.useState<Listing | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [sort, setSort] = React.useState<Sort>("newest");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [page, setPage] = React.useState(1);
  const [uploading, setUploading] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [selected, setSelected] = React.useState<MediaItem | null>(null);
  const [broken, setBroken] = React.useState<Set<string>>(new Set());
  const [missingTotal, setMissingTotal] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      if (filter === "missing") params.set("missingAlt", "1");
      setListing(await request<Listing>(`/media?${params}`));
      if (manager) request<Listing>("/media?missingAlt=1&page=1").then((r) => setMissingTotal(r.total)).catch(() => undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load media");
    } finally {
      setLoading(false);
    }
  }, [page, search, filter, manager]);

  React.useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function handleUpload(files: FileList | File[] | null) {
    const list = files ? Array.from(files) : [];
    if (!list.length) return;
    setUploading(true);
    try {
      for (const file of list) {
        // Upload registers the asset; it is flagged "No alt" until a description is added.
        const media = await uploadImageToCloudinary(file, "agency-website/library");
        await request(`/media/${media.id}`, { method: "PATCH", body: JSON.stringify({ altText: "" }) });
      }
      toast.success(`${list.length} file${list.length > 1 ? "s" : ""} uploaded. Add alt text to each image.`);
      setPage(1);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const items = React.useMemo(() => {
    let rows = listing?.items ?? [];
    if (filter === "heavy") rows = rows.filter((m) => (m.bytes ?? 0) > HEAVY_BYTES);
    if (filter === "broken") rows = rows.filter((m) => broken.has(m.id));
    if (sort === "largest") rows = [...rows].sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0));
    if (sort === "name") rows = [...rows].sort((a, b) => fileName(a).localeCompare(fileName(b)));
    return rows;
  }, [listing, filter, sort, broken]);

  const pageBytes = (listing?.items ?? []).reduce((n, m) => n + (m.bytes ?? 0), 0);
  const heavyCount = (listing?.items ?? []).filter((m) => (m.bytes ?? 0) > HEAVY_BYTES).length;
  const open = (m: MediaItem) => (onSelect ? onSelect(m) : setSelected(m));
  const markBroken = (id: string) => setBroken((s) => (s.has(id) ? s : new Set(s).add(id)));

  const pill = (active: boolean) =>
    cn("rounded-full px-3 py-1 text-[12px] font-bold transition-colors", active ? "bg-accent-500 text-on-accent" : "text-neutral-500 hover:text-heading");

  return (
    <div>
      {manager && (
        <>
          {can("media", "create") && (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
                {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload files
              </Button>
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="All files" value={listing?.total ?? "…"} note={`${formatBytes(pageBytes)} on this page`} active={filter === "all"} lead onClick={() => { setFilter("all"); setPage(1); }} />
            <StatTile label="Missing alt text" value={missingTotal ?? "…"} note="Hurts SEO and accessibility" active={filter === "missing"} onClick={() => { setFilter("missing"); setPage(1); }} />
            <StatTile label="Preview failed" value={broken.size} note="Check or replace these" active={filter === "broken"} onClick={() => setFilter("broken")} />
            <StatTile label="Over 5 MB" value={heavyCount} note="Slows pages down" active={filter === "heavy"} onClick={() => setFilter("heavy")} />
          </div>

          {can("media", "create") && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void handleUpload(e.dataTransfer.files);
              }}
              className={cn("mt-4 rounded-[10px] border border-dashed px-5 py-4 text-body-sm transition-colors", dragging ? "border-accent-500 bg-accent-500/10" : "border-neutral-300 bg-neutral-50")}
            >
              <p className="text-heading">
                <strong>Drag and drop</strong> files here, or{" "}
                <button type="button" className="font-bold text-accent-500 hover:underline" onClick={() => inputRef.current?.click()}>
                  choose files
                </button>
                .
              </p>
              <p className="mt-1 text-label text-neutral-500">PNG, JPG, WebP, AVIF, GIF or SVG. Very large files slow your pages down — compress them before upload.</p>
            </div>
          )}
        </>
      )}

      <div className={cn("flex flex-wrap items-center gap-3", manager ? "mt-4" : "")}>
        <div className="relative min-w-[14rem] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <Input
            aria-label="Search media"
            placeholder="Search by file name or alt text…"
            className="h-10 pl-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div role="group" aria-label="Sort" className="inline-flex gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-1">
          {([["newest", "Newest"], ["largest", "Largest"], ["name", "Name"]] as const).map(([v, l]) => (
            <button key={v} type="button" aria-pressed={sort === v} onClick={() => setSort(v)} className={pill(sort === v)}>
              {l}
            </button>
          ))}
        </div>
        <div role="group" aria-label="View" className="inline-flex gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-1">
          <button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")} className={cn(pill(view === "grid"), "inline-flex items-center gap-1.5")}>
            <LayoutGrid className="size-3.5" aria-hidden /> Grid
          </button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")} className={cn(pill(view === "list"), "inline-flex items-center gap-1.5")}>
            <ListIcon className="size-3.5" aria-hidden /> List
          </button>
        </div>
        {!manager && can("media", "create") && (
          <Button type="button" size="sm" className="ml-auto" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            void handleUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <p className="mt-3 text-label text-neutral-500">{listing ? `Showing ${items.length} of ${listing.total} files` : ""}</p>

      <div className={cn("mt-3 grid items-start gap-5", manager && selected && "xl:grid-cols-[minmax(0,1fr)_21rem]")}>
        <div className="min-w-0">
          {loading && !listing ? (
            <p className="text-body-sm text-neutral-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-neutral-300 p-8 text-center text-body-sm text-neutral-500">No images found.</p>
          ) : view === "grid" ? (
            <ul className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", manager && selected ? "lg:grid-cols-4" : "lg:grid-cols-5")}>
              {items.map((m) => {
                const isBroken = broken.has(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => open(m)}
                      aria-label={onSelect ? `Select ${m.altText || fileName(m)}` : `Edit ${m.altText || fileName(m)}`}
                      className={cn("block w-full overflow-hidden rounded-[10px] border bg-neutral-50 text-left transition-colors", selected?.id === m.id ? "border-accent-500" : "border-neutral-200 hover:border-neutral-300")}
                    >
                      <div className="relative aspect-square bg-neutral-100">
                        {isBroken ? (
                          <div className="flex size-full flex-col items-center justify-center gap-1 border border-dashed border-neutral-300 text-neutral-400">
                            <ImageOff className="size-5" aria-hidden />
                            <span className="text-label">Preview failed</span>
                          </div>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
                          <img
                            src={thumb(m.url)}
                            alt=""
                            loading="lazy"
                            onError={() => markBroken(m.id)}
                            className="size-full object-cover"
                            style={{ objectPosition: `${(m.focalX ?? 0.5) * 100}% ${(m.focalY ?? 0.5) * 100}%` }}
                          />
                        )}
                        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">{badgesFor(m, isBroken)}</div>
                      </div>
                      <div className="p-2.5">
                        <p className="truncate text-[13px] font-semibold text-heading">{fileName(m)}</p>
                        <p className="mt-0.5 text-label text-neutral-500">{[dims(m), formatBytes(m.bytes)].filter(Boolean).join(" · ")}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="divide-y divide-neutral-200 overflow-hidden rounded-[10px] border border-neutral-200 bg-neutral-50">
              {items.map((m) => {
                const isBroken = broken.has(m.id);
                return (
                  <li key={m.id}>
                    <button type="button" onClick={() => open(m)} className={cn("flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-neutral-100", selected?.id === m.id && "bg-neutral-100")}>
                      <span className="size-11 shrink-0 overflow-hidden rounded-[6px] bg-neutral-100">
                        {isBroken ? (
                          <ImageOff className="m-3 size-5 text-neutral-400" aria-hidden />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
                          <img src={thumb(m.url, 120)} alt="" loading="lazy" onError={() => markBroken(m.id)} className="size-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-heading">{fileName(m)}</span>
                        <span className="block truncate text-label text-neutral-500">{m.altText || "No alt text"}</span>
                      </span>
                      <span className="hidden gap-1 sm:flex">{badgesFor(m, isBroken)}</span>
                      <span className="shrink-0 text-label text-neutral-500">{[dims(m), formatBytes(m.bytes)].filter(Boolean).join(" · ")}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {listing && listing.totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-body-sm text-neutral-500">
                Page {listing.page} of {listing.totalPages}
              </span>
              <Button type="button" variant="outline" size="sm" disabled={page >= listing.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>

        {manager && selected && (
          <MediaDetails
            key={selected.id}
            item={selected}
            onClose={() => setSelected(null)}
            onChanged={() => {
              setSelected(null);
              void load();
            }}
          />
        )}
      </div>
    </div>
  );
}

// 3×3 focal point grid: the chosen cell is the area kept in view when the image is cropped.
const FOCAL_STEPS = [0.15, 0.5, 0.85];

function MediaDetails({ item, onClose, onChanged }: { item: MediaItem; onClose: () => void; onChanged: () => void }) {
  const { can } = usePermissions();
  const [alt, setAlt] = React.useState(item.altText ?? "");
  const [focal, setFocal] = React.useState<{ x: number; y: number }>({ x: item.focalX ?? 0.5, y: item.focalY ?? 0.5 });
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const replaceRef = React.useRef<HTMLInputElement>(null);
  const canUpdate = can("media", "update");

  async function save() {
    setBusy(true);
    try {
      await request(`/media/${item.id}`, { method: "PATCH", body: JSON.stringify({ altText: alt.trim(), focalX: focal.x, focalY: focal.y }) });
      toast.success("Saved");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function replace(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      // Upload registers a *new* Media row; move its asset onto this id, then drop the temporary row.
      const fresh = await uploadImageToCloudinary(file, "agency-website/library");
      await request(`/media/${item.id}/replace`, {
        method: "POST",
        body: JSON.stringify({ publicId: fresh.publicId, url: fresh.url, width: fresh.width, height: fresh.height, format: fresh.format ?? "png", bytes: fresh.bytes ?? undefined }),
      });
      // Drop the temporary row without destroying the asset that now belongs to this id.
      await request(`/media/${fresh.id}/discard`, { method: "DELETE" }).catch(() => undefined);
      toast.success("Image replaced everywhere it is used");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Replace failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm("Delete this image? Anything using it will lose the image.")) return;
    setBusy(true);
    try {
      await request(`/media/${item.id}`, { method: "DELETE" });
      toast.success("Deleted");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
      setBusy(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy the link");
    }
  }

  const label = "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500";
  return (
    <aside className="rounded-[10px] border border-neutral-200 bg-neutral-50 p-4 xl:sticky xl:top-20" aria-label="File details">
      <div className="flex items-center justify-between">
        <p className={label}>File details</p>
        <button type="button" onClick={onClose} aria-label="Close details" className="flex size-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:border-accent-500 hover:text-heading">
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      <div className="mt-3 flex h-44 items-center justify-center overflow-hidden rounded-[8px] border border-neutral-200 bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL */}
        <img src={thumb(item.url, 700)} alt="" className="max-h-full max-w-full object-contain" />
      </div>
      <p className="mt-3 truncate font-heading text-[1rem] font-extrabold tracking-tight text-heading">{fileName(item)}</p>
      <p className="mt-0.5 text-label text-neutral-500">{[dims(item), formatBytes(item.bytes), item.format?.toUpperCase()].filter(Boolean).join(" · ")}</p>
      {!item.altText?.trim() && (
        <div className="mt-2">
          <Chip tone="warn">No alt</Chip>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <Label htmlFor="media-alt" className={cn(label, "mb-0")}>
          Alt text
        </Label>
        <span className="text-label text-neutral-500">
          {alt.length} / {ALT_MAX}
        </span>
      </div>
      <Textarea
        id="media-alt"
        rows={3}
        maxLength={ALT_MAX}
        value={alt}
        disabled={!canUpdate}
        onChange={(e) => setAlt(e.target.value)}
        placeholder="Describe what the image shows, for people using screen readers and for search engines."
        className="mt-1.5"
      />
      {canUpdate && (
        <button type="button" onClick={() => setAlt(suggestAlt(item).slice(0, ALT_MAX))} className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-[12px] font-bold text-accent-500 hover:border-accent-500">
          <Sparkles className="size-3" aria-hidden /> Suggest from file name
        </button>
      )}

      <p className={cn(label, "mt-4")}>Focal point</p>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5" role="group" aria-label="Focal point">
        {FOCAL_STEPS.flatMap((y) =>
          FOCAL_STEPS.map((x) => {
            const on = Math.abs(focal.x - x) < 0.18 && Math.abs(focal.y - y) < 0.18;
            return (
              <button
                key={`${x}-${y}`}
                type="button"
                disabled={!canUpdate}
                aria-pressed={on}
                aria-label={`Focus ${y < 0.3 ? "top" : y > 0.7 ? "bottom" : "middle"} ${x < 0.3 ? "left" : x > 0.7 ? "right" : "centre"}`}
                onClick={() => setFocal({ x, y })}
                className={cn("h-9 rounded-[6px] border transition-colors", on ? "border-accent-500 bg-accent-500" : "border-neutral-200 bg-neutral-100 hover:border-neutral-300")}
              />
            );
          }),
        )}
      </div>
      <p className="mt-1.5 text-label text-neutral-500">Crops keep this area in view.</p>

      {canUpdate && (
        <Button type="button" className="mt-4 w-full" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {canUpdate ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => replaceRef.current?.click()} disabled={busy}>
              Replace file
            </Button>
            <input ref={replaceRef} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => { void replace(e.target.files?.[0]); e.target.value = ""; }} />
          </>
        ) : (
          <span />
        )}
        <Button type="button" variant="outline" size="sm" onClick={copyUrl}>
          {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy URL"}
        </Button>
      </div>
      {can("media", "delete") && (
        <Button type="button" variant="outline" size="sm" className="mt-2 w-full border-error-500/50 text-error-500 hover:bg-error-500/10" onClick={remove} disabled={busy}>
          <Trash2 /> Delete file
        </Button>
      )}
      {!alt.trim() && (
        <p className="mt-3 flex items-center gap-1.5 text-label text-warning-700">
          <AlertTriangle className="size-3.5" aria-hidden /> Alt text is missing.
        </p>
      )}
    </aside>
  );
}

export function MediaLibraryDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: MediaItem) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
        </DialogHeader>
        {open && <MediaLibrary onSelect={onSelect} />}
      </DialogContent>
    </Dialog>
  );
}
