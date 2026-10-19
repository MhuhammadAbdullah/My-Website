import type { Metadata } from "next";
import { Breadcrumb, Container, Heading, Reveal } from "@agency/ui";
import { getPageSeo, getServices, getServicesPageContent, getSettings, getTestimonials } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";
import { EMPTY_SERVICES_PAGE_CONTENT } from "@/lib/fallbacks";
import { buildPageMetadata } from "@/lib/seo";
import { getBrandName } from "@/lib/branding";

export async function generateMetadata(): Promise<Metadata> {
  const [seo, brand] = await Promise.all([getPageSeo("services").catch(() => null), getBrandName()]);
  return buildPageMetadata({
    seo,
    fallbackTitle: "Services",
    fallbackDescription: `Web development, product design, and growth engineering services${brand ? ` from ${brand}` : ""}.`,
  });
}

import { servicesPageSchema } from "@agency/types";
import { cn } from "@agency/ui";
import { CurrencyProvider } from "@/components/services/currency-context";
import { ServicesExplorer, type ExplorerService } from "@/components/services/services-explorer";
import { ServicesEstimator } from "@/components/services/services-estimator";
import { ReviewsSection } from "@/components/influencer/profile-client";

export default async function ServicesPage() {
  const [services, content, settings, testimonials] = await Promise.all([
    withFallback(getServices(), [], "services"),
    withFallback(getServicesPageContent(), null, "services page content").then((item) => item ?? EMPTY_SERVICES_PAGE_CONTENT),
    withFallback(getSettings(), {}, "site settings"),
    withFallback(getTestimonials(), [], "testimonials"),
  ]);

  // Everything under the hero is managed in Admin > Services > Page Sections.
  const cfg = servicesPageSchema.parse(settings.services_page ?? {});

  const rows: ExplorerService[] = services.map((s) => {
    // Cheapest real price among the plans (custom quotes have none).
    const priced = s.pricingPlans
      .filter((p) => !p.isCustomQuote)
      .map((p) => ({ amount: p.discountPrice ?? p.regularPrice, currency: p.currency, perMonth: p.billingType === "MONTHLY" }))
      .filter((p): p is { amount: number; currency: string; perMonth: boolean } => typeof p.amount === "number")
      .sort((a, b) => a.amount - b.amount);
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      category: s.category?.name ?? "",
      description: s.tagline || s.description || "",
      timeline: s.timeline ?? "",
      benefits: s.benefits ?? [],
      image: s.heroMedia ? { url: s.heroMedia.url, alt: s.heroMedia.altText ?? s.name } : null,
      price: priced[0] ?? null,
    };
  });

  const { engagement, estimate } = cfg;

  // Reviews of our service: everything visitors submit is live at once; staff only hide/show it in Admin > Testimonials.
  const reviews = testimonials
    .filter((t) => t.quote && t.author)
    .map((t) => ({
      id: t.id,
      authorName: t.author,
      authorCompany: t.company ?? t.role ?? null,
      rating: t.rating ?? 5,
      comment: t.quote,
      createdAt: (t as { createdAt?: string }).createdAt ?? "",
      logoUrl: t.avatar?.url ?? null,
    }));
  const reviewAverage = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;

  return (
    <CurrencyProvider rates={cfg.currencies} initial={settings.currency ?? cfg.currencies[0]?.code ?? ""}>
      <section className="pb-10 pt-4">
        <Container>
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Services" }]} />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
            <Heading level={1} className="text-[clamp(2.75rem,0.5rem+6.4vw,7rem)] whitespace-nowrap max-sm:whitespace-normal">
              {content.heroHeading}
            </Heading>
            {content.heroDescription && <p className="text-body text-neutral-500 lg:pt-6">{content.heroDescription}</p>}
          </div>
        </Container>
      </section>

      <section>
        <Container>
          <ServicesExplorer services={rows} labels={cfg.labels} />
        </Container>
      </section>

      {engagement.models.length > 0 && (
        <section className="py-[var(--spacing-section)]">
          <Container>
            <Reveal>
              {engagement.heading && <Heading level={2}>{engagement.heading}</Heading>}
              {engagement.intro && <p className="mt-3 text-body-sm text-neutral-500">{engagement.intro}</p>}
            </Reveal>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {engagement.models.map((m, i) => (
                <Reveal key={i} delay={i * 0.06}>
                  <div className={cn("h-full rounded-[var(--radius-xl)] border p-6", m.highlighted ? "border-transparent bg-accent-500 text-on-accent" : "border-neutral-200 bg-surface")}>
                    {m.label && <p className={cn("font-mono text-label uppercase tracking-[0.1em]", m.highlighted ? "text-on-accent" : "text-neutral-400")}>{m.label}</p>}
                    {m.title && <h3 className={cn("mt-3 font-heading text-h3 font-extrabold", m.highlighted ? "text-on-accent" : "text-heading")}>{m.title}</h3>}
                    {m.description && <p className={cn("mt-3 text-body-sm", m.highlighted ? "text-on-accent" : "text-neutral-500")}>{m.description}</p>}
                  </div>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {estimate.heading && rows.length > 0 && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            <ServicesEstimator
              services={rows.map((r) => ({ id: r.id, name: r.name, price: r.price ? { amount: r.price.amount, currency: r.price.currency } : null }))}
              heading={estimate.heading}
              intro={estimate.intro}
              cardLabel={estimate.cardLabel}
              note={estimate.note}
              emptyText={estimate.emptyText}
              button={estimate.button}
            />
          </Container>
        </section>
      )}
      <section className="pb-[var(--spacing-section)]">
        <Container>
          <ReviewsSection
            reviews={reviews}
            average={reviewAverage}
            count={reviews.length}
            target={{ kind: "service" }}
            name=""
            heading={{ fontSize: "clamp(1.75rem, 1rem + 2.6vw, 3.75rem)" }}
            labels={cfg.reviews}
            marquee={cfg.reviews.marquee}
          />
        </Container>
      </section>
    </CurrencyProvider>
  );
}
