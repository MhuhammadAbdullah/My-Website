import { v2 as cloudinary } from "cloudinary";
import { env } from "../env.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

// The client never uploads to Cloudinary without a server-issued signature —
// this is what makes the direct-to-cloud upload trustworthy. `authenticated:
// true` signs an upload with Cloudinary's "authenticated" delivery type
// instead of the default public "upload" type -- used for identity
// documents (CNIC/passport scans), which must never be reachable by a
// guessable public URL. See signPrivateMediaUrl below for how those get
// viewed afterwards.
export function signCloudinaryUpload(folder: string, options: { authenticated?: boolean } = {}) {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = { timestamp, folder };
  if (options.authenticated) paramsToSign.type = "authenticated";
  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  return {
    timestamp,
    folder,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    ...(options.authenticated ? { type: "authenticated" as const } : {}),
  };
}

// Best-effort cleanup — a failed delete on Cloudinary's side should never
// fail the API request that triggered it (the DB row is the source of truth).
export async function destroyCloudinaryAsset(
  publicId: string,
  resourceType: "image" | "video" = "image",
  deliveryType: "upload" | "authenticated" = "upload",
) {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: deliveryType }).catch((error) => {
    console.error(`Failed to destroy Cloudinary asset ${publicId} (${resourceType}):`, error);
  });
}

// Generates a fresh signed viewing URL for a private ("authenticated"
// delivery type) asset. Deliberately never cached or stored -- always
// computed per request, right before handing it to an already-permission-
// checked admin caller, so nothing durable (a DB row, a log line) ever
// holds a working link to someone's identity document.
export function signPrivateMediaUrl(publicId: string, resourceType: "image" | "video" | "raw" = "image") {
  return cloudinary.url(publicId, {
    type: "authenticated",
    sign_url: true,
    resource_type: resourceType,
    secure: true,
  });
}
