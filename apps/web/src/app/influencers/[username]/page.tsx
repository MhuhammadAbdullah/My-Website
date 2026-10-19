import type { Metadata } from "next";
import { VerifiedBadge } from "@/components/influencer/verified-badge";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Star } from "lucide-react";
import { Breadcrumb, Container, Heading, cn } from "@agency/ui";
import { influencersPageSchema } from "@agency/types";
import { getInfluencer, getInfluencers, getSettings } from "@/lib/api";
import { getInfluencerFlags } from "@/lib/influencer-flags";
import { withFallback } from "@/lib/safe-fetch";
import { BookingModal } from "@/components/influencer/booking-modal";
import { PortfolioGallery } from "@/components/influencer/portfolio-gallery";
import { Counter, ProfileAnalytics, RateCard, ReviewsSection, type RateRow } from "@/components/influencer/profile-client";
import type { InfluencerCardRead } from "@/lib/influencer-types";
import { badgeColorProps, countText, formatCompactNumber, formatDiscountedPrice, formatEngagementRate } from "@/lib/influencer-format";
import { env } from "@/lib/env";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const influencer = await getInfluencer(username).catch(() => null);
  if (!influencer) return {};

  return {
    title: influencer.seo?.metaTitle ? { absolute: influencer.seo.metaTitle } : `${influencer.influencer.name} (@${influencer.username})`,
    description: influencer.seo?.metaDescription ?? influencer.tagline ?? influencer.bio ?? undefined,
    alternates: { canonical: `${env.NEXT_PUBLIC_SITE_URL}/influencers/${influencer.username}` },
    openGraph: {
      title: influencer.seo?.ogTitle ?? influencer.influencer.name,
      description: influencer.seo?.ogDescription ?? influencer.tagline ?? undefined,
      images: influencer.profilePhoto?.url ? [influencer.profilePhoto.url] : undefined,
    },
  };
}

