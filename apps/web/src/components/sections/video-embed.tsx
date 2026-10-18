import type { VideoValue } from "@agency/types";

// YouTube / Vimeo URL -> privacy-friendly embed URL; null if it isn't a link we recognise.
export function toEmbedUrl(video: VideoValue): string | null {
  try {
    const u = new URL(video.url);
    if (video.kind === "youtube") {
      const id = u.hostname.includes("youtu.be") ? u.pathname.slice(1) : (u.searchParams.get("v") ?? u.pathname.split("/").filter(Boolean).pop());
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&mute=1&loop=1&playlist=${encodeURIComponent(id)}&controls=0&playsinline=1` : null;
    }
    if (video.kind === "vimeo") {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${encodeURIComponent(id)}?background=1&autoplay=1&muted=1&loop=1` : null;
    }
  } catch {
    /* fall through */
  }
  return null;
}

// Direct file URL -> muted looping <video>; YouTube/Vimeo -> lazy iframe.
export function VideoEmbed({ video, title, className }: { video: VideoValue; title: string; className?: string }) {
  if (video.kind === "upload") {
    return <video src={video.url} className={className} autoPlay muted loop playsInline preload="metadata" aria-label={title} />;
  }
  const src = toEmbedUrl(video);
  if (!src) return null;
  return <iframe src={src} title={title} loading="lazy" allow="autoplay; fullscreen; picture-in-picture" className={className} />;
}
