import type { Metadata } from "next";
import { isSectionVisible } from "@agency/types";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Breadcrumb, Container, Heading, Reveal, SocialIcon, cn } from "@agency/ui";
import { aboutPageSchema } from "@agency/types";
import { getAboutContent, getAboutTeamData, getSettings, getTechnologies } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";
import { EMPTY_ABOUT_CONTENT, EMPTY_ABOUT_TEAM_DATA } from "@/lib/fallbacks";
import { cloudinaryTransform } from "@/lib/cloudinary";
import { getBrandName } from "@/lib/branding";
import { CountUp } from "@/components/sections/count-up";
import { MissionTabs, ValueCards } from "@/components/about/about-client";

export async function generateMetadata(): Promise<Metadata> {
  const about = await getAboutContent().catch(() => null);
  const seo = about?.seo;
  if (!seo) {
    const brand = await getBrandName();
    return { title: "About", description: `The story, mission, values, and team behind ${brand || "us"}.` };
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

const H2 = { fontSize: "clamp(2rem, 1rem + 3.4vw, 4.5rem)" } as const;

export default async function AboutPage() {
  const [about, teamData, technologies, settings] = await Promise.all([
    withFallback(getAboutContent(), EMPTY_ABOUT_CONTENT, "about content"),
    withFallback(getAboutTeamData(), EMPTY_ABOUT_TEAM_DATA, "about team data"),
    withFallback(getTechnologies(), [], "technologies"),
    withFallback(getSettings(), {}, "settings"),
  ]);

  // Numbers, headlines, open roles and the closing block are managed in Admin > About > Page Sections.
  const cfg = aboutPageSchema.parse(settings.about_page ?? {});
  const founder = teamData.team[0];
  const tabs = [
    { label: about.missionLabel ?? "Mission", heading: cfg.tabHeadings.mission, text: about.mission },
    { label: about.visionLabel ?? "Vision", heading: cfg.tabHeadings.vision, text: about.vision },
    { label: about.philosophyLabel ?? "Philosophy", heading: cfg.tabHeadings.philosophy, text: about.philosophy },
  ].filter((t) => t.text);
  const roles = cfg.careers.roles.filter((r) => r.title);
  const stats = cfg.stats.filter((s) => s.value);
  const marquee = technologies.map((t) => t.name).filter(Boolean);
  const show = (key: string) => isSectionVisible(settings.section_visibility, "about", key);

  return (
    <>
      <section className="pb-10 pt-4">
        <Container>
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "About" }]} />
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
            <div>
              <Heading level={1} style={{ fontSize: "clamp(2.5rem, 0.5rem + 6.4vw, 7rem)" }}>
                {about.heroHeading || "Design and code, never **apart.**"}
              </Heading>
              <p className="mt-8 max-w-xl whitespace-pre-line text-body text-neutral-500">{about.story.split("\n\n")[0]}</p>
            </div>
            {founder && (
              <div className="mx-auto w-full max-w-sm lg:max-w-none">
                <div className="aspect-[4/4.4] overflow-hidden rounded-[var(--radius-2xl)] border border-neutral-200 bg-neutral-50 lg:aspect-[4/3.6]">
                  {founder.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
                    <img src={cloudinaryTransform(founder.avatar.url, "f_auto,q_auto,w_704,h_760,c_fill,g_auto")} alt={founder.name} className="size-full object-cover object-top" />
                  ) : (
                    <div className="flex size-full items-center justify-center font-heading text-7xl font-extrabold text-neutral-200">{founder.name.charAt(0)}</div>
                  )}
                </div>
                <a href="#team" className="mt-3 flex w-full items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-accent-500 px-4 py-3 text-on-accent">
                  <span>
                    <span className="block text-body-sm font-bold">{founder.name}</span>
                    <span className="block text-label">{founder.role}</span>
                  </span>
                  <ArrowUpRight className="size-4" aria-hidden />
                </a>
              </div>
            )}
          </div>

          {stats.length > 0 && show("stats") && (
            <dl className="mt-14 grid grid-cols-2 gap-x-8 gap-y-8 border-y border-neutral-200 py-8 md:grid-cols-4">
              {stats.map((st, i) => (
                <div key={i}>
                  <dd className="font-heading font-extrabold leading-none tracking-[0.01em] text-heading" style={{ fontSize: "clamp(2.25rem, 1.2rem + 3vw, 4.25rem)" }}>
                    <CountUp value={st.value} enabled />
                  </dd>
                  <dt className="mt-2 text-label text-neutral-500">{st.label}</dt>
                </div>
              ))}
            </dl>
          )}
        </Container>
      </section>

      {marquee.length > 0 && show("tech") && (
        <section aria-label="Technologies" className="mb-10 overflow-hidden bg-accent-500 py-5 text-on-accent">
          <div className="tech-marquee-track flex w-max items-center" style={{ ["--tech-marquee-duration" as string]: "30s" }}>
            {[false, true].map((hidden) => (
              <ul key={String(hidden)} className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
                {marquee.map((name, i) => (
                  <li key={i} className="flex shrink-0 items-center">
                    <span className="font-heading text-[clamp(1rem,0.8rem+0.6vw,1.5rem)] font-extrabold">{name}</span>
                    <span aria-hidden className="mx-6 text-body-sm">
                      &#10022;
                    </span>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </section>
      )}

      {tabs.length > 0 && show("mission") && (
        <section className="pb-[var(--spacing-section)] pt-6">
          <Container>
            <MissionTabs tabs={tabs} />
          </Container>
        </section>
      )}

      {teamData.values.length > 0 && show("values") && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            <Reveal>
              <Heading level={2} className="mb-10" style={H2}>
                {about.valuesHeading || "What we stand for"}
              </Heading>
            </Reveal>
            <ValueCards values={teamData.values.map((v) => ({ title: v.title, description: v.description }))} />
          </Container>
        </section>
      )}

      {teamData.timeline.length > 0 && show("timeline") && (
        <section className="pb-[var(--spacing-section)]">
          <Container className="grid gap-10 lg:grid-cols-[22rem_1fr] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Heading level={2} style={{ fontSize: "clamp(1.75rem, 1rem + 2.4vw, 3.5rem)" }}>
                {about.timelineHeading || "How we got here"}
              </Heading>
              {cfg.timelineSubtitle && <p className="mt-5 max-w-xs text-body-sm text-neutral-500">{cfg.timelineSubtitle}</p>}
            </div>
            <ol className="relative space-y-10 border-l border-neutral-200 pl-8">
              {teamData.timeline.map((event, i) => {
                const last = i === teamData.timeline.length - 1;
                return (
                  <li key={event.id} className="relative">
                    <span className={cn("absolute -left-[2.6rem] top-1 size-4 rounded-full border-2 border-accent-500 ring-4 ring-background", last ? "bg-accent-500" : "bg-background")} />
                    <p className="font-mono text-label uppercase tracking-wider text-accent-500">{event.year}</p>
                    <h3 className="mt-1 font-heading text-h4 font-extrabold text-heading">{event.title}</h3>
                    <p className="mt-2 max-w-xl text-body-sm text-neutral-500">{event.description}</p>
                  </li>
                );
              })}
            </ol>
          </Container>
        </section>
      )}

      {teamData.team.length > 0 && show("team") && (
        <section id="team" className="scroll-mt-24 pb-[var(--spacing-section)]">
          <Container>
            <Heading level={2} style={H2}>
              {about.teamHeading || "The people behind it"}
            </Heading>
            {cfg.teamSubtitle && <p className="mt-4 text-body-sm text-neutral-500">{cfg.teamSubtitle}</p>}
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {teamData.team.map((m) => {
                const linkedin = (m.socials as Record<string, string | undefined> | null)?.linkedin;
                const bio = m.bio.trim().length > 2 ? m.bio : "";
                return (
                  <div key={m.id}>
                    <div className="relative aspect-[4/3.6] overflow-hidden rounded-[var(--radius-2xl)] border border-neutral-200 bg-neutral-50">
                      {m.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
                        <img src={cloudinaryTransform(m.avatar.url, "f_auto,q_auto,w_720,h_640,c_fill,g_face")} alt={m.name} loading="lazy" className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center font-heading text-8xl font-extrabold text-neutral-200">{m.name.charAt(0)}</div>
                      )}
                      {bio && <p className="absolute inset-x-3 bottom-3 rounded-[var(--radius-lg)] border border-neutral-200 bg-background/90 p-3 text-label text-neutral-500 backdrop-blur">{bio}</p>}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-heading text-h4 font-extrabold text-heading">{m.name}</p>
                        <p className="text-label text-neutral-500">{m.role}</p>
                      </div>
                      {linkedin && (
                        <a href={linkedin} target="_blank" rel="noreferrer" aria-label={`${m.name} on LinkedIn`} className="flex size-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:border-accent-500 hover:text-heading">
                          <SocialIcon platform="linkedin" className="size-4" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Container>
        </section>
      )}

      {about.certificationsEnabled && show("certifications") && teamData.certifications.length > 0 && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            <Heading level={2} style={H2}>
              {about.certificationsHeading || "Certifications"}
            </Heading>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {teamData.certifications.map((cert) => (
                <div key={cert.id} className="rounded-[var(--radius-xl)] border border-neutral-200 bg-neutral-50 p-6">
                  <p className="font-mono text-label uppercase tracking-wider text-accent-500">
                    {cert.issuer} · {cert.year}
                  </p>
                  <h3 className="mt-2 font-heading text-h4 font-extrabold text-heading">{cert.name}</h3>
                  {cert.description && <p className="mt-2 text-body-sm text-neutral-500">{cert.description}</p>}
                  {cert.url && (
                    <a href={cert.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-body-sm font-semibold text-accent-500 hover:underline">
                      View credential <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {roles.length > 0 && show("roles") && (
        <section className="pb-[var(--spacing-section)]">
          <Container>
            <div className="grid gap-10 rounded-[var(--radius-2xl)] border border-neutral-200 p-8 sm:p-12 lg:grid-cols-[18rem_1fr] lg:gap-16">
              <div>
                <Heading level={2} style={{ fontSize: "clamp(1.75rem, 1rem + 2.4vw, 3.25rem)" }}>
                  {cfg.careers.heading}
                </Heading>
                {cfg.careers.text && <p className="mt-4 text-body-sm text-neutral-500">{cfg.careers.text}</p>}
              </div>
              <ul>
                {roles.map((r, i) => (
                  <li key={i} className="border-b border-neutral-200 first:border-t">
                    <Link href={r.href || "/contact"} className="group flex items-center justify-between gap-4 py-5">
                      <span className="text-body font-medium text-heading group-hover:text-accent-500">{r.title}</span>
                      <span className="flex shrink-0 items-center gap-2 text-label text-neutral-500">
                        {r.meta} <ArrowUpRight className="size-3.5" aria-hidden />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>
      )}

      {cfg.cta.heading && show("cta") && (
        <section className="pb-[var(--spacing-section)]">
          <Container className="text-center">
            <Heading level={2} className="mx-auto max-w-4xl" style={{ fontSize: "clamp(2.25rem, 1rem + 4.4vw, 5.25rem)" }}>
              {cfg.cta.heading}
            </Heading>
            {cfg.cta.button.label && (
              <Link href={cfg.cta.button.href || "/contact"} className="mt-10 inline-flex items-center gap-2 rounded-full bg-accent-500 px-8 py-4 text-body-sm font-bold text-on-accent hover:opacity-90">
                {cfg.cta.button.label} <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </Container>
        </section>
      )}
    </>
  );
}