export default async function InfluencerDetailPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const flags = await getInfluencerFlags();
  if (!flags.marketplaceEnabled) notFound();

  const influencer = await getInfluencer(username).catch((error) => {
    // A real failure here (as opposed to a genuinely missing/unpublished profile, which the API
    // 404s for cleanly) is logged so intermittent fetch-failed 404s leave a trace in runtime logs.
    console.error(`[web] Failed to load influencer "${username}".`, error instanceof Error ? error.message : error);
    return null;
  });
  if (!influencer) notFound();

  const primaryCategory = influencer.categories[0];
  const [settings, related] = await Promise.all([
    withFallback(getSettings(), {}, "site settings"),
    primaryCategory
      ? withFallback(getInfluencers({ category: primaryCategory.slug, limit: 4 }), { items: [], total: 0, page: 1, pageSize: 4, totalPages: 1 }, "related creators")
      : Promise.resolve({ items: [] as InfluencerCardRead[] }),
  ]);
  // Headings and small labels are managed in Admin > Influencer Marketplace > Settings.
  const pageCfg = influencersPageSchema.parse(settings.influencers_page ?? {});
  const L = pageCfg.profile;
  const others = related.items.filter((i) => i.username !== influencer.username).slice(0, 3);

  const name = influencer.influencer.name;
  const platforms = influencer.platforms;
  const primary = platforms.find((p) => p.isPrimary) ?? platforms[0];
  const totalFollowers = platforms.reduce((n, p) => n + p.followers, 0);
  const avgEngagement = platforms.length ? platforms.reduce((n, p) => n + Number(p.engagementRate), 0) / platforms.length : 0;
  const rating = Number(influencer.ratingAverage);
  const ratingLine = influencer.ratingCount > 0 ? `${rating.toFixed(1)} (${countText(L.reviewsCount, influencer.ratingCount)})` : `${L.newCreator} (${countText(L.reviewsCount, 0)})`;
  const place = [influencer.city, influencer.countryCode].filter(Boolean).join(", ");

  const stats = [
    { label: L.totalFollowers, value: totalFollowers > 0 ? formatCompactNumber(totalFollowers) : "—", accent: false },
    { label: L.avgEngagement, value: platforms.length ? formatEngagementRate(avgEngagement) : "—", accent: true },
    { label: L.avgReach, value: primary && primary.avgReach > 0 ? formatCompactNumber(primary.avgReach) : "—", accent: false },
    influencer.languages.length > 0
      ? { label: L.languages, value: influencer.languages.join(", "), accent: false }
      : { label: L.reviews, value: String(influencer.ratingCount), accent: false },
  ];

  // Rate card rows: the creator's packages, or (when they only set simple prices) their priced deliverables.
  const currency = (c: string | null) => c ?? "";
  const rows: RateRow[] =
    influencer.pricingCards.length > 0
      ? influencer.pricingCards.map((c) => ({
          id: c.id,
          cardId: c.id,
          title: c.title,
          sub: [c.estimatedDeliveryTime, c.description].filter(Boolean).join(" · ") || c.features.slice(0, 2).join(" + "),
          price: c.isCustomQuote || c.price == null ? L.custom : c.discount ? formatDiscountedPrice({ price: c.price, currency: c.currency }, c.discount.amountOff) : `${currency(c.currency)} ${Number(c.price).toLocaleString()}`.trim(),
          struck: !c.isCustomQuote && c.price != null && c.discount ? `${currency(c.currency)} ${Number(c.price).toLocaleString()}`.trim() : undefined,
        }))
      : influencer.pricingItems.map((i) => ({
          id: i.id,
          title: i.deliverableType.key === "CUSTOM" ? i.customLabel || "Custom package" : i.deliverableType.label,
          sub: "",
          price: `${currency(i.currency)} ${Number(i.price).toLocaleString()}`.trim(),
        }));

  const booking = !flags.bookingsEnabled
    ? ({ state: "disabled", message: flags.bookingsDisabledMessage } as const)
    : !influencer.availableForBooking
      ? ({ state: "unavailable", message: L.unavailable } as const)
      : ({ state: "open", message: "" } as const);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    alternateName: `@${influencer.username}`,
    description: influencer.tagline ?? influencer.bio ?? undefined,
    image: influencer.profilePhoto?.url,
  };

  const H2 = { fontSize: "clamp(1.75rem, 1rem + 2.6vw, 3.75rem)" } as const;
  const photo = influencer.profilePhoto?.url ?? influencer.coverImage?.url;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="pb-14 pt-4">
        <Container>
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Influencers", href: "/influencers" }, { label: name }]} />

          <div className="mt-8 grid gap-4 lg:grid-cols-[19rem_1fr]">
            <div className="fade-up relative min-h-[22rem] overflow-hidden rounded-[var(--radius-2xl)] border border-neutral-200 bg-neutral-50">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote creator photo
                <img src={photo} alt={name} className="img-in absolute inset-0 size-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center font-heading text-8xl font-extrabold text-neutral-200">{name.charAt(0)}</div>
              )}
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider text-on-accent">
                <span className="size-1.5 animate-pulse rounded-full bg-[#0b0b0c]" aria-hidden /> {influencer.availableForBooking ? L.available : L.unavailable}
              </span>
            </div>

            <div className="grid gap-4">
              <div className="fade-up rounded-[var(--radius-2xl)] border border-neutral-200 bg-neutral-50 p-6 [--d:0.12s] sm:p-8">
                <div className="flex flex-wrap items-center gap-2 text-label font-semibold">
                  {primaryCategory && <span className="rounded-full border border-neutral-300 px-3 py-1 uppercase tracking-wide text-heading">{primaryCategory.name}</span>}
                  {place && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-neutral-300 px-3 py-1 text-heading">
                      <MapPin className="size-3" aria-hidden /> {place}
                    </span>
                  )}
                  {influencer.isVerified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-heading">
                      <VerifiedBadge className="size-4" /> {L.verified}
                    </span>
                  )}
                  {(influencer.badges ?? []).map((b) => {
                    const bp = badgeColorProps(b.color);
                    return (
                      <span key={b.key} className={cn("rounded-full px-3 py-1", bp.className)} style={bp.style}>
                        {b.label}
                      </span>
                    );
                  })}
                </div>
                <h1 className="fade-up mt-5 font-heading font-extrabold leading-[0.95] text-heading [--d:0.2s] [overflow-wrap:anywhere]" style={{ fontSize: "clamp(2.25rem, 0.5rem + 5.6vw, 5.5rem)" }}>
                  {name}
                  <span className="text-accent-500">.</span>
                </h1>
                <p className="mt-3 text-body-sm text-neutral-500">
                  @{influencer.username} · ★ {ratingLine}
                </p>
                {(influencer.tagline || influencer.bio) && <p className="mt-4 max-w-2xl whitespace-pre-line text-body text-heading">{influencer.tagline || influencer.bio}</p>}
                {rows.length === 0 && booking.state === "open" && (
                  <div className="mt-6">
                    <BookingModal username={influencer.username} influencerName={name} pricingCards={influencer.pricingCards} />
                  </div>
                )}
              </div>

              <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {stats.map((st, i) => (
                  <div key={st.label} style={{ ["--d" as string]: `${0.25 + i * 0.09}s` }} className="fade-up min-w-0 rounded-[var(--radius-lg)] border border-neutral-200 bg-neutral-50 p-4">
                    <dd className={cn("truncate font-heading font-extrabold leading-none", st.accent ? "text-accent-500" : "text-heading")} style={{ fontSize: "clamp(1.25rem, 1rem + 0.9vw, 1.9rem)" }}>
                      <Counter value={st.value} />
                    </dd>
                    <dt className="mt-2 text-label text-neutral-500">{st.label}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Container>
      </section>

      {platforms.length > 0 && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            <ProfileAnalytics
              heading={L.analytics}
              platforms={platforms}
              labels={{
                followersEngagement: L.followersEngagement,
                engagementRate: L.engagementRate,
                reach: L.reach,
                accountReach: L.accountReach,
                contentReach: L.contentReach,
                gender: L.gender,
                female: L.female,
                male: L.male,
                age: L.age,
                topLocations: L.topLocations,
                country: L.country,
                city: L.city,
                source: L.source,
              }}
            />
          </Container>
        </section>
      )}

      {rows.length > 0 && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            <Heading level={2} className="mb-8" style={H2}>
              {L.rateCard}
            </Heading>
            <RateCard
              rows={rows}
              cards={influencer.pricingCards}
              username={influencer.username}
              name={name}
              labels={{ yourBooking: L.yourBooking, items: L.items, quoteNote: L.quoteNote, bookButton: L.bookButton }}
              booking={booking}
            />
          </Container>
        </section>
      )}

      <PortfolioGallery items={influencer.portfolioItems} heading={L.brandWork} />

      {influencer.collaborations.length > 0 && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            <Heading level={2} className="mb-8" style={H2}>
              {L.collaborations}
            </Heading>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {influencer.collaborations.map((collab) => (
                <div key={collab.id} className="rounded-[var(--radius-xl)] border border-neutral-200 bg-neutral-50 p-6">
                  <div className="flex items-center gap-3">
                    {collab.brandLogo && (
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                        <Image src={collab.brandLogo.url} alt={collab.brandName} fill className="object-contain p-1" sizes="40px" />
                      </div>
                    )}
                    <p className="font-heading font-extrabold text-heading">{collab.brandName}</p>
                  </div>
                  {collab.description && <p className="mt-3 text-body-sm text-neutral-500">{collab.description}</p>}
                  {collab.resultSummary && <p className="mt-2 text-body-sm font-semibold text-accent-500">{collab.resultSummary}</p>}
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="pb-[var(--spacing-section)]">
        <Container>
          <ReviewsSection
            reviews={influencer.reviews}
            average={rating}
            count={influencer.ratingCount}
            target={{ kind: "influencer", username: influencer.username }}
            marquee={pageCfg.reviewsMarquee}
            name={name}
            heading={H2}
            labels={{
              heading: L.reviews,
              empty: L.noReviews,
              reviewsCount: L.reviewsCount,
              write: L.writeReview,
              formTitle: L.reviewFormTitle,
              formIntro: L.reviewFormIntro,
              yourRating: L.yourRating,
              yourName: L.yourName,
              yourCompany: L.yourCompany,
              yourReview: L.yourReview,
              submit: L.submitReview,
              thanks: L.reviewThanks,
              showMore: L.showMore,
            }}
          />
        </Container>
      </section>

      {others.length > 0 && primaryCategory && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <Heading level={2} style={H2}>
                {L.moreCreators.replace("{category}", primaryCategory.name.toLowerCase())}
              </Heading>
              <Link href={`/influencers?category=${primaryCategory.slug}`} className="text-body-sm font-semibold text-accent-500 hover:underline">
                {L.viewAll} →
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {others.map((o) => {
                const img = o.profilePhoto?.url ?? o.coverImage?.url;
                return (
                  <Link key={o.id} href={`/influencers/${o.username}`} className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-neutral-200 bg-neutral-50 p-4 transition-colors hover:border-accent-500">
                    <span className="size-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                      {img && (
                        // eslint-disable-next-line @next/next/no-img-element -- remote creator photo
                        <img src={img} alt="" loading="lazy" className="size-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-heading text-body-sm font-extrabold text-heading">{o.name}</span>
                      <span className="block truncate text-label text-neutral-500">
                        {formatCompactNumber(o.totalFollowers)} followers · {formatEngagementRate(o.totalEngagementRate)} eng.
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}

export async function generateStaticParams() {
  const { items } = await getInfluencers({ limit: 100 }).catch(() => ({ items: [] }) as never);
  return items.map((i) => ({ username: i.username }));
}
