"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, ChevronRight, GripVertical, ImageIcon, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  Badge,
  Button,
  FieldError,
  IconPicker,
  Input,
  Label,
  RichTextEditor,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  toast,
} from "@agency/ui";
import {
  BUTTON_STYLES,
  PALETTE_COLORS,
  VIDEO_KINDS,
  defaultContent,
  defaultFieldValue,
  type ButtonValue,
  type FieldDef,
  type ImageValue,
  type VideoValue,
} from "@agency/types";
import { request } from "@/lib/api";
import { uploadImageToCloudinary } from "@/lib/cloudinary-upload";
import { MediaLibraryDialog } from "./media-library";

export type FieldErrors = Record<string, string>;

// Several section cards can be open at once and each has a "heading", "body"…
// field, so DOM ids are prefixed with the owning section's key to stay unique
// (labels must bind to the right input).
export const IdScope = React.createContext("");
const useScope = () => React.useContext(IdScope);

interface FieldProps<T = unknown> {
  def: FieldDef;
  value: T;
  onChange: (next: T) => void;
  path: string;
  errors: FieldErrors;
}

function FieldShell({ def, path, errors, children }: { def: FieldDef; path: string; errors: FieldErrors; children: React.ReactNode }) {
  const scope = useScope();
  const id = `${scope}f-${path}`;
  return (
    <div>
      <Label htmlFor={id}>
        {def.label}
        {def.required && <span className="ml-1 text-error-500">*</span>}
      </Label>
      {children}
      {def.help && <p className="mt-1 text-body-sm text-neutral-500">{def.help}</p>}
      <FieldError>{errors[path]}</FieldError>
    </div>
  );
}

// -------------------------------------------------------------- simple fields

function TextField({ def, value, onChange, path, errors }: FieldProps<string>) {
  const scope = useScope();
  const long = def.type === "textarea";
  return (
    <FieldShell def={def} path={path} errors={errors}>
      {long ? (
        <Textarea id={`${scope}f-${path}`} rows={4} value={value ?? ""} onChange={(e) => onChange(e.target.value)} aria-invalid={!!errors[path]} />
      ) : (
        <Input id={`${scope}f-${path}`} value={value ?? ""} onChange={(e) => onChange(e.target.value)} aria-invalid={!!errors[path]} />
      )}
    </FieldShell>
  );
}

