import type { Metadata } from "next";
import { Info } from "lucide-react";
import { Container, Section, Heading, Reveal } from "@agency/ui";
import { getAffiliateCategories, getAffiliateTools, getPageSeo } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";
import { emptyPage } from "@/lib/fallbacks";
import { PageHeading } from "@/components/marketing/page-heading";
import { AffiliateFilters } from "@/components/affiliate/affiliate-filters";
import { AffiliateToolCard } from "@/components/affiliate/affiliate-tool-card";
import { AffiliatePagination } from "@/components/affiliate/affiliate-pagination";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("affiliate-tools").catch(() => null);
  return buildPageMetadata({
    seo,
    fallbackTitle: "Affiliate Tools",
    fallbackDescription: "The hosting, domain, email, design, and productivity tools Calibre Digital actually uses and recommends.",
  });
}

export default async function AffiliateToolsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    category?: string;
    search?: string;
    featured?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const pageSize = Number(params.pageSize ?? 12);

  const [toolsPage, categories] = await Promise.all([
    withFallback(
      getAffiliateTools({
        page,
        pageSize,
        category: params.category,
        search: params.search,
        featured: params.featured === "true" ? true : undefined,
        sortBy: params.sortBy as "order" | "name" | "createdAt" | undefined,
        sortOrder: params.sortOrder as "asc" | "desc" | undefined,
      }),
      emptyPage(page, pageSize),
      "affiliate tools",
    ),
    withFallback(getAffiliateCategories(), [], "affiliate categories"),
  ]);

  return (
    <>
      <Section className="pb-0">
        <Container>
          <PageHeading breadcrumb={[{ label: "Home", href: "/" }, { label: "Affiliate Tools" }]}>
            <Heading level={1} display>
              Tools we **actually** use.
            </Heading>
            <p className="mt-5 text-body-lg text-body">
              Every product below is something we run our own business and client projects on — not a
              rented banner ad.
            </p>
          </PageHeading>
          <Reveal delay={0.1} className="mt-6 flex items-start gap-3 rounded-2xl border border-accent-200 bg-accent-50 p-4 text-body-sm text-accent-800">
            <Info className="mt-0.5 size-5 shrink-0" />
            <p>
              <strong>Affiliate disclosure:</strong> some links below are affiliate links. If you sign up
              through them, we may earn a commission at no additional cost to you — and in several cases
              our partners extend an exclusive discount to our visitors, called out on each card.
            </p>
          </Reveal>
        </Container>
      </Section>

      <Section>
        <Container>
          <AffiliateFilters categories={categories} />

          {toolsPage.items.length === 0 ? (
            <p className="mt-16 text-center text-body-lg text-neutral-400">
              No tools match your filters yet.
            </p>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {toolsPage.items.map((tool) => (
                <AffiliateToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}

          <div className="mt-12">
            <AffiliatePagination
              page={toolsPage.page}
              pageSize={toolsPage.pageSize}
              total={toolsPage.total}
              totalPages={toolsPage.totalPages}
            />
          </div>
        </Container>
      </Section>
    </>
  );
}
