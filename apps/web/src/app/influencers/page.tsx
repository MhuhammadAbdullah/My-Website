import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb, Container, Section, Heading } from "@agency/ui";
import { influencersPageSchema } from "@agency/types";
import { getInfluencers, getInfluencerMarketplacePageContent, getPageSeo, getSettings } from "@/lib/api";
import { getInfluencerCategories } from "@/lib/influencer-api";
import { getInfluencerFlags } from "@/lib/influencer-flags";
import { withFallback } from "@/lib/safe-fetch";
import { EMPTY_INFLUENCER_MARKETPLACE_PAGE_CONTENT } from "@/lib/fallbacks";
import { CreatorCard } from "@/components/influencer/creator-card";
import { ShortlistBar, ShortlistProvider } from "@/components/influencer/shortlist";
import { AudienceToggle, CreatorCtaButton, HeroButtons, StepCards } from "@/components/influencer/marketplace-client";
import { InfluencerFilters } from "@/components/influencer/influencer-filters";
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
  limit?: string;
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

  const [settings, content] = await Promise.all([
    withFallback(getSettings(), {}, "site settings"),
    withFallback(getInfluencerMarketplacePageContent(), null, "influencer marketplace page content").then(
      (item) => item ?? EMPTY_INFLUENCER_MARKETPLACE_PAGE_CONTENT,
    ),
  ]);
  // Hero buttons, steps, labels and the two closing cards are managed in Admin > Influencer Marketplace > Settings.
  const cfg = influencersPageSchema.parse(settings.influencers_page ?? {});

  // "Load more" raises ?limit by one step; the page is a plain server render of the first `limit` creators.
  const limit = Math.min(96, Math.max(cfg.pageSize, Number(params.limit ?? cfg.pageSize) || cfg.pageSize));

  const [influencersPage, categories] = await Promise.all([
    withFallback(
      getInfluencers({
        page: 1,
        limit,
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
      { items: [], total: 0, page: 1, pageSize: limit, totalPages: 1 },
      "influencers",
    ),
    withFallback(getInfluencerCategories(), [], "influencer categories"),
  ]);

  const hasMore = influencersPage.total > influencersPage.items.length;
  const more = new URLSearchParams(Object.entries(params).filter(([k, v]) => v && k !== "page" && k !== "limit") as [string, string][]);
  more.set("limit", String(limit + cfg.pageSize));
  const L = cfg.labels;
  const cardLabels = {
    viewProfile: L.viewProfile,
    shortlist: L.shortlist,
    shortlisted: L.shortlisted,
    followers: L.followers,
    engagement: L.engagement,
    from: L.from,
    newCreator: L.newCreator,
  };

  return (
    <ShortlistProvider>
      <section className="pb-8 pt-4">
        <Container>
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Influencers" }]} />
          <div className="mt-6">
            <AudienceToggle brand={cfg.toggle.brand} creator={cfg.toggle.creator} registrationEnabled={flags.registrationEnabled} />
          </div>
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-end">
            <div>
              <Heading level={1} style={{ fontSize: "clamp(1.75rem, 0.5rem + 3.4vw, 4.25rem)" }}>
                {content.heroHeading}
              </Heading>
              {content.heroDescription && <p className="mt-6 max-w-xl text-body text-neutral-500">{content.heroDescription}</p>}
              <HeroButtons browse={cfg.buttons.browse} brief={cfg.buttons.brief} briefHref={cfg.buttons.briefHref} />
            </div>
            {cfg.steps.length > 0 && <StepCards steps={cfg.steps} />}
          </div>
        </Container>
      </section>

      <section id="creators" className="scroll-mt-24 pb-[var(--spacing-section)] pt-6">
        <Container>
          <InfluencerFilters categories={categories} labels={{ searchPlaceholder: L.searchPlaceholder, sort: L.sort, filters: L.filters, all: "All" }} />

          {influencersPage.items.length === 0 ? (
            <p className="mt-16 text-center text-body-lg text-neutral-500">{L.noResults}</p>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
              {influencersPage.items.map((influencer) => (
                <CreatorCard key={influencer.id} influencer={influencer} labels={cardLabels} />
              ))}
            </div>
          )}

          {hasMore && (
            <div className="mt-10 text-center">
              <Link
                href={`?${more.toString()}#creators`}
                scroll={false}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-7 py-3 text-body-sm font-semibold text-heading hover:border-accent-500"
              >
                {L.loadMore} <span aria-hidden>↓</span>
              </Link>
            </div>
          )}
        </Container>
      </section>

      <section className="pb-[var(--spacing-section)]">
        <Container className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col rounded-[var(--radius-2xl)] bg-accent-500 p-8 text-[#0b0b0c] sm:p-10">
            {cfg.briefCard.tag && <p className="text-label font-bold uppercase tracking-wider">{cfg.briefCard.tag}</p>}
            <Heading level={2} className="mt-4 !text-[#0b0b0c]" style={{ fontSize: "clamp(1.75rem, 1rem + 2vw, 3rem)" }}>
              {cfg.briefCard.heading}
            </Heading>
            <p className="mt-4 max-w-md text-body-sm">{cfg.briefCard.text}</p>
            {cfg.briefCard.button.label && (
              <Link
                href={cfg.briefCard.button.href || "/contact"}
                className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-[#0b0b0c] px-6 py-3 text-body-sm font-bold text-[#f2f2ee] hover:opacity-90"
              >
                {cfg.briefCard.button.label} <span aria-hidden>→</span>
              </Link>
            )}
          </div>
          <div className="flex flex-col rounded-[var(--radius-2xl)] border border-neutral-200 bg-neutral-50 p-8 sm:p-10">
            {cfg.creatorCard.tag && <p className="text-label font-bold uppercase tracking-wider text-neutral-500">{cfg.creatorCard.tag}</p>}
            <Heading level={2} className="mt-4" style={{ fontSize: "clamp(1.75rem, 1rem + 2vw, 3rem)" }}>
              {cfg.creatorCard.heading}
            </Heading>
            <p className="mt-4 max-w-md text-body-sm text-neutral-500">{cfg.creatorCard.text}</p>
            <CreatorCtaButton label={cfg.creatorCard.button} registrationEnabled={flags.registrationEnabled} />
          </div>
        </Container>
      </section>

      <ShortlistBar text={L.shortlistBar} button={L.requestQuotes} />
    </ShortlistProvider>
  );
}
