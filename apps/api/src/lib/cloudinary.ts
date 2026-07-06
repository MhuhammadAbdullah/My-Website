import { v2 as cloudinary } from "cloudinary";
import { env } from "../env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

// The client never uploads to Cloudinary without a server-issued signature —
// this is what makes the direct-to-cloud upload trustworthy.
export function signCloudinaryUpload(folder: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  return {
    timestamp,
    folder,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  };
}

// Best-effort cleanup — a failed delete on Cloudinary's side should never
// fail the API request that triggered it (the DB row is the source of truth).
export async function destroyCloudinaryAsset(publicId: string, resourceType: "image" | "video" = "image") {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType }).catch((error) => {
    console.error(`Failed to destroy Cloudinary asset ${publicId} (${resourceType}):`, error);
  });
}
