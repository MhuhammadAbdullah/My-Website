import type { Metadata } from "next";
import { Container, Section, Heading } from "@agency/ui";
import { getInfluencers, getInfluencerMarketplacePageContent, getPageSeo } from "@/lib/api";
import { getInfluencerCategories } from "@/lib/influencer-api";
import { getInfluencerFlags } from "@/lib/influencer-flags";
import { withFallback } from "@/lib/safe-fetch";
import { EMPTY_INFLUENCER_MARKETPLACE_PAGE_CONTENT } from "@/lib/fallbacks";
import { InfluencerCard } from "@/components/influencer/influencer-card";
import { InfluencerFilters } from "@/components/influencer/influencer-filters";
import { InfluencerAuthButtons } from "@/components/influencer/influencer-auth-buttons";
import { PortfolioPagination } from "@/components/portfolio/portfolio-pagination";
import { PageHeading } from "@/components/marketing/page-heading";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("influencers").catch(() => null);
  return buildPageMetadata({
    seo,
    fallbackTitle: "Influencer Marketplace",
    fallbackDescription: "Discover and book vetted creators across Instagram, TikTok, YouTube, and more for your next campaign.",
  });
}

interface InfluencersPageSearchParams {
  page?: string;
  category?: string;
  search?: string;
  platform?: string;
  country?: string;
  city?: string;
  language?: string;
  priceMin?: string;
  priceMax?: string;
  followersMin?: string;
  engagementMin?: string;
  availability?: string;
  verified?: string;
  featured?: string;
  sortBy?: string;
  sortOrder?: string;
}

export default async function InfluencersPage({
  searchParams,
}: {
  searchParams: Promise<InfluencersPageSearchParams>;
}) {
  const params = await searchParams;
  const flags = await getInfluencerFlags();

  if (!flags.marketplaceEnabled) {
    return (
      <Section>
        <Container className="max-w-2xl">
          <PageHeading breadcrumb={[{ label: "Home", href: "/" }, { label: "Influencers" }]}>
            <Heading level={1} display>
              Influencer Marketplace
            </Heading>
          </PageHeading>
          <div
            className="mt-10 rounded-2xl border border-neutral-200 p-8 text-body text-neutral-600"
            dangerouslySetInnerHTML={{
              __html: flags.maintenanceNotice || "<p>This service is currently unavailable. Please check back later.</p>",
            }}
          />
        </Container>
      </Section>
    );
  }

  const page = Number(params.page ?? 1);
  const pageSize = 12;

  const [influencersPage, categories, content] = await Promise.all([
    withFallback(
      getInfluencers({
        page,
        limit: pageSize,
        category: params.category,
        search: params.search,
        platform: params.platform,
        country: params.country,
        city: params.city,
        language: params.language,
        priceMin: params.priceMin ? Number(params.priceMin) : undefined,
        priceMax: params.priceMax ? Number(params.priceMax) : undefined,
        followersMin: params.followersMin ? Number(params.followersMin) : undefined,
        engagementMin: params.engagementMin ? Number(params.engagementMin) : undefined,
        availability: params.availability === "true" ? true : undefined,
        verified: params.verified === "true" ? true : undefined,
        featured: params.featured === "true" ? true : undefined,
        sortBy: params.sortBy as never,
        sortOrder: params.sortOrder as never,
      }),
      { items: [], total: 0, page, pageSize, totalPages: 1 },
      "influencers",
    ),
    withFallback(getInfluencerCategories(), [], "influencer categories"),
    withFallback(getInfluencerMarketplacePageContent(), null, "influencer marketplace page content").then(
      (item) => item ?? EMPTY_INFLUENCER_MARKETPLACE_PAGE_CONTENT,
    ),
  ]);

  return (
    <>
      <Section className="pb-0">
        <Container>
          <PageHeading breadcrumb={[{ label: "Home", href: "/" }, { label: "Influencers" }]}>
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <Heading level={1} display>
                  {content.heroHeading}
                </Heading>
                <p className="mt-5 max-w-2xl text-body-lg text-body">{content.heroDescription}</p>
              </div>
              <InfluencerAuthButtons registrationEnabled={flags.registrationEnabled} />
            </div>
          </PageHeading>
        </Container>
      </Section>

      <Section>
        <Container>
          <InfluencerFilters categories={categories} />

          {influencersPage.items.length === 0 ? (
            <p className="mt-16 text-center text-body-lg text-neutral-400">No influencers match your filters yet.</p>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {influencersPage.items.map((influencer) => (
                <InfluencerCard key={influencer.id} influencer={influencer} />
              ))}
            </div>
          )}

          <div className="mt-12">
            <PortfolioPagination page={influencersPage.page} totalPages={influencersPage.totalPages} />
          </div>
        </Container>
      </Section>
    </>
  );
}
