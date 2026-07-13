import type { Metadata } from "next";
import { Github, Linkedin, Twitter } from "lucide-react";
import { Container, Section, Heading, Reveal, Progress, Avatar, AvatarFallback, AvatarImage, DynamicIcon } from "@agency/ui";
import { getAboutContent, getAboutTeamData, getSettings, getSkills, getTechnologies } from "@/lib/api";
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
  const [about, teamData, skills, technologies, faqs, settings] = await Promise.all([
    withFallback(getAboutContent(), EMPTY_ABOUT_CONTENT, "about content"),
    withFallback(getAboutTeamData(), EMPTY_ABOUT_TEAM_DATA, "about team data"),
    withFallback(getSkills(), [], "skills"),
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
              Our **story**, in plain terms.
            </Heading>
            <p className="mt-5 text-body-lg text-body">{about.story}</p>
          </PageHeading>
        </Container>
      </Section>

      <Section>
        <Container className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 p-6">
            <Heading level={3}>Mission</Heading>
            <p className="mt-2 text-body-sm text-body">{about.mission}</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 p-6">
            <Heading level={3}>Vision</Heading>
            <p className="mt-2 text-body-sm text-body">{about.vision}</p>
          </div>
          <div className="rounded-2xl bg-neutral-950 p-6 text-white">
            <Heading level={3} className="text-white">
              Philosophy
            </Heading>
            <p className="mt-2 text-body-sm text-neutral-300">{about.philosophy}</p>
          </div>
        </Container>
      </Section>

      <Section className="bg-neutral-50">
        <Container>
          <Heading level={2} className="text-center">
            Core **values**
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
          <Heading level={2}>Our **timeline**</Heading>
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
            Meet the **team**
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

      <Section>
        <Container className="grid gap-12 lg:grid-cols-2">
          <div>
            <Heading level={2}>Skills</Heading>
            <div className="mt-6 space-y-5">
              {skills.map((skill) => (
                <div key={skill.id}>
                  <div className="mb-1.5 flex justify-between text-body-sm">
                    <span className="text-heading">{skill.name}</span>
                    <span className="text-neutral-400">{skill.proficiency}%</span>
                  </div>
                  <Progress value={skill.proficiency} label={skill.name} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <Heading level={2}>Certifications</Heading>
            <ul className="mt-6 space-y-4">
              {teamData.certifications.map((cert) => (
                <li key={cert.id} className="rounded-2xl border border-neutral-200 p-4">
                  <p className="font-medium text-heading">{cert.name}</p>
                  <p className="text-body-sm text-neutral-500">{cert.issuer} · {cert.year}</p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <Technologies technologies={technologies} displayStyle={settings.tech_stack_display ?? "TAGS"} />
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
