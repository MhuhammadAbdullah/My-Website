import Link from "next/link";
import { Container, Heading, Reveal, cn } from "@agency/ui";
import type { VideoValue } from "@agency/types";
import { CmsButton } from "./cms-button";
import { CmsImage } from "./cms-image";
import { VideoEmbed } from "./video-embed";
import { arr, img, str, type ButtonValue, type Content, type ImageValue } from "./types";

interface Tile {
  kind?: string;
  size?: string;
  tone?: string;
  title?: string;
  value?: string;
  image?: unknown;
  video?: unknown;
  link?: string;
  project?: { id: string; title: string; slug: string; category?: string | null; image?: ImageValue | null }[];
}

const SIZE_CLASS: Record<string, string> = {
  small: "col-span-1 min-h-[9rem]",
  wide: "col-span-2 min-h-[18rem] lg:min-h-[22rem]",
  tall: "col-span-1 row-span-2 min-h-[18rem]",
};

function TileBody({ tile }: { tile: Tile }) {
  const kind = tile.kind ?? "image";
  const caption = str(tile.title);

  if (kind === "stat") {
    const value = str(tile.value);
    if (!value) return null;
    const accent = tile.tone === "accent";
    return (
      <div className={cn("flex h-full flex-col justify-between p-5 sm:p-6", accent ? "bg-accent-500 text-on-accent" : "bg-surface")}>
        <p className={cn("text-body-sm font-semibold", accent ? "text-on-accent" : "text-neutral-500")}>{caption}</p>
        <p className={cn("font-heading text-[clamp(2rem,0.8rem+2.8vw,3.25rem)] font-extrabold leading-none tracking-[0.02em]", accent ? "text-on-accent" : "text-heading")}>{value}</p>
      </div>
    );
  }

  if (kind === "video") {
    const video = tile.video as VideoValue | null | undefined;
    if (!video?.url) return null;
    return (
      <div className="relative h-full">
        <VideoEmbed video={video} title={caption || "Video"} className="absolute inset-0 size-full object-cover" />
        {caption && <span className="pointer-events-none absolute bottom-4 left-4 rounded-full bg-[#0b0b0c]/80 px-3 py-1 text-label font-extrabold uppercase tracking-wider text-[color:var(--accent)]">{caption}</span>}
      </div>
    );
  }

  const project = kind === "project" ? tile.project?.[0] : undefined;
  const image = project?.image ?? img(tile.image);
  if (!image) return null;
  const label = project ? [project.category, project.title].filter(Boolean).join(" · ") : caption;
  return (
    <div className="relative h-full">
      <CmsImage image={image} className="absolute inset-0 size-full object-cover" sizes="(min-width: 1024px) 40vw, 100vw" />
      {label && <span className="absolute bottom-4 left-4 rounded-full bg-[#0b0b0c]/80 px-3 py-1 text-label font-extrabold uppercase tracking-wider text-[color:var(--accent)] backdrop-blur">{label}</span>}
    </div>
  );
}

export function HeroSection({ content, priority }: { content: Content; priority?: boolean }) {
  const eyebrow = str(content.eyebrow);
  const heading = str(content.heading);
  const body = str(content.body);
  const primary = content.primaryButton as ButtonValue | undefined;
  const secondary = content.secondaryButton as ButtonValue | undefined;
  const stats = arr<{ value?: string; label?: string }>(content.stats).filter((s) => str(s.value) && str(s.label));
  const hasButtons = !!(primary?.label && primary.href) || !!(secondary?.label && secondary.href);

  // A tile with nothing to show is dropped (never an empty box).
  const tiles = arr<Tile>(content.tiles).filter((t) => {
    if ((t.kind ?? "image") === "stat") return !!str(t.value);
    if (t.kind === "video") return !!(t.video as VideoValue | null)?.url;
    if (t.kind === "project") return !!t.project?.[0]?.image;
    return !!img(t.image);
  });

  if (!heading && !body && tiles.length === 0) return null;

  return (
    <section className="flex min-h-[calc(100svh-8rem)] items-center pb-12 pt-2">
      <Container className="w-full">
        <div className={tiles.length ? "grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12" : ""}>
          <div>
            {eyebrow && (
              <Reveal>
                <p className="eyebrow inline-flex items-center gap-2">
                  <span aria-hidden className="size-2 rounded-full bg-accent-500" />
                  {eyebrow}
                </p>
              </Reveal>
            )}
            {heading && (
              <Reveal delay={0.05}>
                <Heading
                  level={1}
                  className={cn("mt-6", !tiles.length && "text-[clamp(2.25rem,1rem+4vw,5rem)]")}
                  style={tiles.length ? { fontSize: "clamp(2rem, 0.8rem + 2.6vw, 3.75rem)" } : undefined}
                >
                  {heading}
                </Heading>
              </Reveal>
            )}
            {body && (
              <Reveal delay={0.1}>
                <p className="mt-6 max-w-xl text-body-lg text-neutral-500">{body}</p>
              </Reveal>
            )}
            {hasButtons && (
              <Reveal delay={0.15} className="mt-8 flex flex-wrap gap-3">
                <CmsButton button={primary} />
                <CmsButton button={secondary} />
              </Reveal>
            )}
          </div>

          {tiles.length > 0 && (
            <Reveal delay={0.1}>
              <div className="grid auto-rows-[minmax(8.5rem,auto)] grid-cols-2 gap-3 sm:gap-4">
                {tiles.map((tile, i) => {
                  const inner = <TileBody tile={tile} />;
                  const href = str(tile.link) || (tile.kind === "project" ? `/portfolio/${tile.project?.[0]?.slug}` : "");
                  const cls = cn("overflow-hidden rounded-[var(--radius-xl)] border border-neutral-200 bg-surface", SIZE_CLASS[tile.size ?? "small"] ?? SIZE_CLASS.small);
                  return href ? (
                    <Link key={i} href={href} className={cn(cls, "block transition-transform hover:-translate-y-0.5")}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={i} className={cls}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            </Reveal>
          )}
        </div>

        {stats.length > 0 && (
          <Reveal delay={0.2}>
            <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-2xl)] border border-neutral-200 bg-neutral-200 lg:grid-cols-4">
              {stats.map((s, i) => (
                <div key={i} className="bg-surface p-6">
                  <dd className="font-heading text-h2 font-extrabold leading-none text-heading">{s.value}</dd>
                  <dt className="mt-3 text-body-sm text-neutral-500">{s.label}</dt>
                </div>
              ))}
            </dl>
          </Reveal>
        )}
      </Container>
    </section>
  );
}
