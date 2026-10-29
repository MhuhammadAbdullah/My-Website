import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Braces, Check, Clock, Package, Plus } from "lucide-react";
import { Badge, Button, Container, Section, Heading, Reveal } from "@agency/ui";
import { getService, getSettings, getTestimonials } from "@/lib/api";
import { servicesPageSchema } from "@agency/types";
import { ReviewsSection } from "@/components/influencer/profile-client";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { CtaBandSection } from "@/components/sections/cta-band";
import { PageHeading } from "@/components/marketing/page-heading";
import { BenefitsAccordion } from "@/components/services/benefits-accordion";
import { env } from "@/lib/env";
import { getBrandName } from "@/lib/branding";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug).catch(() => null);
  if (!service) return {};

  return {
    // `absolute` opts out of the root layout's title template when a real
    // SEO meta title is configured, so it's used exactly as entered instead
    // of having the site name appended. The plain-name fallback keeps the
    // template (e.g. "ServiceName | Brand") since it's not a full SEO title.
    title: service.seo?.metaTitle ? { absolute: service.seo.metaTitle } : service.name,
    description: service.seo?.metaDescription ?? service.tagline,
    alternates: { canonical: `${env.NEXT_PUBLIC_SITE_URL}/services/${service.slug}` },
    openGraph: {
      title: service.seo?.ogTitle ?? service.name,
      description: service.seo?.ogDescription ?? service.tagline,
    },
  };
}

