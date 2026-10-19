import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { Breadcrumb, Container, Heading, RichText } from "@agency/ui";
import { portfolioPageSchema } from "@agency/types";
import { getProject, getProjects, getSettings } from "@/lib/api";
import { ProjectVideo } from "@/components/portfolio/project-video";
import { BeforeAfter, ChapterTabs } from "@/components/portfolio/case-study-client";
import { env } from "@/lib/env";
import { getBrandName } from "@/lib/branding";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug).catch(() => null);
  if (!project) return {};

  return {
    // `absolute` opts out of the root layout's title template when a real
    // SEO meta title is configured, so it's used exactly as entered instead
    // of having the site name appended. The plain-title fallback keeps the
    // template (e.g. "ProjectName | Brand") since it's not a full SEO title.
    title: project.seo?.metaTitle ? { absolute: project.seo.metaTitle } : project.title,
    description: project.seo?.metaDescription ?? project.summary,
    alternates: { canonical: `${env.NEXT_PUBLIC_SITE_URL}/portfolio/${project.slug}` },
    openGraph: {
      title: project.seo?.ogTitle ?? project.title,
      description: project.seo?.ogDescription ?? project.summary,
      images: project.gallery[0]?.url ? [project.gallery[0].url] : undefined,
    },
  };
}

