import type { Metadata } from "next";
import type { PageSeoRead } from "./types";

// Shared by every page that reads its SEO from PageSeo (Services, Portfolio,
// Affiliate Tools, Contact) instead of duplicating this ~20-line block per
// page. `title` uses Next's `absolute` form when a real meta title is
// configured -- opts out of the root layout's title template ("%s | Brand")
// so the admin-entered title is used exactly as-is, not doubled up with the
// site name. One social image drives both Open Graph and Twitter Card.
export function buildPageMetadata({
  seo,
  fallbackTitle,
  fallbackDescription,
}: {
  seo: PageSeoRead | null;
  fallbackTitle: string;
  fallbackDescription: string;
}): Metadata {
  if (!seo) {
    return { title: fallbackTitle, description: fallbackDescription };
  }

  const imageUrl = seo.socialImage?.url;

  return {
    title: { absolute: seo.metaTitle },
    description: seo.metaDescription,
    keywords: seo.keywords.length > 0 ? seo.keywords : undefined,
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    robots: seo.robots,
    openGraph: {
      title: seo.metaTitle,
      description: seo.metaDescription,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.metaTitle,
      description: seo.metaDescription,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}