/** Heading text where `**word**` is the single highlighted (accent-coloured) word. */
function HeadingField({ def, value, onChange, path, errors }: FieldProps<string>) {
  const scope = useScope();
  const raw = value ?? "";
  const highlighted = raw.match(/\*\*(.+?)\*\*/)?.[1];
  const words = raw.replace(/\*\*/g, "").split(/\s+/).filter(Boolean);
  const highlightedIndex = highlighted ? words.findIndex((w) => w === highlighted) : -1;

  function toggle(index: number) {
    const next = words.map((w, i) => (i === index && i !== highlightedIndex ? `**${w}**` : w));
    onChange(next.join(" "));
  }

  return (
    <FieldShell def={def} path={path} errors={errors}>
      <Input id={`${scope}f-${path}`} value={raw} onChange={(e) => onChange(e.target.value)} aria-invalid={!!errors[path]} />
      {words.length > 0 && (
        <div className="mt-2" role="group" aria-label="Highlight one word in the accent colour">
          <p className="text-body-sm text-neutral-500">Click a word to highlight it (click again to remove):</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {words.map((word, i) => (
              <button
                key={`${word}-${i}`}
                type="button"
                aria-pressed={i === highlightedIndex}
                onClick={() => toggle(i)}
                className={
                  i === highlightedIndex
                    ? "rounded-full border border-accent-500 bg-accent-500 px-3 py-1 text-body-sm font-bold text-on-accent"
                    : "rounded-full border border-neutral-300 px-3 py-1 text-body-sm text-heading transition-colors hover:border-accent-500"
                }
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      )}
    </FieldShell>
  );
}

function RichTextField({ def, value, onChange, path, errors }: FieldProps<string>) {
  return (
    <FieldShell def={def} path={path} errors={errors}>
      <RichTextEditor value={value ?? ""} onChange={onChange} />
    </FieldShell>
  );
}

function NumberField({ def, value, onChange, path, errors }: FieldProps<number>) {
  const scope = useScope();
  return (
    <FieldShell def={def} path={path} errors={errors}>
      <Input
        id={`${scope}f-${path}`}
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={def.type === "number" ? def.min : undefined}
        max={def.type === "number" ? def.max : undefined}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </FieldShell>
  );
}

function ToggleField({ def, value, onChange, path, errors }: FieldProps<boolean>) {
  const scope = useScope();
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
      <div>
        <Label htmlFor={`${scope}f-${path}`} className="mb-0">
          {def.label}
        </Label>
        {def.help && <p className="mt-0.5 text-body-sm text-neutral-500">{def.help}</p>}
        <FieldError>{errors[path]}</FieldError>
      </div>
      <Switch id={`${scope}f-${path}`} checked={!!value} onCheckedChange={onChange} />
    </div>
  );
}

function SelectField({ def, value, onChange, path, errors }: FieldProps<string>) {
  const scope = useScope();
  if (def.type !== "select") return null;
  return (
    <FieldShell def={def} path={path} errors={errors}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={`${scope}f-${path}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {def.options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

function ColorField({ def, value, onChange, path, errors }: FieldProps<string>) {
  const swatch: Record<string, string> = { accent: "var(--accent)", surface: "#151517", "surface-2": "#1c1c1f", light: "#f2f2ee" };
  return (
    <FieldShell def={def} path={path} errors={errors}>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={def.label}>
        {PALETTE_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            onClick={() => onChange(c)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-body-sm ${value === c ? "border-heading ring-2 ring-heading/20" : "border-neutral-200"}`}
          >
            <span className="size-4 rounded-full border border-neutral-300" style={{ backgroundColor: swatch[c] }} />
            {c}
          </button>
        ))}
      </div>
    </FieldShell>
  );
}

function IconField({ def, value, onChange, path, errors }: FieldProps<string>) {
  return (
    <FieldShell def={def} path={path} errors={errors}>
      <IconPicker value={value || null} onValueChange={(name) => onChange(name ?? "")} />
    </FieldShell>
  );
}

