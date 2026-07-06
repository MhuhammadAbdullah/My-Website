// Inserts a Cloudinary transformation string into an existing delivery URL,
// e.g. cloudinaryTransform(url, "f_auto,q_auto,w_1600") turns
// `.../upload/v123/foo.jpg` into `.../upload/f_auto,q_auto,w_1600/v123/foo.jpg`.
// No-ops for any URL that isn't a Cloudinary delivery URL.
export function cloudinaryTransform(url: string, transform: string): string {
  const marker = "/upload/";
  const index = url.indexOf(marker);
  if (index === -1) return url;
  return `${url.slice(0, index + marker.length)}${transform}/${url.slice(index + marker.length)}`;
}

// Cloudinary auto-generates a jpg thumbnail for any uploaded video at the
// same public ID — used as a poster frame before the video player loads.
export function cloudinaryVideoPoster(videoUrl: string): string {
  return cloudinaryTransform(videoUrl, "so_0").replace(/\.[a-z0-9]+$/i, ".jpg");
}
