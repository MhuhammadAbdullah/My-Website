import type { Metadata } from "next";
import { Container, Section, Heading } from "@agency/ui";
import { getPageSeo, getProjectCategories, getProjects, getPortfolioPageContent } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";
import { emptyPage, EMPTY_PORTFOLIO_PAGE_CONTENT } from "@/lib/fallbacks";
import { ProjectCard } from "@/components/marketing/project-card";
import { PortfolioFilters } from "@/components/portfolio/portfolio-filters";
import { PortfolioPagination } from "@/components/portfolio/portfolio-pagination";
import { PageHeading } from "@/components/marketing/page-heading";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("portfolio").catch(() => null);
  return buildPageMetadata({
    seo,
    fallbackTitle: "Portfolio",
    fallbackDescription: "Case studies from SaaS platforms, e-commerce storefronts, marketing sites, and internal tools.",
  });
}

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);

  const [projectsPage, categories, content] = await Promise.all([
    withFallback(
      getProjects({ page, pageSize: 6, category: params.category, search: params.search }),
      emptyPage(page, 6),
      "projects",
    ),
    withFallback(getProjectCategories(), [], "project categories"),
    withFallback(getPortfolioPageContent(), null, "portfolio page content").then(
      (item) => item ?? EMPTY_PORTFOLIO_PAGE_CONTENT,
    ),
  ]);

  return (
    <>
      <Section className="pb-0">
        <Container>
          <PageHeading breadcrumb={[{ label: "Home", href: "/" }, { label: "Portfolio" }]}>
            <Heading level={1} display>
              {content.heroHeading}
            </Heading>
            <p className="mt-5 text-body-lg text-body">{content.heroDescription}</p>
          </PageHeading>
        </Container>
      </Section>

      <Section>
        <Container>
          <PortfolioFilters categories={categories} />

          {projectsPage.items.length === 0 ? (
            <p className="mt-16 text-center text-body-lg text-neutral-400">
              No projects match your filters yet.
            </p>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projectsPage.items.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}

          <div className="mt-12">
            <PortfolioPagination page={projectsPage.page} totalPages={projectsPage.totalPages} />
          </div>
        </Container>
      </Section>
    </>
  );
}