function ButtonField({ def, value, onChange, path, errors }: FieldProps<ButtonValue>) {
  const scope = useScope();
  const v = value ?? { label: "", href: "", style: "primary" as const, newTab: false };
  const set = (patch: Partial<ButtonValue>) => onChange({ ...v, ...patch });
  return (
    <fieldset className="rounded-xl border border-neutral-200 p-4">
      <legend className="px-1 text-body-sm font-medium text-heading">{def.label}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${scope}f-${path}-label`}>Label</Label>
          <Input id={`${scope}f-${path}-label`} value={v.label} onChange={(e) => set({ label: e.target.value })} />
          <FieldError>{errors[`${path}.label`]}</FieldError>
        </div>
        <div>
          <Label htmlFor={`${scope}f-${path}-href`}>Link</Label>
          <Input id={`${scope}f-${path}-href`} value={v.href} placeholder="/contact or https://…" onChange={(e) => set({ href: e.target.value })} />
          <FieldError>{errors[`${path}.href`]}</FieldError>
        </div>
        <div>
          <Label htmlFor={`${scope}f-${path}-style`}>Style</Label>
          <Select value={v.style} onValueChange={(s) => set({ style: s as ButtonValue["style"] })}>
            <SelectTrigger id={`${scope}f-${path}-style`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUTTON_STYLES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-3 pb-2">
          <Switch id={`${scope}f-${path}-tab`} checked={v.newTab} onCheckedChange={(c) => set({ newTab: c })} />
          <Label htmlFor={`${scope}f-${path}-tab`} className="mb-0">
            Open in new tab
          </Label>
        </div>
      </div>
      <FieldError>{errors[path]}</FieldError>
    </fieldset>
  );
}

// -------------------------------------------------------------------- image

function ImageField({ def, value, onChange, path, errors }: FieldProps<ImageValue | null>) {
  const scope = useScope();
  const [uploading, setUploading] = React.useState(false);
  const [libraryOpen, setLibraryOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const media = await uploadImageToCloudinary(file, "agency-website/pages");
      onChange({ url: media.url, alt: value?.alt ?? "", mediaId: media.id, width: media.width, height: media.height, focalX: null, focalY: null });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function setFocal(e: React.MouseEvent<HTMLDivElement>) {
    if (!value) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const focalX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const focalY = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    onChange({ ...value, focalX: Number(focalX.toFixed(3)), focalY: Number(focalY.toFixed(3)) });
    if (value.mediaId) void request(`/media/${value.mediaId}`, { method: "PATCH", body: JSON.stringify({ focalX, focalY }) }).catch(() => undefined);
  }

  const missingAlt = !!value?.url && !value.alt?.trim();

  return (
    <FieldShell def={def} path={path} errors={errors}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div
          className="relative flex h-32 w-full shrink-0 cursor-crosshair items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 sm:w-48"
          onClick={setFocal}
          title={value?.url ? "Click to set the focal point" : undefined}
        >
          {value?.url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL */}
              <img src={value.url} alt="" className="size-full object-cover" style={{ objectPosition: `${(value.focalX ?? 0.5) * 100}% ${(value.focalY ?? 0.5) * 100}%` }} />
              <span
                aria-hidden
                className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ring-1 ring-black/40"
                style={{ left: `${(value.focalX ?? 0.5) * 100}%`, top: `${(value.focalY ?? 0.5) * 100}%` }}
              />
            </>
          ) : (
            <ImageIcon className="size-7 text-neutral-300" />
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="size-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {value?.url ? "Replace" : "Upload"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setLibraryOpen(true)}>
              Media library
            </Button>
            {value?.url && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                Remove
              </Button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml"
              className="sr-only"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          {value?.url && (
            <div>
              <Label htmlFor={`${scope}f-${path}-alt`}>Alt text</Label>
              <Input
                id={`${scope}f-${path}-alt`}
                value={value.alt ?? ""}
                onChange={(e) => onChange({ ...value, alt: e.target.value })}
                placeholder="Describe the image for screen readers"
              />
              {missingAlt && (
                <p className="mt-1 flex items-center gap-1.5 text-body-sm text-warning-700" role="status">
                  <AlertTriangle className="size-4" /> Alt text is missing — needed for accessibility and SEO.
                </p>
              )}
              <p className="mt-1 text-body-sm text-neutral-500">Click the preview to set the focal point used when the image is cropped.</p>
            </div>
          )}
        </div>
      </div>
      <MediaLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={(m) => {
          onChange({ url: m.url, alt: m.altText ?? value?.alt ?? "", mediaId: m.id, width: m.width, height: m.height, focalX: m.focalX, focalY: m.focalY });
          setLibraryOpen(false);
        }}
      />
    </FieldShell>
  );
}

// -------------------------------------------------------------------- video

function VideoField({ def, value, onChange, path, errors }: FieldProps<VideoValue | null>) {
  const scope = useScope();
  const v: VideoValue = value ?? { kind: "youtube", url: "" };
  return (
    <FieldShell def={def} path={path} errors={errors}>
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Select value={v.kind} onValueChange={(k) => onChange({ ...v, kind: k as VideoValue["kind"] })}>
          <SelectTrigger aria-label="Video type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VIDEO_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {k === "upload" ? "Direct file URL" : k === "youtube" ? "YouTube" : "Vimeo"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={`${scope}f-${path}`}
          value={v.url}
          placeholder={v.kind === "upload" ? "https://…/video.mp4" : v.kind === "youtube" ? "https://www.youtube.com/watch?v=…" : "https://vimeo.com/…"}
          onChange={(e) => onChange(e.target.value ? { ...v, url: e.target.value } : null)}
        />
      </div>
    </FieldShell>
  );
}

// ----------------------------------------------------------------- repeater

function itemSummary(item: Record<string, unknown>): string {
  for (const k of ["title", "label", "text", "question", "name", "value", "heading"]) {
    const v = item[k];
    if (typeof v === "string" && v.trim()) return v.replace(/\*\*/g, "").trim().slice(0, 40);
  }
  return "";
}

function SortableRow({
  id,
  children,
  onRemove,
  onMove,
  label,
  summary,
  index,
  count,
  open,
  collapsible,
  onToggle,
}: {
  id: string;
  children: React.ReactNode;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  label: string;
  summary: string;
  index: number;
  count: number;
  open: boolean;
  collapsible: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-xl border border-neutral-200 bg-background ${isDragging ? "z-10 shadow-soft-lg" : ""}`}
    >
      <div className={`flex items-center gap-1 px-2 py-1.5 ${open ? "border-b border-neutral-200" : ""}`}>
        <button type="button" className="cursor-grab rounded p-1 text-neutral-400 hover:text-heading" aria-label={`Drag ${label} ${index + 1}`} {...attributes} {...listeners}>
          <GripVertical className="size-4" />
        </button>
        {collapsible ? (
          <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left">
            {open ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
            <span className="shrink-0 text-body-sm font-medium text-heading">
              {label} {index + 1}
            </span>
            {summary && <span className="truncate text-body-sm text-neutral-500">— {summary}</span>}
          </button>
        ) : (
          <span className="flex-1 text-body-sm font-medium text-heading">
            {label} {index + 1}
          </span>
        )}
        <button type="button" className="rounded p-1 text-neutral-400 hover:text-heading disabled:opacity-30" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
          <ArrowUp className="size-4" />
        </button>
        <button type="button" className="rounded p-1 text-neutral-400 hover:text-heading disabled:opacity-30" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}>
          <ArrowDown className="size-4" />
        </button>
        <button type="button" className="rounded p-1 text-neutral-400 hover:text-error-500" aria-label={`Remove ${label} ${index + 1}`} onClick={onRemove}>
          <Trash2 className="size-4" />
        </button>
      </div>
      {open && <div className="grid gap-4 p-3">{children}</div>}
    </div>
  );
}

