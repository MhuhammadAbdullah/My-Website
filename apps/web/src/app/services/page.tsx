import type { Metadata } from "next";
import { Container, Section, Heading, Reveal } from "@agency/ui";
import { getPageSeo, getServices, getServicesPageContent } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";
import { EMPTY_SERVICES_PAGE_CONTENT } from "@/lib/fallbacks";
import { ServiceCard } from "@/components/marketing/service-card";
import { CtaSection } from "@/components/marketing/cta-section";
import { PageHeading } from "@/components/marketing/page-heading";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getPageSeo("services").catch(() => null);
  return buildPageMetadata({
    seo,
    fallbackTitle: "Services",
    fallbackDescription: "Web development, product design, and growth engineering services from MAB Digital.",
  });
}

export default async function ServicesPage() {
  const [services, content] = await Promise.all([
    withFallback(getServices(), [], "services"),
    withFallback(getServicesPageContent(), null, "services page content").then(
      (item) => item ?? EMPTY_SERVICES_PAGE_CONTENT,
    ),
  ]);

  return (
    <>
      <Section className="pb-0">
        <Container>
          <PageHeading breadcrumb={[{ label: "Home", href: "/" }, { label: "Services" }]}>
            <Heading level={1} display>
              {content.heroHeading}
            </Heading>
            <p className="mt-5 text-body-lg text-body">{content.heroDescription}</p>
          </PageHeading>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => (
              <Reveal key={service.id} delay={i * 0.05}>
                <ServiceCard service={service} />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <CtaSection />
        </Container>
      </Section>
    </>
  );
}
