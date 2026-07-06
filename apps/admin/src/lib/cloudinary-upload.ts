import { request } from "@/lib/api";

export interface UploadedMedia {
  id: string;
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
}

// Signs a direct-to-Cloudinary upload via the generic /media/sign endpoint,
// uploads the file, then registers the asset in the Media table so it has an
// id other resources (e.g. a testimonial's avatarId) can reference.
export async function uploadImageToCloudinary(file: File, folder = "agency-website"): Promise<UploadedMedia> {
  const signed = await request<{
    timestamp: number;
    signature: string;
    apiKey: string;
    cloudName: string;
    folder: string;
  }>("/media/sign", { method: "POST", body: JSON.stringify({ folder }) });

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
