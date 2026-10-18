import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container, Heading, Reveal } from "@agency/ui";
import { CmsButton } from "./cms-button";
import { CmsImage } from "./cms-image";
import { arr, img, str, type ButtonValue, type Content } from "./types";

interface Project {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  category?: string | null;
  results?: { label?: string; value?: string }[];
  image?: unknown;
}

// Cards from the Portfolio collection: image, category chip, name, summary and
// (optionally) the project's first result as a badge.
export function SelectedWorkSection({ content }: { content: Content }) {
  const eyebrow = str(content.eyebrow);
  const heading = str(content.heading);
  const showResult = content.showResult === true;
  const projects = arr<Project>(content.projects).filter((p) => str(p.title));
  if (projects.length === 0) return null;

  return (
    <section className="py-[var(--spacing-section)]">
      <Container>
        {(heading || eyebrow || !!content.button) && (
          <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
              {heading && <Heading level={2}>{heading}</Heading>}
            </div>
            <CmsButton button={content.button as ButtonValue | undefined} size="md" />
          </Reveal>
        )}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => {
            const image = img(p.image);
            const result = arr<{ label?: string; value?: string }>(p.results).find((r) => str(r.value));
            return (
              <Reveal key={p.id} delay={i * 0.06}>
                <Link href={`/portfolio/${p.slug}`} className="group block h-full">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] border border-neutral-200 bg-surface">
                    {image ? (
                      <CmsImage image={image} className="size-full object-cover transition-transform duration-slow ease-[var(--ease-premium)] group-hover:scale-105" sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" />
                    ) : null}
                    {str(p.category) && (
                      <span className="absolute left-4 top-4 rounded-full bg-[#0b0b0c]/85 px-3 py-1 text-label font-extrabold uppercase tracking-wider text-[color:var(--accent)] backdrop-blur">
                        {str(p.category)}
                      </span>
                    )}
                    {showResult && result && (
                      <span className="absolute bottom-4 left-4 rounded-full bg-accent-500 px-3 py-1 text-body-sm font-extrabold text-on-accent">
                        {str(result.value)} {str(result.label)}
                      </span>
                    )}
                  </div>
                  <div className="mt-5 flex items-start justify-between gap-4">
                    <h3 className="font-heading text-h4 font-extrabold text-heading transition-colors group-hover:text-accent-500">{str(p.title)}</h3>
                    <ArrowUpRight className="mt-1 size-5 shrink-0 text-neutral-400 transition-colors group-hover:text-accent-500" aria-hidden />
                  </div>
                  {str(p.summary) && <p className="mt-2 line-clamp-2 text-body-sm text-neutral-500">{str(p.summary)}</p>}
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