function RepeaterField({ def, value, onChange, path, errors }: FieldProps<Record<string, unknown>[]>) {
  const items = Array.isArray(value) ? value : [];
  const [openSet, setOpenSet] = React.useState<Set<number>>(new Set());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  if (def.type !== "repeater") return null;

  const ids = items.map((_, i) => `${path}-${i}`);
  const max = def.max ?? 24;
  // Items with a single field (e.g. a feature line) stay open; bigger ones fold up to one summary line.
  const collapsible = def.fields.length > 1;
  // A row with a validation error is always shown so the message can't hide.
  const hasError = (i: number) => Object.keys(errors).some((k) => k.startsWith(`${path}.${i}.`));
  const isOpen = (i: number) => !collapsible || openSet.has(i) || hasError(i);
  const toggle = (i: number) => setOpenSet((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    onChange(arrayMove(items, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
    setOpenSet(new Set());
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <Label className="mb-0">{def.label}</Label>
        <div className="flex items-center gap-2">
          {collapsible && items.length > 1 && (
            <button type="button" className="text-body-sm text-neutral-500 underline" onClick={() => setOpenSet(openSet.size === items.length ? new Set() : new Set(items.map((_, i) => i)))}>
              {openSet.size === items.length ? "Collapse all" : "Expand all"}
            </button>
          )}
          <Badge variant="neutral">{items.length}</Badge>
        </div>
      </div>
      {def.help && <p className="mb-2 text-body-sm text-neutral-500">{def.help}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((item, i) => (
              <SortableRow
                key={ids[i]}
                id={ids[i]!}
                label={def.itemLabel}
                summary={itemSummary(item)}
                index={i}
                count={items.length}
                open={isOpen(i)}
                collapsible={collapsible}
                onToggle={() => toggle(i)}
                onRemove={() => {
                  onChange(items.filter((_, j) => j !== i));
                  setOpenSet(new Set());
                }}
                onMove={(dir) => {
                  onChange(arrayMove(items, i, i + dir));
                  setOpenSet(new Set());
                }}
              >
                <FieldList fields={def.fields} content={item} onChange={(next) => onChange(items.map((it, j) => (j === i ? next : it)))} basePath={`${path}.${i}`} errors={errors} />
              </SortableRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        disabled={items.length >= max}
        onClick={() => {
          onChange([...items, defaultContent(def.fields)]);
          setOpenSet((s) => new Set([...s, items.length]));
        }}
      >
        <Plus /> Add {def.itemLabel.toLowerCase()}
      </Button>
      <FieldError>{errors[path]}</FieldError>
    </div>
  );
}

// --------------------------------------------------------- collection picker

const MANAGE_LINKS: Record<string, { href: string; label: string }> = {
  services: { href: "/services", label: "Content → Services" },
  projects: { href: "/portfolio", label: "Content → Portfolio" },
  testimonials: { href: "/testimonials", label: "Content → Testimonials" },
  faqs: { href: "/faqs", label: "Content → FAQs" },
  team: { href: "/team", label: "Content → Team" },
};

interface Option {
  id: string;
  title: string;
  hint?: string;
}

function CollectionField({ def, value, onChange, path, errors }: FieldProps<string[]>) {
  const [options, setOptions] = React.useState<Option[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  const selected = Array.isArray(value) ? value : [];

  React.useEffect(() => {
    if (def.type !== "collection") return;
    request<{ items: Option[] }>(`/home-layout/options/${def.collection}`)
      .then((r) => setOptions(r.items))
      .catch(() => setFailed(true));
  }, [def]);

  if (def.type !== "collection") return null;
  const byId = new Map((options ?? []).map((o) => [o.id, o]));
  const available = (options ?? []).filter((o) => !selected.includes(o.id));
  const max = def.max ?? 24;

  return (
    <FieldShell def={def} path={path} errors={errors}>
      <p className="mb-2 text-body-sm text-neutral-500">
        Choose which items appear and in what order. To add or edit the items themselves, go to{" "}
        <a href={MANAGE_LINKS[def.collection]?.href ?? "#"} target="_blank" rel="noopener noreferrer" className="font-medium text-heading underline">
          {MANAGE_LINKS[def.collection]?.label ?? def.collection}
        </a>
        .
      </p>
      {failed && <p className="text-body-sm text-error-500">Could not load the {def.collection} list.</p>}
      <ol className="space-y-1.5">
        {selected.map((id, i) => {
          const opt = byId.get(id);
          return (
            <li key={id} className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1.5">
              <span className="w-6 text-center text-body-sm text-neutral-400">{i + 1}</span>
              <span className={`flex-1 truncate text-body-sm ${opt ? "text-heading" : "text-neutral-400 italic"}`}>
                {opt ? opt.title : options ? "Item no longer exists" : "Loading…"}
              </span>
              {opt?.hint && opt.hint !== "PUBLISHED" && opt.hint !== "VISIBLE" && <Badge variant="neutral">{opt.hint.toLowerCase()}</Badge>}
              <button type="button" className="rounded p-1 text-neutral-400 hover:text-heading disabled:opacity-30" aria-label="Move up" disabled={i === 0} onClick={() => onChange(arrayMove(selected, i, i - 1))}>
                <ArrowUp className="size-4" />
              </button>
              <button type="button" className="rounded p-1 text-neutral-400 hover:text-heading disabled:opacity-30" aria-label="Move down" disabled={i === selected.length - 1} onClick={() => onChange(arrayMove(selected, i, i + 1))}>
                <ArrowDown className="size-4" />
              </button>
              <button type="button" className="rounded p-1 text-neutral-400 hover:text-error-500" aria-label="Remove" onClick={() => onChange(selected.filter((x) => x !== id))}>
                <X className="size-4" />
              </button>
            </li>
          );
        })}
      </ol>
      {selected.length === 0 && <p className="text-body-sm text-neutral-500">Nothing selected — this block will be hidden on the page.</p>}
      <div className="mt-2">
        <Select value="" onValueChange={(id) => id && selected.length < max && onChange([...selected, id])}>
          <SelectTrigger aria-label={`Add to ${def.label}`} disabled={available.length === 0 || selected.length >= max}>
            <SelectValue placeholder={available.length === 0 ? "No more items to add" : "Add an item…"} />
          </SelectTrigger>
          <SelectContent>
            {available.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.title}
                {o.hint && o.hint !== "PUBLISHED" && o.hint !== "VISIBLE" ? ` (${o.hint.toLowerCase()})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </FieldShell>
  );
}

// ------------------------------------------------------------------ renderer

export function FieldRenderer({ def, value, onChange, path, errors }: FieldProps) {
  const common = { def, path, errors };
  switch (def.type) {
    case "text":
    case "textarea":
    case "link":
      return <TextField {...common} value={value as string} onChange={onChange as (v: string) => void} />;
    case "heading":
      return <HeadingField {...common} value={value as string} onChange={onChange as (v: string) => void} />;
    case "richtext":
      return <RichTextField {...common} value={value as string} onChange={onChange as (v: string) => void} />;
    case "number":
      return <NumberField {...common} value={value as number} onChange={onChange as (v: number) => void} />;
    case "toggle":
      return <ToggleField {...common} value={value as boolean} onChange={onChange as (v: boolean) => void} />;
    case "select":
      return <SelectField {...common} value={value as string} onChange={onChange as (v: string) => void} />;
    case "color":
      return <ColorField {...common} value={value as string} onChange={onChange as (v: string) => void} />;
    case "icon":
      return <IconField {...common} value={value as string} onChange={onChange as (v: string) => void} />;
    case "button":
      return <ButtonField {...common} value={value as ButtonValue} onChange={onChange as (v: ButtonValue) => void} />;
    case "image":
      return <ImageField {...common} value={value as ImageValue | null} onChange={onChange as (v: ImageValue | null) => void} />;
    case "video":
      return <VideoField {...common} value={value as VideoValue | null} onChange={onChange as (v: VideoValue | null) => void} />;
    case "repeater":
      return <RepeaterField {...common} value={value as Record<string, unknown>[]} onChange={onChange as (v: Record<string, unknown>[]) => void} />;
    case "collection":
      return <CollectionField {...common} value={value as string[]} onChange={onChange as (v: string[]) => void} />;
  }
}

export function FieldList({
  fields,
  content,
  onChange,
  basePath,
  errors,
}: {
  fields: FieldDef[];
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  basePath: string;
  errors: FieldErrors;
}) {
  let lastGroup: string | undefined;
  return (
    <>
      {fields.map((def) => {
        // Conditional fields (e.g. a tile only asks for an image when its type is "Image").
        if (def.showIf && !def.showIf.equals.includes(String(content[def.showIf.key] ?? ""))) return null;
        const heading = def.group && def.group !== lastGroup ? def.group : null;
        if (def.group) lastGroup = def.group;
        return (
          <React.Fragment key={def.key}>
            {heading && <h4 className="-mb-1 mt-2 border-t border-neutral-200 pt-4 font-heading text-body font-semibold text-heading first:mt-0 first:border-t-0 first:pt-0">{heading}</h4>}
            <FieldRenderer
              def={def}
              value={content[def.key] ?? defaultFieldValue(def)}
              onChange={(v) => onChange({ ...content, [def.key]: v })}
              path={`${basePath}.${def.key}`}
              errors={errors}
            />
          </React.Fragment>
        );
      })}
    </>
  );
}
