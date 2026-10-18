import { request } from "@/lib/api";

export interface UploadedMedia {
  id: string;
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
  format?: string | null;
  bytes?: number | null;
}

// Signs a direct-to-Cloudinary upload via the generic /media/sign endpoint,
// uploads the file, then registers the asset in the Media table so it has an
// id other resources (e.g. a testimonial's avatarId) can reference.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/svg+xml"];
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadImageToCloudinary(file: File, folder = "agency-website"): Promise<UploadedMedia> {
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Unsupported file type. Use JPG, PNG, WebP, AVIF, GIF or SVG.");
  if (file.size > MAX_BYTES) throw new Error("File is larger than 10 MB.");

  const signed = await request<{
    timestamp: number;
    signature: string;
    apiKey: string;
    cloudName: string;
    folder: string;
    allowedFormats?: string;
  }>("/media/sign", { method: "POST", body: JSON.stringify({ folder }) });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signed.apiKey);
  formData.append("timestamp", String(signed.timestamp));
  formData.append("signature", signed.signature);
  formData.append("folder", signed.folder);
  if (signed.allowedFormats) formData.append("allowed_formats", signed.allowedFormats);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });
  if (!uploadRes.ok) {
    const body = await uploadRes.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Upload to Cloudinary failed");
  }
  const uploaded = await uploadRes.json();

  const media = await request<{ item: UploadedMedia }>("/media", {
    method: "POST",
    body: JSON.stringify({
      publicId: uploaded.public_id,
      url: uploaded.secure_url,
      width: uploaded.width ?? null,
      height: uploaded.height ?? null,
      format: uploaded.format,
      bytes: uploaded.bytes,
      altText: file.name,
    }),
  }).then((r) => r.item);

  return media;
}

// Best-effort cleanup for a superseded/removed asset -- called by image
// fields on Replace/Remove so old Cloudinary files and Media rows don't pile
// up as orphans. Failures are swallowed since the user's primary action
// (replacing/removing the image in the form) has already succeeded.
export async function deleteMedia(id: string): Promise<void> {
  await request(`/media/${id}`, { method: "DELETE" }).catch(() => {});
}
