import type { Metadata } from "next";
import { Container, Section } from "@agency/ui";
import {
  getAboutContent,
  getFaqs,
  getHomeContent,
  getProjects,
  getServices,
  getTechnologies,
  getTestimonials,
} from "@/lib/api";
import { Hero } from "@/components/home/hero";
import { Stats } from "@/components/home/stats";
import { AboutPreview } from "@/components/home/about-preview";
import { ServicesPreview } from "@/components/home/services-preview";
import { PortfolioPreview } from "@/components/home/portfolio-preview";
import { Process } from "@/components/home/process";
import { Technologies } from "@/components/home/technologies";
import { WhyWorkWithMe } from "@/components/home/why-work-with-me";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { FaqSection } from "@/components/marketing/faq-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { Reveal, Heading } from "@agency/ui";

export async function generateMetadata(): Promise<Metadata> {
  const home = await getHomeContent().catch(() => null);
  if (!home?.seo) return {};

  return {
    title: home.seo.metaTitle,
    description: home.seo.metaDescription,
  };
}

export default async function HomePage() {
  const [home, about, services, projectsPage, technologies, testimonials, faqs] = await Promise.all([
    getHomeContent(),
    getAboutContent(),
    getServices(),
    getProjects({ pageSize: 3 }),
    getTechnologies(),
    getTestimonials(),
    getFaqs("GENERAL"),
  ]);

  return (
    <>
      <Hero content={home} />

      <Container>
        <Stats stats={home.stats} />
      </Container>

      <Section>
        <Container>
          <AboutPreview about={about} />
        </Container>
      </Section>

      <Section className="bg-neutral-50">
        <Container>
          <ServicesPreview services={services} />
        </Container>
      </Section>

      <Section>
        <Container>
          <PortfolioPreview projects={projectsPage.items} />
        </Container>
      </Section>

      <Section className="bg-neutral-50">
        <Container>
          <Process />
        </Container>
      </Section>

      <Section>
        <Container>
          <Technologies technologies={technologies} />
        </Container>
      </Section>

      <Section className="bg-neutral-50">
        <Container>
          <WhyWorkWithMe />
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <Heading level={2} className="text-center">
              What clients **say**
            </Heading>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.slice(0, 6).map((testimonial, i) => (
              <Reveal key={testimonial.id} delay={i * 0.05}>
                <TestimonialCard testimonial={testimonial} />
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-neutral-50">
        <Container>
          <FaqSection faqs={faqs} />
        </Container>
      </Section>

      <Section>
        <Container>
          <CtaSection />
        </Container>
      </Section>
    </>
  );
}
