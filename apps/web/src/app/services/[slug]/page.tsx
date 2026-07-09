import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, Clock, Package } from "lucide-react";
import { Badge, Button, Container, Section, Heading } from "@agency/ui";
import { getService, getServices } from "@/lib/api";
import { PricingGrid } from "@/components/marketing/pricing-grid";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { FaqSection } from "@/components/marketing/faq-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { ServiceCard } from "@/components/marketing/service-card";
import { PageHeading } from "@/components/marketing/page-heading";
import { env } from "@/lib/env";

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

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getService(slug).catch(() => null);
  if (!service) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.tagline,
    provider: { "@type": "Organization", name: "MAB Digital" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Section className="pb-0">
        <Container>
          <PageHeading
            breadcrumb={[{ label: "Home", href: "/" }, { label: "Services", href: "/services" }, { label: service.name }]}
          >
            {service.category && <Badge variant="accent">{service.category.name}</Badge>}
            <Heading level={1} display className="mt-4">
              {service.name}
            </Heading>
            <p className="mt-5 text-body-lg text-body">{service.description}</p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/contact">Start this project</Link>
            </Button>
          </PageHeading>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-12 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-14">
            <div>
              <Heading level={2}>Benefits</Heading>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {service.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 rounded-2xl border border-neutral-200 p-4">
                    <Check className="mt-0.5 size-5 shrink-0 text-accent-500" />
                    <span className="text-body-sm text-heading">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <Heading level={2}>Our process</Heading>
              <ol className="mt-6 space-y-6">
                {service.process.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="font-mono text-label text-accent-500">0{i + 1}</span>
                    <div>
                      <p className="font-semibold text-heading">{step.title}</p>
                      <p className="mt-1 text-body-sm text-body">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <Heading level={2}>Deliverables</Heading>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {service.deliverables.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-body-sm text-body">
                    <Package className="size-4 text-neutral-400" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="h-fit space-y-6">
            <div className="space-y-6 rounded-2xl border border-neutral-200 p-6">
              <div>
                <p className="flex items-center gap-2 font-mono text-label uppercase text-neutral-400">
                  <Clock className="size-4" /> Timeline
                </p>
                <p className="mt-1 text-body font-medium text-heading">{service.timeline}</p>
              </div>
              <div>
                <p className="font-mono text-label uppercase text-neutral-400">Technologies used</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {service.technologies.map((tech) => (
                    <Badge key={tech.id} variant="neutral">
                      {tech.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </Container>
      </Section>

      {service.pricingPlans.length > 0 && (
        <Section className="bg-neutral-50">
          <Container>
            <Heading level={2} className="text-center">
              Pricing
            </Heading>
            <div className="mt-10">
              <PricingGrid plans={service.pricingPlans} />
            </div>
          </Container>
        </Section>
      )}

      {service.testimonials.length > 0 && (
        <Section>
          <Container>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {service.testimonials.map((testimonial) => (
                <TestimonialCard key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>
          </Container>
        </Section>
      )}

      <Section className="bg-neutral-50">
        <Container>
          <FaqSection faqs={service.faqs} title="Questions about this service" />
        </Container>
      </Section>

      {service.relatedTo.length > 0 && (
        <Section>
          <Container>
            <Heading level={2}>Related services</Heading>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {service.relatedTo.map((related) => (
                <ServiceCard key={related.id} service={related} />
              ))}
            </div>
          </Container>
        </Section>
      )}

      <Section className="pt-0">
        <Container>
          <CtaSection />
        </Container>
      </Section>
    </>
  );
}

export async function generateStaticParams() {
  const services = await getServices().catch(() => []);
  return services.map((s) => ({ slug: s.slug }));
}
