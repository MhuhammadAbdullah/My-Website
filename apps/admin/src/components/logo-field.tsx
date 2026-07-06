"use client";

import * as React from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { Button, Label, toast } from "@agency/ui";
import { uploadImageToCloudinary, deleteMedia } from "@/lib/cloudinary-upload";

const ACCEPTED_TYPES = ["image/png", "image/svg+xml", "image/jpeg", "image/webp"];

export interface LogoValue {
  mediaId: string | null;
  url: string | null;
}

// Reusable single-image field for brand assets (currently just the main
// logo, but the same shape works for a future favicon / dark-mode logo /
// email logo without any rework).
export function LogoField({
  label,
  value,
  folder = "agency-website",
  onChange,
}: {
  label: string;
  value: LogoValue;
  folder?: string;
  onChange: (next: LogoValue) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Unsupported file type. Please upload a PNG, SVG, JPG, or WebP image.");
      return;
    }
    const previousMediaId = value.mediaId;
    setUploading(true);
    try {
      const media = await uploadImageToCloudinary(file, folder);
      onChange({ mediaId: media.id, url: media.url });
      if (previousMediaId) deleteMedia(previousMediaId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    const previousMediaId = value.mediaId;
    onChange({ mediaId: null, url: null });
    if (previousMediaId) deleteMedia(previousMediaId);
  }

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
          {value.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, not a static asset
            <img src={value.url} alt="" className="size-full object-contain p-2" />
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
            {value.url ? "Replace" : "Upload"}
          </Button>
          {value.url && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={uploading}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <p className="mt-1.5 text-body-sm text-neutral-500">PNG, SVG, JPG, or WebP.</p>
      <input
        ref={inputRef}
        type="file"
        accept=".png,.svg,.jpg,.jpeg,.webp"
        hidden
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
