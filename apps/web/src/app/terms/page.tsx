import type { Metadata } from "next";
import { Container, Section, Heading, Breadcrumb, RichText } from "@agency/ui";
import { getTermsContent } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getTermsContent().catch(() => null);
  const seo = content?.seo;
  if (!seo) {
    return { title: "Terms of Service", description: "The terms that govern use of the MAB Digital website and services." };
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

export default async function TermsPage() {
  // `null` covers both a fetch failure and a page that's never been
  // published -- either way there's nothing real to show yet.
  const content = await withFallback(getTermsContent(), null, "terms content");

  return (
    <Section>
      <Container className="mx-auto max-w-4xl">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Terms" }]} />
        <Heading level={1} className="mt-6">
          {content?.title ?? "Terms of Service"}
        </Heading>
        {content?.lastUpdatedAt && (
          <p className="mt-2 text-body-sm text-neutral-500">
            Last updated:{" "}
            {new Date(content.lastUpdatedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}

        {content ? (
          <RichText html={content.content} className="mt-10" />
        ) : (
          <p className="mt-10 text-body text-body">This page hasn't been published yet. Please check back shortly.</p>
        )}
      </Container>
    </Section>
  );
}
