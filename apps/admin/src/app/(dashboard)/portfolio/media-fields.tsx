"use client";

import * as React from "react";
import { GripVertical, ImagePlus, Loader2, RefreshCw, Trash2, Video } from "lucide-react";
import { Button, Label, toast } from "@agency/ui";
import { request } from "@/lib/api";

export interface GalleryImageItem {
  key: string;
  url: string;
  publicId: string;
  width: number | null;
  height: number | null;
  caption: string;
  status: "uploading" | "ready";
}

export interface VideoItem {
  url: string;
  publicId: string;
  status: "uploading" | "ready";
}

interface UploadedAsset {
  url: string;
  publicId: string;
  width: number | null;
  height: number | null;
}

async function uploadToCloudinary(file: File): Promise<UploadedAsset> {
  const signed = await request<{
    timestamp: number;
    signature: string;
    apiKey: string;
    cloudName: string;
    folder: string;
  }>("/projects/media/sign", { method: "POST", body: JSON.stringify({}) });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signed.apiKey);
  formData.append("timestamp", String(signed.timestamp));
  formData.append("signature", signed.signature);
  formData.append("folder", signed.folder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });
  if (!uploadRes.ok) {
    const body = await uploadRes.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Upload to Cloudinary failed");
  }
  const uploaded = await uploadRes.json();
  return {
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    width: uploaded.width ?? null,
    height: uploaded.height ?? null,
  };
}

export function GalleryField({
  images,
  setImages,
}: {
  images: GalleryImageItem[];
  setImages: React.Dispatch<React.SetStateAction<GalleryImageItem[]>>;
}) {
  const addInputRef = React.useRef<HTMLInputElement>(null);
  const replaceInputRef = React.useRef<HTMLInputElement>(null);
  const replaceKeyRef = React.useRef<string | null>(null);
  const dragIndexRef = React.useRef<number | null>(null);

  async function handleAddFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const placeholders: GalleryImageItem[] = files.map((file) => ({
      key: crypto.randomUUID(),
      url: URL.createObjectURL(file),
      publicId: "",
      width: null,
      height: null,
      caption: file.name.replace(/\.[^.]+$/, ""),
      status: "uploading",
    }));
    setImages((prev) => [...prev, ...placeholders]);

    await Promise.all(
      files.map(async (file, i) => {
        const placeholder = placeholders[i]!;
        try {
          const uploaded = await uploadToCloudinary(file);
          setImages((prev) =>
            prev.map((img) => (img.key === placeholder.key ? { ...img, ...uploaded, status: "ready" } : img)),
          );
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Image upload failed");
          setImages((prev) => prev.filter((img) => img.key !== placeholder.key));
        }
      }),
    );
  }

  function triggerReplace(key: string) {
    replaceKeyRef.current = key;
    replaceInputRef.current?.click();
  }

  async function handleReplaceFile(file: File | undefined) {
    const key = replaceKeyRef.current;
    replaceKeyRef.current = null;
    if (!file || !key) return;

    let previous: GalleryImageItem | undefined;
    setImages((prev) => {
      previous = prev.find((img) => img.key === key);
      return prev.map((img) => (img.key === key ? { ...img, url: URL.createObjectURL(file), status: "uploading" } : img));
    });

    try {
      const uploaded = await uploadToCloudinary(file);
      setImages((prev) => prev.map((img) => (img.key === key ? { ...img, ...uploaded, status: "ready" } : img)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Replace failed");
      setImages((prev) => prev.map((img) => (img.key === key && previous ? previous! : img)));
    }
  }

  function handleDrop(dropIndex: number) {
    const fromIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (fromIndex === null || fromIndex === dropIndex) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(dropIndex, 0, moved);
      return next;
    });
  }

  return (
    <div>
      <Label>Project images</Label>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((img, index) => (
          <div
            key={img.key}
            draggable={img.status === "ready"}
            onDragStart={() => {
              dragIndexRef.current = index;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary/blob preview URLs, not a static asset */}
            <img src={img.url} alt={img.caption} className="size-full object-cover" />

            {img.status === "uploading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="size-5 animate-spin text-white" />
              </div>
            )}

            {img.status === "ready" && (
              <>
                <div className="absolute left-1.5 top-1.5 flex size-6 cursor-grab items-center justify-center rounded-md bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <GripVertical className="size-3.5" />
                </div>
                <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => triggerReplace(img.key)}
                    className="flex size-6 items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70"
                    aria-label="Replace image"
                  >
                    <RefreshCw className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((i) => i.key !== img.key))}
                    className="flex size-6 items-center justify-center rounded-md bg-black/50 text-white hover:bg-black/70"
                    aria-label="Remove image"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                  {index + 1}
                </span>
              </>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => addInputRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-neutral-300 text-neutral-400 transition-colors hover:border-accent-500 hover:text-accent-500"
        >
          <ImagePlus className="size-6" />
          <span className="text-body-sm">Add</span>
        </button>
      </div>
      <p className="mt-2 text-body-sm text-neutral-400">Drag a thumbnail to reorder. First image is the cover.</p>

      <input
        ref={addInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          handleAddFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          handleReplaceFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function VideoField({
  video,
  setVideo,
}: {
  video: VideoItem | null;
  setVideo: React.Dispatch<React.SetStateAction<VideoItem | null>>;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setVideo({ url: URL.createObjectURL(file), publicId: "", status: "uploading" });
    try {
      const uploaded = await uploadToCloudinary(file);
      setVideo({ url: uploaded.url, publicId: uploaded.publicId, status: "ready" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Video upload failed");
      setVideo(null);
    }
  }

  return (
    <div>
      <Label>Project video (optional)</Label>
      {video ? (
        <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- admin preview, not end-user content */}
          <video src={video.url} controls className="aspect-video w-full" />
          {video.status === "uploading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="size-6 animate-spin text-white" />
            </div>
          )}
          {video.status === "ready" && (
            <div className="absolute right-2 top-2 flex gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
                <RefreshCw className="size-3.5" /> Replace
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setVideo(null)}>
                <Trash2 className="size-3.5" /> Remove
              </Button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-neutral-300 text-neutral-400 transition-colors hover:border-accent-500 hover:text-accent-500"
        >
          <Video className="size-6" />
          <span className="text-body-sm">Upload video</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
