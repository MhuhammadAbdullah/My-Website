import { cloudinaryVideoPoster } from "@/lib/cloudinary";

export function ProjectVideo({ url }: { url: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-black">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- project showcase footage, no dialogue/captions to provide */}
      <video
        src={url}
        poster={cloudinaryVideoPoster(url)}
        controls
        playsInline
        preload="none"
        className="aspect-video w-full"
      />
    </div>
  );
}
