// Read-model shapes returned by the API (Prisma `include` results).
// Distinct from the write schemas in @agency/types, which describe admin
// form payloads, not query results.

export interface MediaRead {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  altText: string | null;
}

export interface TechnologyRead {
  id: string;
  name: string;
  slug: string;
  category: string;
}

export interface TestimonialRead {
  id: string;
  author: string;
  role: string | null;
  company: string | null;
  avatar: MediaRead | null;
  quote: string;
  rating: number;
}

export interface FaqRead {
  id: string;
  question: string;
  answer: string;
  context: string;
}

export interface PricingPlanRead {
  id: string;
  name: string;
  regularPrice: number | null;
  discountPrice: number | null;
  billingType: "ONE_TIME" | "HOURLY" | "MONTHLY" | "YEARLY" | "CUSTOM";
  priceLabel: string | null;
  // Always resolved server-side (plan override, else the site's global
  // currency setting) — never null on data coming from the public API.
  currency: string;
  features: string[];
  isFeatured: boolean;
  isCustomQuote: boolean;
  ctaLabel: string;
  ctaHref: string;
}

export interface ServiceListItem {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  category: { id: string; name: string; slug: string } | null;
  heroMedia: MediaRead | null;
  // A service shows pricing if and only if this has at least one entry.
  pricingPlans: PricingPlanRead[];
}

export interface ServiceDetail extends ServiceListItem {
  description: string;
  benefits: string[];
  process: { title: string; description: string }[];
  deliverables: string[];
  timeline: string;
  technologies: TechnologyRead[];
  faqs: FaqRead[];
  testimonials: TestimonialRead[];
  relatedTo: ServiceListItem[];
  seo: SeoRead | null;
}

export interface SeoRead {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: MediaRead | null;
  twitterCard: string;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: MediaRead | null;
  robots: string;
}

export interface ProjectImageRead {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  caption: string | null;
}

export interface ProjectListItem {
  id: string;
  title: string;
  slug: string;
  client: string | null;
  summary: string;
  isFeatured: boolean;
  category: { id: string; name: string; slug: string } | null;
  gallery: ProjectImageRead[];
}

export interface ProjectDetail extends ProjectListItem {
  overview: string;
  problem: string;
  research: string;
  strategy: string;
  planning: string;
  wireframesNote: string | null;
  designNotes: string;
  developmentNotes: string;
  challenges: string;
  solutions: string;
  results: { label: string; value: string }[];
  liveUrl: string | null;
  githubUrl: string | null;
  videoUrl: string | null;
  techStack: TechnologyRead[];
  testimonials: TestimonialRead[];
  relatedTo: ProjectListItem[];
  seo: SeoRead | null;
}

export interface SkillRead {
  id: string;
  name: string;
  proficiency: number;
}

export interface TeamMemberRead {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatar: MediaRead | null;
  socials: Record<string, string> | null;
  skills: SkillRead[];
}

export interface AffiliateToolRead {
  id: string;
  name: string;
  slug: string;
  description: string;
  benefits: string[];
  specialOffer: string | null;
  ctaLabel: string;
  ctaUrl: string;
  isFeatured: boolean;
  logo: MediaRead | null;
  category: { id: string; slug: string; name: string };
}

export interface AffiliateCategoryRead {
  id: string;
  slug: string;
  name: string;
  tools: AffiliateToolRead[];
}

export interface HomeStatRead {
  id: string;
  number: string;
  suffix: string | null;
  title: string;
  description: string | null;
  highlightKey: "YEARS_IN_BUSINESS" | "PROJECTS_SHIPPED" | null;
}

export interface HomeProcessStepRead {
  id: string;
  title: string;
  description: string;
}

export interface HomeWhyReasonRead {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface HomeContentRead {
  heroBadgeText: string | null;
  heroHeadline: string;
  heroSubheadline: string;
  heroDescription: string | null;
  heroBackgroundImage: MediaRead | null;
  heroCtaLabel: string;
  heroCtaHref: string;
  heroCtaNewTab: boolean;
  heroSecondaryCtaEnabled: boolean;
  heroSecondaryCtaLabel: string | null;
  heroSecondaryCtaHref: string | null;
  heroSecondaryCtaNewTab: boolean;
  contactCtaHeading: string | null;
  contactCtaDescription: string | null;
  contactCtaButtonText: string | null;
  contactCtaButtonHref: string | null;
  seo: SeoRead | null;
}

export interface AboutContentRead {
  story: string;
  mission: string;
  vision: string;
  philosophy: string;
  seo: SeoRead | null;
}

// SEO for pages with no content model of their own (Services, Portfolio,
// Affiliate Tools, Contact) -- one social image covers both Open Graph and
// Twitter Card, unlike SeoRead above which has separate og/twitter fields.
export interface PageSeoRead {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  socialImage: MediaRead | null;
  canonicalUrl: string | null;
  robots: string;
}

export interface SiteSettings {
  company_name?: string;
  contact_email?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  address?: string;
  business_hours?: Record<string, string>;
  socials?: Record<string, string>;
  calendly_url?: string;
  google_maps_embed?: string;
  google_maps_embed_code?: string;
  currency?: string;
  branding?: {
    brandName: string;
    logoMediaId: string | null;
    logoUrl: string | null;
    displayMode: "LOGO" | "TEXT";
  };
}

export interface NavItemRead {
  id: string;
  label: string;
  href: string;
  order: number;
  parentId: string | null;
  location: "HEADER" | "FOOTER";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
