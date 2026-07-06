import type { Metadata } from "next";
import { Container, Section, Heading, Reveal } from "@agency/ui";
import { getServices } from "@/lib/api";
import { ServiceCard } from "@/components/marketing/service-card";
import { CtaSection } from "@/components/marketing/cta-section";
import { PageHeading } from "@/components/marketing/page-heading";

export const metadata: Metadata = {
  title: "Services",
  description: "Web development, product design, and growth engineering services from Calibre Digital.",
};

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <>
      <Section className="pb-0">
        <Container>
          <PageHeading breadcrumb={[{ label: "Home", href: "/" }, { label: "Services" }]}>
            <Heading level={1} display>
              Services built to **ship**, not just to pitch.
            </Heading>
            <p className="mt-5 text-body-lg text-body">
              Every engagement is scoped, fixed-price by default, and comes with an admin panel so you can
              keep it running long after we hand it off.
            </p>
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
