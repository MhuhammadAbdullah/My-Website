import { cn } from "@agency/ui";
import { cloudinaryTransform } from "@/lib/cloudinary";
import { arr, img, str, type Content } from "./types";

// Full-bleed scrolling band. CSS-only seamless loop: the item list is rendered
// twice and the track translates by exactly -50%. Animation is removed for
// prefers-reduced-motion by the shared `.tech-marquee-track` rules.
export function MarqueeSection({ content }: { content: Content }) {
  const items = arr<{ text?: string; image?: unknown }>(content.items).filter((i) => str(i.text) || img(i.image));
  if (items.length === 0) return null;

  const speed = typeof content.speed === "number" && content.speed > 0 ? content.speed : 30;
  const pauseOnHover = content.pauseOnHover !== false;
  const accent = content.tone !== "dark";

  const renderSet = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((item, i) => {
        const image = img(item.image);
        return (
          <li key={i} className="flex shrink-0 items-center">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
              <img src={cloudinaryTransform(image.url, "f_auto,q_auto,h_240")} alt={hidden ? "" : image.alt} loading="lazy" className="h-16 w-auto max-w-[14rem] object-contain" />
            ) : (
              <span className="font-heading text-[clamp(0.95rem,0.8rem+0.45vw,1.25rem)] font-extrabold tracking-normal">{str(item.text)}</span>
            )}
            <span aria-hidden className="mx-6 text-body-sm">
              &#10022;
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section
      aria-label="Highlights"
      className={cn("overflow-hidden py-5", accent ? "bg-accent-500 text-on-accent" : "border-y border-neutral-200 bg-surface text-heading")}
    >
      <div
        className="tech-marquee-track flex w-max items-center"
        style={{ ["--tech-marquee-duration" as string]: `${speed}s`, ...(pauseOnHover ? {} : { animationPlayState: "running" }) }}
      >
        {renderSet(false)}
        {renderSet(true)}
      </div>
    </section>
  );
}