function fmtMonth(d?: string | null) {
  if (!d) return "";
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug).catch(() => null);
  if (!project) notFound();

  const [brand, settings, list] = await Promise.all([
    getBrandName(),
    getSettings().catch(() => ({}) as Awaited<ReturnType<typeof getSettings>>),
    getProjects({ pageSize: 100 }).catch(() => ({ items: [] }) as never),
  ]);
  const d = portfolioPageSchema.parse(settings.portfolio_page ?? {}).detail;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary,
    ...(brand ? { creator: { "@type": "Organization", name: brand } } : {}),
  };

  // Gallery: captions "Before"/"After" feed the slider; the first other image is the hero; the rest are "Screens".
  const cap = (g: { caption: string | null }) => (g.caption ?? "").trim().toLowerCase();
  const beforeImg = project.gallery.find((g) => cap(g).startsWith("before"));
  const afterImg = project.gallery.find((g) => cap(g).startsWith("after"));
  const pool = project.gallery.filter((g) => !(beforeImg && afterImg) || (g !== beforeImg && g !== afterImg));
  const hero = pool[0] ?? null;
  // Without captioned images the first two after the hero feed the slider.
  const slider = beforeImg && afterImg ? { before: beforeImg, after: afterImg } : pool.length >= 3 ? { before: pool[1]!, after: pool[2]! } : null;
  const screens = beforeImg && afterImg ? pool.slice(1) : pool.slice(slider ? 3 : 1);

  const timeline = [fmtMonth(project.timelineStart), fmtMonth(project.timelineEnd)].filter(Boolean).join(" – ");
  const facts = [
    { label: d.client, value: project.client },
    { label: d.industry, value: project.category?.name },
    { label: d.timeline, value: timeline },
    { label: d.stack, value: project.techStack.map((t) => t.name).join(" · ") },
  ].filter((f) => f.value);
  const results = project.results.filter((r) => r.value);
  const ordered = [...project.sections].sort((a, b) => a.order - b.order);
  const used = new Set<string>();
  const chapters = d.chapterGroups
    .map((g, i) => {
      const wanted = g.sections.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
      const items = ordered.filter((sec) => !used.has(sec.id) && wanted.includes(sec.title.trim().toLowerCase()));
      items.forEach((sec) => used.add(sec.id));
      return { id: `g${i}`, title: g.title, lead: g.lead, items };
    })
    .filter((g) => g.items.length > 0);
  // sections that match no chapter keep their own block
  ordered.filter((sec) => !used.has(sec.id)).forEach((sec) => chapters.push({ id: sec.id, title: sec.title, lead: "", items: [sec] }));
  const quote = project.testimonials[0];
  const others = (list.items as { id: string; slug: string; title: string }[]).filter((p) => p.id !== project.id);
  const next = project.relatedTo[0] ?? others[0] ?? null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="pb-10 pt-4">
        <Container>
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Work", href: "/portfolio" }, { label: project.title }]} />
          <div className="mt-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-8">
            <div className="max-w-4xl">
              {project.category && <span className="inline-block rounded-full bg-accent-500 px-4 py-1.5 text-label font-semibold text-on-accent">{project.category.name}</span>}
              <Heading level={1} className="mt-6  [overflow-wrap:anywhere]" style={{ fontSize: "clamp(1.4rem,0.5rem + 4vw,4.5rem)" }}>
                {project.title}
              </Heading>
              <p className="mt-6 max-w-2xl text-body-lg text-neutral-500">{project.summary}</p>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:items-end">
              {project.liveUrl && (
                <Link href={project.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-500 px-7 py-3.5 text-body-sm font-bold text-on-accent hover:opacity-90">
                  {d.visitSite} <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              )}
              {project.githubUrl && (
                <Link href={project.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 px-7 py-3.5 text-body-sm font-semibold text-heading hover:border-accent-500">
                  {d.viewCode} <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              )}
              {chapters.length > 0 && (
                <a href="#chapters" className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 px-7 py-3.5 text-body-sm font-semibold text-heading hover:border-accent-500">
                  {d.readStory} <ArrowDown className="size-4" aria-hidden />
                </a>
              )}
            </div>
          </div>

          {facts.length > 0 && (
            <dl className="mt-12 grid grid-cols-2 gap-x-8 gap-y-6 border-y border-neutral-200 py-6 md:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="eyebrow">{f.label}</dt>
                  <dd className="mt-2 text-body font-medium text-heading">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Container>
      </section>

      {hero && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero.url} alt={hero.caption ?? project.title} width={hero.width ?? undefined} height={hero.height ?? undefined} className="aspect-[16/9] w-full rounded-[var(--radius-2xl)] border border-neutral-200 object-cover" />
          </Container>
        </section>
      )}

      {project.videoUrl && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            <ProjectVideo url={project.videoUrl} />
          </Container>
        </section>
      )}

      {results.length > 0 && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            <div className="rounded-[var(--radius-2xl)] bg-accent-500 p-8 text-on-accent sm:p-14">
              <p className="text-label font-bold uppercase tracking-widest text-[#0b0b0c]/70">{d.numbersTitle}</p>
              <dl className="mt-8 flex flex-wrap gap-x-16 gap-y-10">
                {results.map((r, i) => (
                  <div key={r.label + i} className={i % 2 === 1 ? "sm:mt-10" : ""}>
                    <dd className="font-heading text-[clamp(2rem,1rem+3.6vw,4.75rem)] font-extrabold leading-none tracking-[0.01em] text-[#0b0b0c]">{r.value}</dd>
                    <dt className="mt-3 text-body-sm font-medium text-[#0b0b0c]/75">{r.label}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </Container>
        </section>
      )}

      {chapters.length > 0 && (
        <section id="chapters" className="scroll-mt-24 pb-[var(--spacing-section)]">
          <Container className="grid gap-10 lg:grid-cols-[16rem_1fr] lg:gap-20">
            <ChapterTabs
              title={d.chapters}
              chapters={chapters.map((c) => ({ id: c.id, title: c.title }))}
              panels={chapters.map((c, i) => (
                <article key={c.id}>
                  <p className="font-heading text-label font-extrabold text-accent-500">{String(i + 1).padStart(2, "0")}</p>
                  <Heading level={2} className="mt-3" style={{ fontSize: "clamp(1.5rem, 1rem + 2vw, 2.75rem)" }}>
                    {c.title}
                  </Heading>
                  {c.lead && <p className="mt-5 max-w-3xl text-body-lg text-neutral-500">{c.lead}</p>}
                  <div className={`mt-8 grid gap-5 ${c.items.length >= 3 ? "md:grid-cols-3" : c.items.length === 2 ? "md:grid-cols-2" : ""}`}>
                    {c.items.map((sec) => (
                      <div key={sec.id} className="rounded-[var(--radius-xl)] border border-neutral-200 bg-neutral-50 p-6">
                        <p className="text-label font-bold uppercase tracking-wider text-neutral-500">{sec.title}</p>
                        <RichText html={sec.content} className="mt-3 text-body-sm text-heading" />
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            />
          </Container>
        </section>
      )}

      {slider && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            <Heading level={2}  style={{ fontSize: "clamp(1.25rem,0.9rem + 1.6vw,2.25rem)" }}>
              {d.beforeAfter}
            </Heading>
            <p className="mb-8 mt-3 text-body text-neutral-500">{d.beforeAfterHint}</p>
            <BeforeAfter
              before={{ url: slider.before.url, alt: slider.before.caption ?? d.before }}
              after={{ url: slider.after.url, alt: slider.after.caption ?? d.after }}
              labels={{ compare: d.compare, before: d.before, after: d.after }}
            />
          </Container>
        </section>
      )}

      {screens.length > 0 && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            <Heading level={2} className="mb-8" style={{ fontSize: "clamp(1.25rem,0.9rem + 1.6vw,2.25rem)" }}>
              {d.screens}
            </Heading>
            <div className="grid gap-5 md:grid-cols-3">
              {screens.map((g, i) => {
                const wide = i % 4 === 0 || i % 4 === 3;
                return (
                  <figure key={g.id} className={wide ? "md:col-span-2" : ""}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.url} alt={g.caption ?? project.title} loading="lazy" className="h-72 w-full rounded-[var(--radius-xl)] border border-neutral-200 object-cover md:h-[28rem]" />
                  </figure>
                );
              })}
            </div>
          </Container>
        </section>
      )}

      {quote && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            <figure className="mx-auto max-w-4xl rounded-[var(--radius-2xl)] border border-neutral-200 p-8 sm:p-14">
              <span className="font-heading text-6xl leading-none text-accent-500" aria-hidden>“</span>
              <blockquote className="mt-2 font-heading text-[clamp(1.5rem,1rem+1.8vw,2.5rem)] font-semibold leading-snug text-heading">{quote.quote}</blockquote>
              <figcaption className="mt-8 text-body-sm text-neutral-500">
                <strong className="text-heading">{quote.author}</strong>
                {[quote.role, quote.company].filter(Boolean).length > 0 && <> — {[quote.role, quote.company].filter(Boolean).join(", ")}</>}
              </figcaption>
            </figure>
          </Container>
        </section>
      )}

      {next && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            <Link href={`/portfolio/${next.slug}`} className="group flex items-end justify-between gap-6 border-t border-neutral-200 pt-10">
              <div className="min-w-0">
                <p className="eyebrow">{d.nextProject}</p>
                <p className="mt-4 font-heading min-w-0 text-[clamp(1.4rem,0.6rem+3vw,3.75rem)] font-extrabold leading-none text-heading [overflow-wrap:anywhere]">{next.title}</p>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-lg text-heading transition-colors group-hover:border-accent-500 group-hover:bg-accent-500 group-hover:text-on-accent sm:size-14" aria-hidden>
                <ArrowRight className="size-5 sm:size-6" />
              </span>
            </Link>
          </Container>
        </section>
      )}

      {d.ctaHeading && (
        <section className="pb-[var(--spacing-section)]">
          <Container className="text-center">
            <Heading level={2} className="mx-auto max-w-4xl" style={{ fontSize: "clamp(1.75rem,1rem + 2.6vw,3.75rem)" }}>
              {d.ctaHeading}
            </Heading>
            {d.ctaButton.label && (
              <Link href={d.ctaButton.href || "/contact"} className="mt-10 inline-flex items-center gap-2 rounded-full bg-accent-500 px-8 py-4 text-body-sm font-bold text-on-accent hover:opacity-90">
                {d.ctaButton.label} <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </Container>
        </section>
      )}
    </>
  );
}
