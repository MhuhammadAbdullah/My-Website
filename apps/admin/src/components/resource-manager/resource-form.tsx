"use client";

import * as React from "react";
import { Check, ImageIcon, Loader2, Search, X } from "lucide-react";
import {
  Input,
  Textarea,
  Label,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Combobox,
  IconPicker,
  Badge,
  Button,
  cn,
  toast,
} from "@agency/ui";
import { uploadImageToCloudinary, deleteMedia } from "@/lib/cloudinary-upload";
import type { FieldConfig } from "./types";

export type FormValues = Record<string, unknown>;

export function ResourceForm({
  fields,
  values,
  onChange,
}: {
  fields: FieldConfig[];
  values: FormValues;
  onChange: (values: FormValues) => void;
}) {
  function setField(key: string, value: unknown) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map((field) => {
        const value = values[field.key];

        if (field.type === "checkbox") {
          return (
            <div key={field.key} className="flex items-center gap-2.5 sm:col-span-2">
              <Checkbox checked={Boolean(value)} onCheckedChange={(checked) => setField(field.key, checked === true)} />
              <Label className="mb-0">{field.label}</Label>
            </div>
          );
        }

        if (field.type === "textarea") {
          return (
            <div key={field.key} className="sm:col-span-2">
              <Label>{field.label}</Label>
              <Textarea value={(value as string) ?? ""} onChange={(e) => setField(field.key, e.target.value)} />
            </div>
          );
        }

        if (field.type === "icon") {
          return (
            <div key={field.key}>
              <Label>{field.label}</Label>
              <IconPicker value={(value as string) ?? null} onValueChange={(v) => setField(field.key, v ?? "")} />
            </div>
          );
        }

        if (field.type === "select") {
          return (
            <div key={field.key}>
              <Label>{field.label}</Label>
              <Select value={(value as string) ?? undefined} onValueChange={(v) => setField(field.key, v)}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        if (field.type === "combobox") {
          return (
            <div key={field.key}>
              <Label>{field.label}</Label>
              <Combobox
                value={(value as string) ?? ""}
                onValueChange={(v) => setField(field.key, v)}
                placeholder={`Select ${field.label.toLowerCase()}`}
                searchPlaceholder={`Search ${field.label.toLowerCase()}…`}
                options={field.options}
              />
            </div>
          );
        }

        if (field.type === "multiselect") {
          const selected = new Set((value as string[]) ?? []);
          return (
            <div key={field.key} className="sm:col-span-2">
              <Label>{field.label}</Label>
              <div className="flex flex-wrap gap-2">
                {field.options.map((option) => {
                  const active = selected.has(option.value);
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => {
                        const next = new Set(selected);
                        if (active) next.delete(option.value);
                        else next.add(option.value);
                        setField(field.key, Array.from(next));
                      }}
                    >
                      <Badge variant={active ? "accent" : "neutral"}>{option.label}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }

        if (field.type === "multiselect-search") {
          return (
            <div key={field.key} className="sm:col-span-2">
              <MultiSelectSearchField
                label={field.label}
                options={field.options}
                placeholder={field.placeholder}
                value={(value as string[]) ?? []}
                onChange={(next) => setField(field.key, next)}
              />
            </div>
          );
        }

        if (field.type === "tags") {
          return (
            <div key={field.key} className="sm:col-span-2">
              <TagsField
                label={field.label}
                placeholder={field.placeholder}
                value={(value as string[]) ?? []}
                onChange={(tags) => setField(field.key, tags)}
              />
            </div>
          );
        }

        if (field.type === "image") {
          const previewKey = field.previewUrlKey ?? `${field.key}Url`;
          return (
            <div key={field.key} className="sm:col-span-2">
              <ImageField
                label={field.label}
                previewId={(value as string) ?? null}
                previewUrl={(values[previewKey] as string) ?? null}
                onChange={(next) => onChange({ ...values, [field.key]: next.id, [previewKey]: next.url })}
              />
            </div>
          );
        }

        return (
          <div key={field.key}>
            <Label>{field.label}</Label>
            <Input
              type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
              value={(value as string) ?? ""}
              onChange={(e) => setField(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

function ImageField({
  label,
  previewId,
  previewUrl,
  onChange,
}: {
  label: string;
  previewId: string | null;
  previewUrl: string | null;
  onChange: (next: { id: string | null; url: string | null }) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Unsupported file type. Please upload a PNG, JPG, WebP, or SVG image.");
      return;
    }
    const previousId = previewId;
    setUploading(true);
    try {
      const media = await uploadImageToCloudinary(file);
      onChange({ id: media.id, url: media.url });
      if (previousId) deleteMedia(previousId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    onChange({ id: null, url: null });
    if (previewId) deleteMedia(previewId);
  }

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-100">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, not a static asset
            <img src={previewUrl} alt="" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-6 text-neutral-300" />
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="size-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {previewUrl ? "Replace" : "Upload"}
          </Button>
          {previewUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={uploading}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.svg"
        hidden
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function MultiSelectSearchField({
  label,
  options,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = React.useState("");
  const selected = new Set(value);
  const selectedOptions = options.filter((o) => selected.has(o.value));
  const filtered = query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  function toggle(optionValue: string) {
    const next = new Set(selected);
    if (next.has(optionValue)) next.delete(optionValue);
    else next.add(optionValue);
    onChange(Array.from(next));
  }

  return (
    <div>
      <Label>{label}</Label>

      {selectedOptions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedOptions.map((o) => (
            <span
              key={o.value}
              className="flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1 text-body-sm text-accent-700"
            >
              {o.label}
              <button type="button" onClick={() => toggle(o.value)} aria-label={`Remove ${o.label}`}>
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? `Search ${label.toLowerCase()}…`}
          className="pl-10"
        />
      </div>

      <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-neutral-200 p-1.5">
        {filtered.length === 0 && <p className="p-2 text-body-sm text-neutral-400">No matches.</p>}
        {filtered.map((o) => {
          const active = selected.has(o.value);
          return (
            <button
              type="button"
              key={o.value}
              onClick={() => toggle(o.value)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-body-sm transition-colors hover:bg-neutral-50",
                active && "bg-accent-50 text-accent-700 hover:bg-accent-50",
              )}
            >
              {o.label}
              {active && <Check className="size-4" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TagsField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = React.useState("");

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 rounded-xl border border-neutral-200 p-2">
        {value.map((tag, i) => (
          <span key={i} className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-body-sm">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
              <X className="size-3.5 text-neutral-400" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              onChange([...value, draft.trim()]);
              setDraft("");
            }
          }}
          placeholder={placeholder ?? "Type and press Enter…"}
          className="min-w-[8rem] flex-1 border-none px-1 py-1 text-body-sm outline-none"
        />
      </div>
    </div>
  );
}
