import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Github } from "lucide-react";
import { Badge, Button, Container, Section, Heading } from "@agency/ui";
import { getProject, getProjects } from "@/lib/api";
import { TestimonialCard } from "@/components/marketing/testimonial-card";
import { ProjectCard } from "@/components/marketing/project-card";
import { ProjectGallery } from "@/components/portfolio/project-gallery";
import { ProjectVideo } from "@/components/portfolio/project-video";
import { ProjectSectionCard } from "@/components/portfolio/project-section-card";
import { ProjectToc } from "@/components/portfolio/project-toc";
import { CtaSection } from "@/components/marketing/cta-section";
import { PageHeading } from "@/components/marketing/page-heading";
import { env } from "@/lib/env";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug).catch(() => null);
  if (!project) return {};

  return {
    // `absolute` opts out of the root layout's title template when a real
    // SEO meta title is configured, so it's used exactly as entered instead
    // of having the site name appended. The plain-title fallback keeps the
    // template (e.g. "ProjectName | Brand") since it's not a full SEO title.
    title: project.seo?.metaTitle ? { absolute: project.seo.metaTitle } : project.title,
    description: project.seo?.metaDescription ?? project.summary,
    alternates: { canonical: `${env.NEXT_PUBLIC_SITE_URL}/portfolio/${project.slug}` },
    openGraph: {
      title: project.seo?.ogTitle ?? project.title,
      description: project.seo?.ogDescription ?? project.summary,
      images: project.gallery[0]?.url ? [project.gallery[0].url] : undefined,
    },
  };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug).catch(() => null);
  if (!project) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary,
    creator: { "@type": "Organization", name: "MAB Digital" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Section className="pb-0">
        <Container>
          <PageHeading
            breadcrumb={[{ label: "Home", href: "/" }, { label: "Portfolio", href: "/portfolio" }, { label: project.title }]}
          >
            {project.category && <Badge variant="accent">{project.category.name}</Badge>}
            <Heading level={1} display className="mt-4">
              {project.title}
            </Heading>
            <p className="mt-5 text-body-lg text-body">{project.summary}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {project.liveUrl && (
                <Button asChild>
                  <Link href={project.liveUrl} target="_blank" rel="noreferrer">
                    Visit live site <ExternalLink />
                  </Link>
                </Button>
              )}
              {project.githubUrl && (
                <Button asChild variant="outline">
                  <Link href={project.githubUrl} target="_blank" rel="noreferrer">
                    <Github /> View code
                  </Link>
                </Button>
              )}
            </div>
          </PageHeading>
        </Container>
      </Section>

      {project.gallery.length > 0 && (
        <Section>
          <Container>
            <ProjectGallery images={project.gallery} title={project.title} />
          </Container>
        </Section>
      )}

      {project.videoUrl && (
        <Section className={project.gallery.length > 0 ? "pt-0" : undefined}>
          <Container>
            <ProjectVideo url={project.videoUrl} />
          </Container>
        </Section>
      )}

      <Section className="pt-0">
        <Container className="grid gap-12 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-10">
            {project.sections.map((section) => (
              <ProjectSectionCard key={section.id} section={section} />
            ))}
          </div>

          <aside className="h-fit space-y-6 lg:sticky lg:top-24">
            <ProjectToc sections={project.sections} />

            <div className="space-y-6 rounded-2xl border border-neutral-200 p-6">
              <div>
                <p className="font-mono text-label uppercase text-neutral-400">Client</p>
                <p className="mt-1 text-body font-medium text-heading">{project.client}</p>
              </div>
              <div>
                <p className="font-mono text-label uppercase text-neutral-400">Tech stack</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {project.techStack.map((tech) => (
                    <Badge key={tech.id} variant="neutral">
                      {tech.name}
                    </Badge>
                  ))}
                </div>
              </div>
              {project.results.length > 0 && (
                <div>
                  <p className="font-mono text-label uppercase text-neutral-400">Results</p>
                  <dl className="mt-3 space-y-3">
                    {project.results.map((result) => (
                      <div key={result.label} className="flex items-baseline justify-between gap-3">
                        <dt className="text-body-sm text-body">{result.label}</dt>
                        <dd className="font-heading text-h4 font-semibold text-accent-600">{result.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </aside>
        </Container>
      </Section>

      {project.testimonials.length > 0 && (
        <Section className="bg-neutral-50">
          <Container className={project.testimonials.length > 1 ? "grid gap-6 sm:grid-cols-2" : "mx-auto max-w-2xl"}>
            {project.testimonials.map((testimonial) => (
              <TestimonialCard key={testimonial.id} testimonial={testimonial} />
            ))}
          </Container>
        </Section>
      )}

      {project.relatedTo.length > 0 && (
        <Section>
          <Container>
            <Heading level={2}>Related projects</Heading>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {project.relatedTo.map((related) => (
                <ProjectCard key={related.id} project={related} />
              ))}
            </div>
          </Container>
        </Section>
      )}

      <Section className={project.relatedTo.length > 0 ? "pt-0" : undefined}>
        <Container>
          <CtaSection headline="Want results like these for **your** product?" />
        </Container>
      </Section>
    </>
  );
}

export async function generateStaticParams() {
  const { items } = await getProjects({ pageSize: 100 }).catch(() => ({ items: [] }) as never);
  return items.map((p) => ({ slug: p.slug }));
}
