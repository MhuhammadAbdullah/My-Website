"use client";

import * as React from "react";
import { AlertTriangle, Loader2, Trash2, Upload } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
  toast,
} from "@agency/ui";
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

/** Thumbnail via Cloudinary's on-the-fly resize + auto format/quality. */
export function thumb(url: string, width = 320) {
  return url.includes("/upload/") ? url.replace("/upload/", `/upload/c_limit,w_${width},f_auto,q_auto/`) : url;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function MediaLibrary({ onSelect }: { onSelect?: (item: MediaItem) => void }) {
  const { can } = usePermissions();
  const [listing, setListing] = React.useState<Listing | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [missingAlt, setMissingAlt] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [uploading, setUploading] = React.useState(false);
  const [editing, setEditing] = React.useState<MediaItem | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      if (missingAlt) params.set("missingAlt", "1");
      setListing(await request<Listing>(`/media?${params}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load media");
    } finally {
      setLoading(false);
    }
  }, [page, search, missingAlt]);

  React.useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Upload registers the asset; file name is only a placeholder alt, flagged below until edited.
        const media = await uploadImageToCloudinary(file, "agency-website/library");
        await request(`/media/${media.id}`, { method: "PATCH", body: JSON.stringify({ altText: "" }) });
      }
      toast.success("Uploaded. Add alt text to each image.");
      setPage(1);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Search media"
          placeholder="Search by name or alt text…"
          className="max-w-xs"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="flex items-center gap-2">
          <Switch id="missing-alt" checked={missingAlt} onCheckedChange={(v) => { setMissingAlt(v); setPage(1); }} />
          <Label htmlFor="missing-alt" className="mb-0">
            Missing alt text only
          </Label>
        </div>
        {can("media", "create") && (
          <>
            <Button type="button" size="sm" className="ml-auto" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? <Loader2 className="animate-spin" /> : <Upload />} Upload
            </Button>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml"
              className="sr-only"
              onChange={(e) => {
                void handleUpload(e.target.files);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>

      {loading && !listing ? (
        <p className="mt-6 text-body-sm text-neutral-500">Loading…</p>
      ) : listing && listing.items.length === 0 ? (
        <p className="mt-6 text-body-sm text-neutral-500">No images found.</p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {listing?.items.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-xl border border-neutral-200">
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => (onSelect ? onSelect(m) : setEditing(m))}
                aria-label={onSelect ? `Select ${m.altText || m.publicId}` : `Edit ${m.altText || m.publicId}`}
              >
                <div className="aspect-[4/3] bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL */}
                  <img src={thumb(m.url)} alt="" loading="lazy" className="size-full object-cover" style={{ objectPosition: `${(m.focalX ?? 0.5) * 100}% ${(m.focalY ?? 0.5) * 100}%` }} />
                </div>
                <div className="space-y-1 p-2">
                  <p className="truncate text-body-sm text-heading">{m.altText || m.publicId.split("/").pop()}</p>
                  <div className="flex items-center gap-1.5">
                    {!m.altText?.trim() && (
                      <Badge variant="warning" className="gap-1">
                        <AlertTriangle className="size-3" /> No alt
                      </Badge>
                    )}
                    <span className="text-body-sm text-neutral-400">{[m.width && m.height ? `${m.width}×${m.height}` : "", formatBytes(m.bytes)].filter(Boolean).join(" · ")}</span>
                  </div>
                </div>
              </button>
            </li>
          ))}
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

      {editing && (
        <MediaEditDialog
          item={editing}
          onClose={() => setEditing(null)}
          onChanged={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function MediaEditDialog({ item, onClose, onChanged }: { item: MediaItem; onClose: () => void; onChanged: () => void }) {
  const { can } = usePermissions();
  const [alt, setAlt] = React.useState(item.altText ?? "");
  const [focal, setFocal] = React.useState<{ x: number; y: number } | null>(item.focalX != null && item.focalY != null ? { x: item.focalX, y: item.focalY } : null);
  const [busy, setBusy] = React.useState(false);
  const replaceRef = React.useRef<HTMLInputElement>(null);

  async function save() {
    setBusy(true);
    try {
      await request(`/media/${item.id}`, { method: "PATCH", body: JSON.stringify({ altText: alt, focalX: focal?.x ?? null, focalY: focal?.y ?? null }) });
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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit image</DialogTitle>
        </DialogHeader>
        <div
          className="relative mx-auto max-h-72 cursor-crosshair overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setFocal({ x: Number(((e.clientX - r.left) / r.width).toFixed(3)), y: Number(((e.clientY - r.top) / r.height).toFixed(3)) });
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL */}
          <img src={thumb(item.url, 900)} alt="" className="mx-auto max-h-72 w-auto" />
          {focal && (
            <span aria-hidden className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ring-1 ring-black/40" style={{ left: `${focal.x * 100}%`, top: `${focal.y * 100}%` }} />
          )}
        </div>
        <p className="text-body-sm text-neutral-500">Click the image to set the focal point (kept in view when cropped).</p>
        <div>
          <Label htmlFor="media-alt">Alt text</Label>
          <Input id="media-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe the image for screen readers" />
          {!alt.trim() && (
            <p className="mt-1 flex items-center gap-1.5 text-body-sm text-warning-700">
              <AlertTriangle className="size-4" /> Alt text is missing.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can("media", "update") && (
            <>
              <Button type="button" onClick={save} disabled={busy}>
                Save
              </Button>
              <Button type="button" variant="outline" onClick={() => replaceRef.current?.click()} disabled={busy}>
                Replace image
              </Button>
              <input ref={replaceRef} type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml" className="sr-only" onChange={(e) => { void replace(e.target.files?.[0]); e.target.value = ""; }} />
            </>
          )}
          {can("media", "delete") && (
            <Button type="button" variant="ghost" className="ml-auto text-error-500" onClick={remove} disabled={busy}>
              <Trash2 /> Delete
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
