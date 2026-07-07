import type { Metadata } from "next";
import { Container, Section } from "@agency/ui";
import {
  getAboutContent,
  getFaqs,
  getHomeContent,
  getHomeProcessSteps,
  getHomeStats,
  getHomeWhyReasons,
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
  const seo = home?.seo;
  if (!seo) return {};

  return {
    // `absolute` opts out of the root layout's title template ("%s | Brand")
    // -- an admin-configured meta title is meant to be used exactly as
    // entered, not have the site name silently appended to it.
    title: { absolute: seo.metaTitle },
    description: seo.metaDescription,
    keywords: seo.keywords.length > 0 ? seo.keywords : undefined,
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    robots: seo.robots,
    openGraph: {
      title: seo.ogTitle ?? seo.metaTitle,
      description: seo.ogDescription ?? seo.metaDescription,
      images: seo.ogImage ? [{ url: seo.ogImage.url }] : undefined,
    },
    twitter: {
      card: (seo.twitterCard as "summary" | "summary_large_image") ?? "summary_large_image",
      title: seo.twitterTitle ?? seo.ogTitle ?? seo.metaTitle,
      description: seo.twitterDescription ?? seo.ogDescription ?? seo.metaDescription,
      images: seo.twitterImage ? [seo.twitterImage.url] : seo.ogImage ? [seo.ogImage.url] : undefined,
    },
  };
}

export default async function HomePage() {
  const [home, stats, about, services, projectsPage, technologies, testimonials, faqs, processSteps, whyReasons] = await Promise.all([
    getHomeContent(),
    getHomeStats(),
    getAboutContent(),
    getServices(),
    getProjects({ pageSize: 3 }),
    getTechnologies(),
    getTestimonials(),
    getFaqs("GENERAL"),
    getHomeProcessSteps(),
    getHomeWhyReasons(),
  ]);

  return (
    <>
      <Hero content={home} />

      <Container>
        <Stats stats={stats} />
      </Container>

      <Section>
        <Container>
          <AboutPreview about={about} stats={stats} />
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
          <Process steps={processSteps} />
        </Container>
      </Section>

      <Section>
        <Container>
          <Technologies technologies={technologies} />
        </Container>
      </Section>

      <Section className="bg-neutral-50">
        <Container>
          <WhyWorkWithMe reasons={whyReasons} />
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
          <CtaSection
            headline={home.contactCtaHeading ?? undefined}
            subheadline={home.contactCtaDescription ?? undefined}
            ctaLabel={home.contactCtaButtonText ?? undefined}
            ctaHref={home.contactCtaButtonHref ?? undefined}
          />
        </Container>
      </Section>
    </>
  );
}
