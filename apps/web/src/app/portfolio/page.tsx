import type { Metadata } from "next";
import { isSectionVisible } from "@agency/types";
import Link from "next/link";
import { Breadcrumb, Container, Heading } from "@agency/ui";
import { portfolioPageSchema } from "@agency/types";
import { getPageSeo, getProjects, getPortfolioPageContent, getSettings } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";
import { emptyPage, EMPTY_PORTFOLIO_PAGE_CONTENT } from "@/lib/fallbacks";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("portfolio").catch(() => null);
  return buildPageMetadata({
    seo,
    fallbackTitle: "Portfolio",
    fallbackDescription: "Case studies from SaaS platforms, e-commerce storefronts, marketing sites, and internal tools.",
  });
}

import { WorkExplorer, type WorkProject } from "@/components/portfolio/work-explorer";

export default async function PortfolioPage() {
  // All published projects at once (the API caps a page at 100): filtering, search,
  // grid/list and "load more" then happen instantly in the browser.
  const [projectsPage, content, settings] = await Promise.all([
    withFallback(getProjects({ page: 1, pageSize: 100 }), emptyPage(1, 100), "projects"),
    withFallback(getPortfolioPageContent(), null, "portfolio page content").then((item) => item ?? EMPTY_PORTFOLIO_PAGE_CONTENT),
    withFallback(getSettings(), {}, "site settings"),
  ]);

  // Everything except the projects themselves is managed in Admin > Portfolio > Page Sections.
  const cfg = portfolioPageSchema.parse(settings.portfolio_page ?? {});
  const show = (key: string) => isSectionVisible(settings.section_visibility, "portfolio", key);

  const all = projectsPage.items;
  const projects: WorkProject[] = all.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    category: p.category?.name ?? "",
    summary: p.summary,
    image: p.gallery[0] ? { url: p.gallery[0].url, alt: p.gallery[0].caption ?? p.title } : null,
    results: (p.results ?? []).filter((r) => r.value).map((r) => ({ value: r.value, label: r.label })),
  }));
  const flagged = all.filter((p) => p.isFeatured).slice(0, 5).map((p) => projects.find((x) => x.id === p.id)!);
  const featured = flagged.length > 0 ? flagged : projects.slice(0, 3);
  const industries = new Set(projects.map((p) => p.category).filter(Boolean)).size;

  return (
    <>
      <section className="pb-8 pt-4">
        <Container>
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Work" }]} />
          <div className="mt-8 grid gap-x-10 gap-y-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <Heading level={1} className="text-[clamp(2.75rem,1rem+7vw,8rem)]">
              {content.heroHeading}
            </Heading>
            {projects.length > 0 && show("stats") && (
              <dl className="flex gap-10 pb-3">
                <div>
                  <dd className="font-heading text-[clamp(1.75rem,1.2rem+1.8vw,2.75rem)] font-extrabold leading-none tracking-[0.01em] text-heading">{projects.length}+</dd>
                  <dt className="mt-1 text-label text-neutral-500">{cfg.labels.projectsShipped}</dt>
                </div>
                {industries > 0 && (
                  <div>
                    <dd className="font-heading text-[clamp(1.75rem,1.2rem+1.8vw,2.75rem)] font-extrabold leading-none tracking-[0.01em] text-heading">{industries}</dd>
                    <dt className="mt-1 text-label text-neutral-500">{cfg.labels.industriesServed}</dt>
                  </div>
                )}
              </dl>
            )}
          </div>
          {content.heroDescription && <p className="mt-6 max-w-2xl text-body-lg text-neutral-500">{content.heroDescription}</p>}
        </Container>
      </section>

      <section className="pb-[var(--spacing-section)]">
        <Container>
          <WorkExplorer projects={projects} featured={featured} labels={cfg.labels} pageSize={cfg.pageSize} />
        </Container>
      </section>

      {cfg.cta.heading && show("cta") && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            <div className="flex flex-wrap items-center justify-between gap-8 rounded-[var(--radius-2xl)] bg-accent-500 p-8 text-on-accent sm:p-14">
              <Heading level={2} className="max-w-2xl text-[clamp(2.25rem,1rem+4.4vw,5.25rem)] !text-[#0b0b0c] [&_em]:!text-[#0b0b0c] [&_em]:underline [&_em]:decoration-[0.06em] [&_em]:underline-offset-[0.1em]">
                {cfg.cta.heading}
              </Heading>
              {cfg.cta.button.label && (
                <Link href={cfg.cta.button.href || "/contact"} className="inline-flex items-center gap-2 rounded-full bg-[#0b0b0c] px-7 py-4 text-body-sm font-bold text-[#f2f2ee] hover:opacity-90">
                  {cfg.cta.button.label} <span aria-hidden>&rarr;</span>
                </Link>
              )}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
