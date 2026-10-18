import { cloudinaryTransform } from "@/lib/cloudinary";
import type { ImageValue } from "./types";

/**
 * Responsive CMS image: Cloudinary resizes + serves a modern format, alt text
 * comes from admin, the focal point drives cropping, and everything except
 * `priority` images is lazy-loaded.
 */
export function CmsImage({
  image,
  className,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
}: {
  image: ImageValue;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const widths = [480, 768, 1200, 1800];
  const srcSet = widths.map((w) => `${cloudinaryTransform(image.url, `f_auto,q_auto,c_limit,w_${w}`)} ${w}w`).join(", ");
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary does the resizing; next/image would double-process it
    <img
      src={cloudinaryTransform(image.url, "f_auto,q_auto,c_limit,w_1200")}
      srcSet={srcSet}
      sizes={sizes}
      alt={image.alt ?? ""}
      width={image.width ?? undefined}
      height={image.height ?? undefined}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      {...(priority ? { fetchPriority: "high" as const } : {})}
      className={className}
      style={{ objectPosition: `${(image.focalX ?? 0.5) * 100}% ${(image.focalY ?? 0.5) * 100}%` }}
    />
  );
}