function splitDeliverable(item: string) {
  const match = item.match(/^(.+?)\s+[\u2014\u2013]\s+(.+)$/);
  return match ? { title: match[1] ?? item, description: match[2] ?? "" } : { title: item, description: "" };
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getService(slug).catch(() => null);
  if (!service) notFound();

  const [brand, publicTestimonials, settings] = await Promise.all([
    getBrandName(),
    getTestimonials().catch(() => []),
    getSettings().catch(() => null),
  ]);
  const serviceNameParts = service.name.trim().split(/\s+/);
  const accentWord = serviceNameParts.pop() ?? service.name;
  const serviceNameLead = serviceNameParts.join(" ");
  const sections = service.detailSections ?? {};
  const reviewSettings = servicesPageSchema.parse(settings?.services_page ?? {}).reviews;
  const overviewHeading = sections.overviewHeading?.trim() ?? "";
  const overviewDescription = sections.overviewDescription?.trim() ?? service.description.trim();
  const hasOverviewCardsConfig = sections.overviewCards !== undefined;
  const overviewCards = hasOverviewCardsConfig ? sections.overviewCards! : service.benefits.slice(0, 2).map(splitDeliverable);
  const legacyBenefitItems = hasOverviewCardsConfig ? service.benefits : service.benefits.slice(2);
  const benefitsAccordionItems = sections.benefitItems !== undefined
    ? sections.benefitItems.map((item) => ({ title: item.title, description: item.description || "Included as part of your service." }))
    : legacyBenefitItems.map((benefit) => {
        const parsed = splitDeliverable(benefit);
        return { title: parsed.title, description: parsed.description || "Included as part of your service." };
      });
  const benefitsHeading = sections.benefitsHeading?.trim() ?? "";
  const benefitsDescription = sections.benefitsDescription?.trim() ?? "";
  const scopeItems = sections.scopeItems ?? [];
  const scopeHeading = sections.scopeHeading?.trim() ?? "";
  const scopeDescription = sections.scopeDescription?.trim() ?? "";
  const processHeading = sections.processHeading?.trim() ?? "";
  const processDescription = sections.processDescription?.trim() ?? "";
  const deliverablesHeading = sections.deliverablesHeading?.trim() ?? "";
  const deliverablesDescription = sections.deliverablesDescription?.trim() ?? "";
  const deliverableItems = (sections.deliverableItems ?? service.deliverables.map(splitDeliverable)).filter((item) => item.title.trim());
  const pricingHeading = sections.pricingHeading?.trim() ?? "";
  const pricingDescription = sections.pricingDescription?.trim() ?? "";
  const reviewsHeading = sections.reviewsHeading?.trim() ?? "";
  const reviewsDescription = sections.reviewsDescription?.trim() ?? "";
  const reviews = publicTestimonials
    .filter((item) => item.quote && item.author)
    .map((item) => ({
      id: item.id,
      authorName: item.author,
      authorCompany: item.company ?? item.role ?? null,
      rating: item.rating ?? 5,
      comment: item.quote,
      createdAt: (item as { createdAt?: string }).createdAt ?? "",
      logoUrl: item.avatar?.url ?? null,
    }));
  const reviewAverage = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const hasOverviewContent = Boolean(overviewHeading || overviewDescription || overviewCards.length);
  const hasBenefitsContent = Boolean(benefitsHeading || benefitsDescription || benefitsAccordionItems.length);
  const hasScopeContent = Boolean(scopeHeading || scopeDescription || scopeItems.length);
  const processSteps = service.process.filter((step) => step.title.trim());
  const hasProcessContent = Boolean(processHeading || processDescription || processSteps.length);
  const hasDeliverablesContent = Boolean(deliverablesHeading || deliverablesDescription || deliverableItems.length);
  const hasReviewsContent = Boolean(reviewsHeading || reviewsDescription || reviews.length);
  const hasDetailContent = hasOverviewContent || hasBenefitsContent || hasScopeContent || hasProcessContent || hasDeliverablesContent;
  const hasNavigationContent = hasDetailContent || service.pricingPlans.length > 0 || hasReviewsContent;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.tagline,
    ...(brand ? { provider: { "@type": "Organization", name: brand } } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Section className="pb-4 pt-4 md:pb-8">
        <Container>
          <PageHeading
            breadcrumb={[{ label: "Home", href: "/" }, { label: "Services", href: "/services" }, { label: service.name }]}
          >
            {service.category && <Badge variant="accent">{service.category.name}</Badge>}
            <Heading level={1} className="mt-4 max-w-4xl leading-[0.98] tracking-[-0.045em]" style={{ fontSize: "clamp(2.75rem, 4.5vw, 4.75rem)" }}>
              {serviceNameLead && <>{serviceNameLead} </>}
              <span className="text-heading">{accentWord}</span>
            </Heading>
            <p className="mt-5 max-w-2xl text-body text-neutral-500 md:text-body-lg">{service.description}</p>
            <Button asChild size="lg" className="mt-7">
              <Link href="/contact" className="inline-flex items-center gap-2">Start this project <ArrowRight className="size-4" /></Link>
            </Button>
          </PageHeading>
        </Container>
      </Section>

      <Section className="py-5 md:py-8">
        <Container>
          <div className="grid gap-6 rounded-[var(--radius-xl)] border border-neutral-200 bg-surface p-5 md:grid-cols-[minmax(15rem,0.8fr)_minmax(0,2fr)] md:items-center md:p-6">
            <div className="flex items-center gap-4 md:border-r md:border-neutral-200 md:pr-8">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-50 text-accent-800">
                <Clock className="size-5" />
              </span>
              <div>
                <p className="font-mono text-label uppercase tracking-[0.12em] text-neutral-400">Estimated timeline</p>
                <p className="mt-1 font-heading text-h4 font-bold text-heading">{service.timeline}</p>
              </div>
            </div>
            <div>
              <p className="mb-3 flex items-center gap-2 font-mono text-label uppercase tracking-[0.12em] text-neutral-400">
                <Braces className="size-4 text-accent-700" /> Technologies used
              </p>
              <div className="flex flex-wrap gap-2">
                {service.technologies.map((tech) => (
                  <Badge key={tech.id} variant="neutral">{tech.name}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </Section>

      {hasNavigationContent && <Section className="py-3 md:py-5" aria-label="Service page navigation">
        <Container>
          <nav className="flex gap-6 overflow-x-auto border-y border-neutral-200 py-4 text-label text-neutral-500" aria-label="On this page">
            {hasOverviewContent && <a href="#overview" className="shrink-0 transition-colors hover:text-heading">Overview</a>}
            {hasBenefitsContent && <a href="#benefits" className="shrink-0 transition-colors hover:text-heading">Benefits</a>}
            {hasScopeContent && <a href="#scope" className="shrink-0 transition-colors hover:text-heading">Scope</a>}
            {hasProcessContent && <a href="#process" className="shrink-0 transition-colors hover:text-heading">Process</a>}
            {hasDeliverablesContent && <a href="#deliverables" className="shrink-0 transition-colors hover:text-heading">Deliverables</a>}
            {service.pricingPlans.length > 0 && <a href="#pricing" className="shrink-0 transition-colors hover:text-heading">Pricing</a>}
            {hasReviewsContent && <a href="#reviews" className="shrink-0 transition-colors hover:text-heading">Reviews</a>}
          </nav>
        </Container>
      </Section>}

      {hasDetailContent && <Section id="overview" className="py-12 md:py-16">
        <Container className="grid gap-x-12 gap-y-12 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-14">
            {hasOverviewContent && (
            <div className="lg:col-span-2">
              <div>
                <div>
                  {overviewHeading && <Heading level={2} className="text-left" style={{ fontSize: "clamp(2rem, 1rem + 3vw, 3.5rem)" }}>{overviewHeading}</Heading>}
                  {overviewDescription && <p className="mt-3 max-w-3xl text-left text-body text-neutral-500">{overviewDescription}</p>}
                </div>
              </div>
              {overviewCards.length > 0 && <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {overviewCards.map((card, i) => {
                  return (
                    <Reveal
                      key={`${card.title}-${i}`}
                      as="li"
                      delay={Math.min(i * 0.06, 0.3)}
                      className="group flex min-h-40 flex-col rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-500/50 hover:shadow-soft-md md:p-6"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex size-12 items-center justify-center rounded-[var(--radius-md)] border border-accent-200 bg-accent-50 text-accent-800 transition-colors group-hover:bg-accent-100">
                          <Check className="size-6" strokeWidth={1.8} />
                        </span>
                      </div>
                      <h3 className="mt-4 font-heading text-body font-bold leading-snug text-heading">{card.title}</h3>
                      {card.description && <p className="mt-2 text-body-sm leading-relaxed text-neutral-500">{card.description}</p>}
                    </Reveal>
                  );
                })}
              </ul>}
            </div>
            )}

            {hasBenefitsContent && (
              <div id="benefits" className="lg:col-span-2 scroll-mt-24">
                <div className="max-w-3xl">
                  {benefitsHeading && <Heading level={2} className="text-left" style={{ fontSize: "clamp(2rem, 1rem + 3vw, 3.5rem)" }}>{benefitsHeading}</Heading>}
                  {benefitsDescription && <p className="mt-3 text-left text-body text-neutral-500">{benefitsDescription}</p>}
                </div>
                {benefitsAccordionItems.length > 0 && <div className="mt-6"><BenefitsAccordion items={benefitsAccordionItems} /></div>}
              </div>
            )}

            {hasScopeContent && (
              <div id="scope" className="lg:col-span-2 scroll-mt-24">
                <div className="mb-6 max-w-3xl">
                  {scopeHeading && <Heading level={2} className="text-left" style={{ fontSize: "clamp(2rem, 1rem + 3vw, 3.5rem)" }}>{scopeHeading}</Heading>}
                  {scopeDescription && <p className="mt-3 text-left text-body text-neutral-500">{scopeDescription}</p>}
                </div>
                {scopeItems.length > 0 && <div className="divide-y divide-neutral-200 border-y border-neutral-200">
                  {scopeItems.map((item, i) => (
                    <details key={`${item.title}-${i}`} className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-4 py-5 marker:hidden">
                        <span className="w-8 shrink-0 font-mono text-label text-neutral-400">{String(i + 1).padStart(2, "0")}</span>
                        <span className="flex-1 font-heading text-h4 font-bold text-heading">{item.title}</span>
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition-colors group-open:border-accent-500 group-open:bg-accent-500 group-open:text-on-accent"><Plus className="size-4 transition-transform group-open:rotate-45" /></span>
                      </summary>
                      <p className="mb-5 ml-12 max-w-3xl text-left text-body-sm leading-relaxed text-neutral-500">{item.description}</p>
                    </details>
                  ))}
                </div>}
              </div>
            )}

            {hasProcessContent && <div id="process" className="lg:col-span-2 scroll-mt-24 rounded-[var(--radius-xl)] bg-[#171717] p-5 sm:p-7 lg:p-8">
              <div className="flex flex-col items-start gap-4 border-b border-white/10 pb-6">
                <div className="max-w-3xl">
                  {processHeading && <Heading level={2} className="text-left !text-white" style={{ fontSize: "clamp(2rem, 1rem + 3vw, 3.5rem)" }}>{processHeading}</Heading>}
                  {processDescription && <p className="mt-3 text-left text-body-sm text-[#aab4c8]">{processDescription}</p>}
                </div>
              </div>
              <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {processSteps.map((step, i) => (
                  <Reveal
                    key={step.title}
                    as="li"
                    delay={Math.min(i * 0.06, 0.3)}
                    className="group flex min-h-44 flex-col rounded-[var(--radius-lg)] border border-white/10 bg-[#202020] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-500/60 hover:bg-[#242424] md:p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex size-9 items-center justify-center rounded-[var(--radius-md)] bg-[#34231b] text-[color:var(--accent)] transition-colors group-hover:bg-[#40291f]">
                        <ArrowRight className="size-4" strokeWidth={1.8} />
                      </span>
                      <span className="font-mono text-label text-white/55">{String(i + 1).padStart(2, "0")}</span>
                    </div>
                    <h3 className="mt-4 font-heading text-body font-bold leading-snug text-white">{step.title}</h3>
                    <p className="mt-2 text-body-sm leading-relaxed text-[#aab4c8]">{step.description}</p>
                  </Reveal>
                ))}
              </ol>
            </div>}

            {hasDeliverablesContent && <div id="deliverables" className="lg:col-span-2 scroll-mt-24">
              <div className="flex items-end justify-between gap-4">
                <div>
                  {deliverablesHeading && <Heading level={2} className="text-left" style={{ fontSize: "clamp(2rem, 1rem + 3vw, 3.5rem)" }}>{deliverablesHeading}</Heading>}
                  {deliverablesDescription && <p className="mt-3 max-w-3xl text-left text-body text-neutral-500">{deliverablesDescription}</p>}
                </div>
              </div>
              {deliverableItems.length > 0 && <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {deliverableItems.map((item, i) => {
                  const { title, description } = item;
                  return (
                    <Reveal
                      key={`${title}-${i}`}
                      as="li"
                      delay={Math.min(i * 0.05, 0.3)}
                      className="group flex min-h-40 flex-col rounded-[var(--radius-lg)] border border-neutral-200 bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-500/50 hover:shadow-soft-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex size-12 items-center justify-center rounded-[var(--radius-md)] border border-accent-200 bg-accent-50 text-accent-800 transition-colors group-hover:bg-accent-100">
                          <Package className="size-6" strokeWidth={1.8} />
                        </span>
                      </div>
                      <h3 className="mt-4 font-heading text-body font-bold leading-snug text-heading">{title}</h3>
                      {description && <p className="mt-2 text-body-sm leading-relaxed text-neutral-500">{description}</p>}
                    </Reveal>
                  );
                })}
              </ul>}
            </div>}
        </Container>
      </Section>}

      {service.pricingPlans.length > 0 && (
        <Section id="pricing" className="scroll-mt-24 bg-background">
          <Container>
            <div className="mx-auto mb-8 max-w-3xl text-center">
              {pricingHeading && <Heading level={2} className="text-center">{pricingHeading}</Heading>}
              {pricingDescription && <p className="mt-3 text-center text-body text-neutral-500">{pricingDescription}</p>}
            </div>
            <div className="mt-10">
              <PricingGrid plans={service.pricingPlans} />
            </div>
          </Container>
        </Section>
      )}

      {hasReviewsContent && <Section id="reviews" className="scroll-mt-24">
        <Container>
          <ReviewsSection
            reviews={reviews}
            average={reviewAverage}
            count={reviews.length}
            target={{ kind: "service" }}
            name={service.name}
            heading={{ fontSize: "clamp(2rem, 1.5rem + 2.7vw, 4rem)", textAlign: "left" }}
            description={reviewsDescription}
            labels={{ ...reviewSettings, heading: reviewsHeading || reviewSettings.heading }}
            marquee={reviewSettings.marquee}
          />
        </Container>
      </Section>}

      <CtaBandSection
        content={{
          heading: sections.ctaHeading || "Your next chapter starts with a better service.",
          body: sections.ctaDescription || "Tell us about your project and we’ll help you plan the right next step.",
          button: { label: sections.ctaButtonLabel || "Tell us about your project", href: sections.ctaButtonHref || "/contact" },
        }}
      />
    </>
  );
}
