import type { Metadata } from "next";
import { Github, Linkedin, Twitter } from "lucide-react";
import { Container, Section, Heading, Reveal, Avatar, AvatarFallback, AvatarImage, DynamicIcon, cn } from "@agency/ui";
import { getAboutContent, getAboutTeamData, getSettings, getTechnologies } from "@/lib/api";
import { FaqSection } from "@/components/marketing/faq-section";
import { getFaqs } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";
import { EMPTY_ABOUT_CONTENT, EMPTY_ABOUT_TEAM_DATA } from "@/lib/fallbacks";
import { CtaSection } from "@/components/marketing/cta-section";
import { PageHeading } from "@/components/marketing/page-heading";
import { cloudinaryTransform } from "@/lib/cloudinary";
import { Technologies } from "@/components/home/technologies";

export async function generateMetadata(): Promise<Metadata> {
  const about = await getAboutContent().catch(() => null);
  const seo = about?.seo;
  if (!seo) {
    return { title: "About", description: "The story, mission, values, and team behind MAB Digital." };
  }

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

const socialIcons = { twitter: Twitter, linkedin: Linkedin, github: Github } as const;

export default async function AboutPage() {
  const [about, teamData, technologies, faqs, settings] = await Promise.all([
    withFallback(getAboutContent(), EMPTY_ABOUT_CONTENT, "about content"),
    withFallback(getAboutTeamData(), EMPTY_ABOUT_TEAM_DATA, "about team data"),
    withFallback(getTechnologies(), [], "technologies"),
    withFallback(getFaqs("GENERAL"), [], "faqs"),
    withFallback(getSettings(), {}, "settings"),
  ]);

  return (
    <>
      <Section className="pb-0">
        <Container>
          <PageHeading breadcrumb={[{ label: "Home", href: "/" }, { label: "About" }]}>
            <Heading level={1} display>
              {about.heroHeading ?? "Our **story**, in plain terms."}
            </Heading>
            <p className="mt-5 text-body-lg text-body">{about.story}</p>
          </PageHeading>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 p-6">
            <Heading level={3}>{about.missionLabel ?? "Mission"}</Heading>
            <p className="mt-2 text-body-sm text-body">{about.mission}</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 p-6">
            <Heading level={3}>{about.visionLabel ?? "Vision"}</Heading>
            <p className="mt-2 text-body-sm text-body">{about.vision}</p>
          </div>
          <div className="rounded-2xl bg-neutral-950 p-6 text-white">
            <Heading level={3} className="text-white">
              {about.philosophyLabel ?? "Philosophy"}
            </Heading>
            <p className="mt-2 text-body-sm text-neutral-300">{about.philosophy}</p>
          </div>
        </Container>
      </Section>

      <Section className="bg-neutral-50">
        <Container>
          <Heading level={2} className="text-center">
            {about.valuesHeading ?? "Core **values**"}
          </Heading>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {teamData.values.map((value, i) => (
              <Reveal key={value.id} delay={i * 0.06} className="rounded-2xl border border-neutral-200 p-6">
                <DynamicIcon name={value.icon} size={24} className="text-accent-500" fallback="award" />
                <h3 className="mt-4 text-h4 font-semibold text-heading">{value.title}</h3>
                <p className="mt-2 text-body-sm text-body">{value.description}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <Heading level={2}>{about.timelineHeading ?? "Our **timeline**"}</Heading>
          <ol className="mt-10 space-y-8 border-l border-neutral-200 pl-8">
            {teamData.timeline.map((event) => (
              <li key={event.id} className="relative">
                <span className="absolute -left-[2.35rem] top-1 flex size-4 items-center justify-center rounded-full bg-accent-500 ring-4 ring-background" />
                <p className="font-mono text-label text-accent-600">{event.year}</p>
                <h3 className="mt-1 text-h4 font-semibold text-heading">{event.title}</h3>
                <p className="mt-1 text-body-sm text-body">{event.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section className="bg-neutral-50">
        <Container>
          <Heading level={2} className="text-center">
            {about.teamHeading ?? "Meet the **team**"}
          </Heading>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {teamData.team.map((member) => (
              <div key={member.id} className="rounded-2xl border border-neutral-200 bg-background p-6 text-center">
                <Avatar className="mx-auto size-20 sm:size-24 lg:size-28">
                  {member.avatar && (
                    <AvatarImage
                      src={cloudinaryTransform(member.avatar.url, "f_auto,q_auto,w_224,h_224,c_fill,g_face")}
                      alt={member.name}
                    />
                  )}
                  <AvatarFallback className="text-h3 font-semibold">{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <h3 className="mt-5 font-semibold text-heading">{member.name}</h3>
                <p className="text-body-sm text-neutral-500">{member.role}</p>
                <p className="mt-2 text-body-sm text-body">{member.bio}</p>
                {member.socials && (
                  <div className="mt-4 flex justify-center gap-2">
                    {Object.entries(member.socials).map(([key, href]) => {
                      const Icon = socialIcons[key as keyof typeof socialIcons];
                      if (!Icon || !href) return null;
                      return (
                        <a key={key} href={href} target="_blank" rel="noreferrer" className="text-neutral-400 hover:text-heading">
                          <Icon className="size-4" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {about.certificationsEnabled && teamData.certifications.length > 0 && (
        <Section>
          <Container>
            <Heading level={2} className="text-center">
              {about.certificationsHeading ?? "Certifications"}
            </Heading>
            <div className="relative mt-16">
              <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-neutral-200 lg:block" />
              <div className="space-y-12 lg:space-y-20">
                {teamData.certifications.map((cert, i) => {
                  const imageFirst = i % 2 !== 0;
                  return (
                    <Reveal
                      key={cert.id}
                      delay={i * 0.06}
                      className="relative grid items-center gap-6 lg:grid-cols-2 lg:gap-16"
                    >
                      <span className="absolute left-1/2 top-1/2 z-10 hidden size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-500 ring-4 ring-background lg:block" />

                      <div className={cn("order-2", imageFirst ? "lg:order-1" : "lg:order-2")}>
                        {cert.image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, not a static asset
                          <img
                            src={cloudinaryTransform(cert.image.url, "f_auto,q_auto,w_800,h_500,c_fill")}
                            alt={cert.name}
                            className="aspect-[8/5] w-full rounded-2xl border border-neutral-200 object-cover"
                          />
                        ) : (
                          <div className="aspect-[8/5] w-full rounded-2xl border border-dashed border-neutral-200 bg-neutral-50" />
                        )}
                      </div>

                      <div className={cn("order-1", imageFirst ? "lg:order-2" : "lg:order-1")}>
                        <p className="font-mono text-label text-accent-600">{cert.issuer} · {cert.year}</p>
                        <h3 className="mt-2 text-h4 font-semibold text-heading">{cert.name}</h3>
                        {cert.description && <p className="mt-3 text-body-sm text-body">{cert.description}</p>}
                        {cert.url && (
                          <a
                            href={cert.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-4 inline-block text-body-sm font-medium text-accent-600 hover:underline"
                          >
                            View credential →
                          </a>
                        )}
                      </div>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </Container>
        </Section>
      )}

      <Section>
        <Container>
          <Technologies
            technologies={technologies}
            displayStyle={settings.tech_stack_display ?? "TAGS"}
            heading={about.technologiesHeading}
          />
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
