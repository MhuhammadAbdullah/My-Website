import type { Metadata } from "next";
import { getHomeContent, getHomeLayout } from "@/lib/api";
import { SectionRenderer } from "@/components/sections/registry";

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

// The homepage is the section layout managed in Admin > Home Page > Page Sections.
// Its SEO (title, description, social image) is managed on the SEO tab of the same screen.
export default async function HomePage() {
  const sections = await getHomeLayout().catch(() => []);
  return <SectionRenderer sections={sections} />;
}
