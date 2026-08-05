"use client";

import * as React from "react";
import { FileVideo } from "lucide-react";
import { Button, Label, toast } from "@agency/ui";
import {
  uploadRawFileToCloudinary,
  uploadRawFileToCloudinaryWithProgress,
  type CloudinarySignature,
  type UploadedRawMedia,
} from "@/lib/influencer-api";

// Extracted from become-influencer-form.tsx so the dashboard's Portfolio
// manager can reuse the exact same upload UX instead of re-implementing it.
// Generalized to accept a `sign` callback instead of a hardcoded
// signApplicationMediaUpload(sessionId) call -- the registration form signs
// into a temporary application-session folder, the portfolio manager signs
// via the already-authenticated signProfileMediaUpload() (no session id).

export function ImageUploader({
  label,
  helpText,
  sign,
  accept,
  acceptedExtensions,
  maxSizeMB,
  value,
  onChange,
}: {
  label: string;
  helpText?: string;
  sign: () => Promise<CloudinarySignature>;
  accept: string;
  acceptedExtensions: string[];
  maxSizeMB: number;
  value: { url: string } | null | undefined;
  onChange: (media: UploadedRawMedia | null) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!acceptedExtensions.includes(ext)) {
      toast.error(`Unsupported file type. Allowed: ${acceptedExtensions.join(", ").toUpperCase()}`);
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }
    setUploading(true);
    try {
      const signed = await sign();
      const media = await uploadRawFileToCloudinary(file, signed);
      onChange(media);
      toast.success("Uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {value ? (
        <div className="mt-2 flex items-center gap-4">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail of a freshly-uploaded, not-yet-optimizable Cloudinary asset */}
            <img src={value.url} alt="" className="size-full object-cover" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
              {uploading ? "Uploading…" : "Replace"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="mt-1.5" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? "Uploading…" : "Upload image"}
        </Button>
      )}
      {helpText && <p className="mt-1.5 text-body-sm text-neutral-500">{helpText}</p>}
    </div>
  );
}

const VIDEO_ACCEPT_EXTENSIONS = ["mp4", "mov", "webm"];
const VIDEO_MAX_SIZE_MB = 100;

export function VideoUploader({
  sign,
  value,
  onChange,
}: {
  sign: () => Promise<CloudinarySignature>;
  value: { url: string } | null | undefined;
  onChange: (media: UploadedRawMedia | null) => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!VIDEO_ACCEPT_EXTENSIONS.includes(ext)) {
      toast.error(`Unsupported file type. Allowed: ${VIDEO_ACCEPT_EXTENSIONS.join(", ").toUpperCase()}`);
      return;
    }
    if (file.size > VIDEO_MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File is too large. Maximum size is ${VIDEO_MAX_SIZE_MB}MB.`);
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const signed = await sign();
      const media = await uploadRawFileToCloudinaryWithProgress(file, signed, setProgress);
      onChange(media);
      toast.success("Video uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {uploading ? (
        <div className="mt-2 space-y-2 rounded-xl border border-neutral-200 p-4">
          <p className="text-body-sm text-neutral-600">Uploading… {progress}%</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-accent-500 transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : value ? (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-4">
          <div className="flex min-w-0 items-center gap-2">
            <FileVideo className="size-5 shrink-0 text-neutral-400" />
            <span className="truncate text-body-sm text-heading">{value.url.split("/").pop()}</span>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="mt-1.5" onClick={() => inputRef.current?.click()}>
          Upload video
        </Button>
      )}
      <p className="mt-1.5 text-body-sm text-neutral-500">MP4, MOV, or WEBM — up to 100MB.</p>
    </div>
  );
}
