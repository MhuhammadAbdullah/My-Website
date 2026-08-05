import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Star, Globe2 } from "lucide-react";
import { Badge, Breadcrumb, Button, Card, Container, Heading, Section, cn } from "@agency/ui";
import { getInfluencer, getInfluencers, getFaqs } from "@/lib/api";
import { getInfluencerFlags } from "@/lib/influencer-flags";
import { withFallback } from "@/lib/safe-fetch";
import { FaqSection } from "@/components/marketing/faq-section";
import { PlatformAnalyticsTabs } from "@/components/influencer/platform-analytics-tabs";
import { BookingModal } from "@/components/influencer/booking-modal";
import { PortfolioGallery } from "@/components/influencer/portfolio-gallery";
import { ReviewsMarquee } from "@/components/influencer/reviews-marquee";
import { badgeColorProps, discountBadgeColorProps, formatDiscountBadge, formatDiscountedPrice } from "@/lib/influencer-format";
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

  const influencer = await getInfluencer(username).catch(() => null);
  if (!influencer) notFound();

  const faqs = await withFallback(getFaqs("INFLUENCER"), [], "influencer FAQs");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: influencer.influencer.name,
    alternateName: `@${influencer.username}`,
    description: influencer.tagline ?? influencer.bio ?? undefined,
    image: influencer.profilePhoto?.url,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Section className="pb-0">
        <Container>
          <Breadcrumb
            items={[{ label: "Home", href: "/" }, { label: "Influencers", href: "/influencers" }, { label: influencer.influencer.name }]}
          />
        </Container>
      </Section>

      <Section className="pt-6">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-neutral-100">
            <div className="relative aspect-[21/9] w-full sm:aspect-[3/1]">
              {influencer.coverImage && (
                <Image src={influencer.coverImage.url} alt="" fill className="object-cover" sizes="100vw" priority />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            </div>

            <div className="relative -mt-16 flex flex-col gap-6 px-6 pb-6 sm:flex-row sm:items-end sm:px-10 sm:pb-10">
              <div className="relative size-28 shrink-0 overflow-hidden rounded-3xl border-4 border-background bg-neutral-200 shadow-soft-lg sm:size-36">
                {influencer.profilePhoto && (
                  <Image src={influencer.profilePhoto.url} alt={influencer.influencer.name} fill className="object-cover" sizes="144px" />
                )}
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  {influencer.isFeatured && <Badge className="border-transparent bg-amber-500 text-white">Featured</Badge>}
                  {(influencer.badges ?? []).map((b) => {
                    const badgeProps = badgeColorProps(b.color);
                    return (
                      <Badge key={b.key} className={cn("border-transparent", badgeProps.className)} style={badgeProps.style}>
                        {b.label}
                      </Badge>
                    );
                  })}
                  {influencer.categories.map((c) => (
                    <Badge key={c.id} variant="neutral">
                      {c.name}
                    </Badge>
                  ))}
                </div>
                <h1 className="mt-2 flex items-center gap-2 text-h2 font-semibold text-heading">
                  {influencer.influencer.name}
                  {influencer.isVerified && <BadgeCheck className="size-6 shrink-0 text-accent-500" />}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-body">
                  <span>@{influencer.username}</span>
                  <span className="flex items-center gap-1">
                    <Star className="size-3.5 fill-current text-warning-500" />
                    {Number(influencer.ratingAverage).toFixed(1)} ({influencer.ratingCount} reviews)
                  </span>
                  {(influencer.city || influencer.countryCode) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {[influencer.city, influencer.countryCode].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {influencer.languages.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Globe2 className="size-3.5" />
                      {influencer.languages.join(", ")}
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0 sm:pb-1">
                {!flags.bookingsEnabled ? (
                  <p className="max-w-[16rem] text-body-sm text-neutral-500">{flags.bookingsDisabledMessage}</p>
                ) : influencer.availableForBooking ? (
                  <BookingModal
                    username={influencer.username}
                    influencerName={influencer.influencer.name}
                    pricingCards={influencer.pricingCards}
                  />
                ) : (
                  <Button size="lg" disabled>
                    Currently unavailable
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {influencer.bio && (
        <Section className="pt-0">
          <Container>
            <Heading level={2}>About the Creator</Heading>
            <p className="mt-4 max-w-3xl whitespace-pre-wrap text-body-lg text-body">{influencer.bio}</p>
          </Container>
        </Section>
      )}

      {influencer.platforms.length > 0 && (
        <Section className="pt-0">
          <Container>
            <Heading level={2}>Platform analytics</Heading>
            <div className="mt-8">
              <PlatformAnalyticsTabs platforms={influencer.platforms} />
            </div>
          </Container>
        </Section>
      )}

      {influencer.pricingItems.length > 0 && (
        <Section className="pt-0">
          <Container>
            <Heading level={2}>Pricing</Heading>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {influencer.pricingItems.map((item) => (
                <Card key={item.id} className="flex items-center justify-between p-5">
                  <span className="text-body-sm font-medium text-heading">
                    {item.deliverableType.key === "CUSTOM" ? item.customLabel || "Custom package" : item.deliverableType.label}
                  </span>
                  <span className="text-body font-semibold text-accent-600">
                    {item.currency ?? ""} {Number(item.price).toLocaleString()}
                  </span>
                </Card>
              ))}
            </div>
          </Container>
        </Section>
      )}

      <PortfolioGallery items={influencer.portfolioItems} />

      {influencer.pricingCards.length > 0 && (
        <Section className="pt-0">
          <Container>
            <Heading level={2}>Packages</Heading>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {influencer.pricingCards.map((card) => {
                const discountProps = card.discount && discountBadgeColorProps(card.discount.color);
                return (
                <Card key={card.id} className="flex flex-col p-6">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-heading">{card.title}</p>
                    {card.discount && discountProps && (
                      <Badge className={cn("shrink-0 border-transparent", discountProps.className)} style={discountProps.style}>
                        {formatDiscountBadge(card.discount, card.currency)}
                      </Badge>
                    )}
                  </div>
                  {card.isCustomQuote ? (
                    <p className="mt-2 text-h4 font-semibold text-accent-600">Custom Quote</p>
                  ) : card.discount ? (
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-h4 font-semibold text-accent-600">
                        {formatDiscountedPrice({ price: card.price!, currency: card.currency }, card.discount.amountOff)}
                      </p>
                      <p className="text-body-sm text-neutral-400 line-through">
                        {card.currency ?? ""} {Number(card.price).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-h4 font-semibold text-accent-600">
                      {card.currency ?? ""} {Number(card.price).toLocaleString()}
                    </p>
                  )}
                  {card.estimatedDeliveryTime && <p className="mt-1 text-label text-neutral-400">{card.estimatedDeliveryTime}</p>}
                  {card.description && <p className="mt-3 text-body-sm text-body">{card.description}</p>}
                  {card.features.length > 0 && (
                    <ul className="mt-4 space-y-1.5">
                      {card.features.map((feature, i) => (
                        <li key={i} className="text-body-sm text-body">
                          • {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                );
              })}
            </div>
          </Container>
        </Section>
      )}

      {influencer.collaborations.length > 0 && (
        <Section className="pt-0">
          <Container>
            <Heading level={2}>Previous collaborations</Heading>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {influencer.collaborations.map((collab) => (
                <Card key={collab.id} className="p-6">
                  <div className="flex items-center gap-3">
                    {collab.brandLogo && (
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                        <Image src={collab.brandLogo.url} alt={collab.brandName} fill className="object-contain p-1" sizes="40px" />
                      </div>
                    )}
                    <p className="font-medium text-heading">{collab.brandName}</p>
                  </div>
                  {collab.description && <p className="mt-3 text-body-sm text-body">{collab.description}</p>}
                  {collab.resultSummary && <p className="mt-2 text-body-sm font-medium text-accent-600">{collab.resultSummary}</p>}
                </Card>
              ))}
            </div>
          </Container>
        </Section>
      )}

      {faqs.length > 0 && (
        <Section>
          <Container>
            <FaqSection faqs={faqs} title="Frequently asked questions" />
          </Container>
        </Section>
      )}

      {influencer.reviews.length > 0 && (
        <Section className="bg-neutral-50 pt-16">
          <Container>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <Heading level={2}>Reviews</Heading>
              {influencer.ratingCount > 0 && (
                <p className="flex items-center gap-1.5 text-body-sm text-body">
                  <Star className="size-4 fill-current text-warning-500" />
                  <span className="font-medium text-heading">{Number(influencer.ratingAverage).toFixed(1)}</span>
                  <span className="text-neutral-400">
                    ({influencer.ratingCount} review{influencer.ratingCount === 1 ? "" : "s"})
                  </span>
                </p>
              )}
            </div>
          </Container>
          <div className="mt-8">
            <ReviewsMarquee reviews={influencer.reviews} />
          </div>
        </Section>
      )}
    </>
  );
}

export async function generateStaticParams() {
  const { items } = await getInfluencers({ limit: 100 }).catch(() => ({ items: [] }) as never);
  return items.map((i) => ({ username: i.username }));
}
