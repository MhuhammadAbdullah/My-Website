import { z } from "zod";
import { contentStatusSchema, faqContextSchema, hrefSchema, paginationQuerySchema, seoMetaSchema } from "./common.js";

export const testimonialSchema = z.object({
  id: z.string().optional(),
  author: z.string().min(1).max(100),
  role: z.string().max(100).nullable().optional(),
  company: z.string().max(100).nullable().optional(),
  avatarId: z.string().nullable().optional(),
  quote: z.string().min(1).max(600),
  rating: z.number().int().min(1).max(5).default(5),
  status: contentStatusSchema.default("PUBLISHED"),
  order: z.number().int().default(0),
  projectIds: z.array(z.string()).default([]),
});
export type TestimonialInput = z.infer<typeof testimonialSchema>;

export const faqSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1).max(200),
  answer: z.string().min(1),
  context: faqContextSchema.default("GENERAL"),
  status: contentStatusSchema.default("PUBLISHED"),
  order: z.number().int().default(0),
});
export type FaqInput = z.infer<typeof faqSchema>;

// Skills -- a flat, reorderable list (like CoreValue), shared globally rather
// than per-team-member: proficiency lives on the Skill itself so the About
// page's progress bars and a team member's skill tags both read the same
// number instead of it being entered twice.
export const skillSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Skill name is required").max(60),
  proficiency: z.coerce.number().int().min(0, "Progress must be between 0 and 100").max(100, "Progress must be between 0 and 100"),
  order: z.coerce.number().int().default(0),
  isEnabled: z.boolean().default(true),
});
export type SkillInput = z.infer<typeof skillSchema>;

export const teamMemberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  bio: z.string().min(1),
  avatarId: z.string().nullable().optional(),
  socials: z
    .object({
      twitter: z.string().url().optional(),
      linkedin: z.string().url().optional(),
      github: z.string().url().optional(),
      website: z.string().url().optional(),
    })
    .partial()
    .nullable()
    .optional(),
  skillIds: z.array(z.string()).default([]),
  status: contentStatusSchema.default("PUBLISHED"),
  order: z.number().int().default(0),
});
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;

export const affiliateCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1),
  order: z.number().int().default(0),
  isEnabled: z.boolean().default(true),
});
export type AffiliateCategoryInput = z.infer<typeof affiliateCategorySchema>;

export const affiliateToolSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string(),
  name: z.string().min(1).max(100),
  slug: z.string().min(1),
  description: z.string().min(1),
  benefits: z.array(z.string().min(1)).default([]),
  specialOffer: z.string().nullable().optional(),
  disclosureNote: z.string().nullable().optional(),
  ctaLabel: z.string().default("Visit Site"),
  ctaUrl: z.string().url(),
  status: contentStatusSchema.default("PUBLISHED"),
  isFeatured: z.boolean().default(false),
  order: z.number().int().default(0),
});
export type AffiliateToolInput = z.infer<typeof affiliateToolSchema>;

// Public-facing query params for the unified Affiliate Tools grid: search,
// category (by AffiliateCategory.slug), featured filter, and sort. `category`
// search/pagination fields come from the shared paginationQuerySchema; only
// pageSize's default is overridden (12 vs 9).
export const affiliateToolsQuerySchema = paginationQuerySchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
  featured: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sortBy: z.enum(["order", "name", "createdAt"]).default("order"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});
export type AffiliateToolsQuery = z.infer<typeof affiliateToolsQuerySchema>;

export const navLocationSchema = z.enum(["HEADER", "FOOTER"]);
export const navItemSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(60),
  href: z.string().min(1),
  location: navLocationSchema,
  parentId: z.string().nullable().optional(),
  order: z.number().int().default(0),
});
export type NavItemInput = z.infer<typeof navItemSchema>;

// Optionally links a stat to a specific About-preview callout (see
// HomeStatHighlight in schema.prisma) so that figure has one source of truth
// instead of being entered again on the About page.
export const homeStatHighlightSchema = z.enum(["YEARS_IN_BUSINESS", "PROJECTS_SHIPPED"]);
export type HomeStatHighlight = z.infer<typeof homeStatHighlightSchema>;

// Homepage statistic -- its own CRUD resource (like CoreValue/TimelineEvent),
// not an embedded array, so it gets create/update/delete/reorder for free
// from createCrudRouter.
export const homeStatSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required").max(80),
  number: z.string().min(1, "Number is required").max(20),
  suffix: z.string().max(10).nullable().optional(),
  description: z.string().max(200).nullable().optional(),
  order: z.number().int().default(0),
  isEnabled: z.boolean().default(true),
  highlightKey: homeStatHighlightSchema.nullable().optional(),
});
export type HomeStatInput = z.infer<typeof homeStatSchema>;

// "How we work" process steps -- flat, reorderable CRUD (like CoreValue).
export const homeProcessStepSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required").max(60),
  description: z.string().min(1, "Description is required").max(300),
  order: z.number().int().default(0),
  isEnabled: z.boolean().default(true),
});
export type HomeProcessStepInput = z.infer<typeof homeProcessStepSchema>;

// "Why work with us" reasons -- flat, reorderable CRUD (like CoreValue), plus
// an icon (lucide-react icon name, chosen via the admin's icon picker).
export const homeWhyReasonSchema = z.object({
  id: z.string().optional(),
  icon: z.string().min(1, "Icon is required"),
  title: z.string().min(1, "Title is required").max(60),
  description: z.string().min(1, "Description is required").max(300),
  order: z.number().int().default(0),
  isEnabled: z.boolean().default(true),
});
export type HomeWhyReasonInput = z.infer<typeof homeWhyReasonSchema>;

const buttonTextSchema = z.string().max(40, "Button text must be 40 characters or fewer");

// Deliberately omits `id`/`seoId`/`updatedAt` -- the admin form's GET response
// includes those (via `include: { seo: true }`), and a naive round-trip of
// that full object back into a PUT body used to send a raw `seo` object where
// Prisma expects a nested-write shape (`connect`/`update`/etc.), which threw
// PrismaClientValidationError on every save. Parsing through this schema
// strips those fields back out before they ever reach Prisma, in addition to
// actually validating the real fields. `seo` itself is handled separately by
// the route (see pages.routes.ts) since it's a nested relation, not a column.
export const homePageContentSchema = z.object({
  heroBadgeText: z.string().max(60).nullable().optional(),
  heroHeadline: z.string().min(1, "Hero headline is required"),
  heroSubheadline: z.string().min(1, "Hero subheadline is required"),
  heroDescription: z.string().nullable().optional(),
  heroBackgroundImageId: z.string().nullable().optional(),
  heroCtaLabel: buttonTextSchema.min(1, "CTA label is required"),
  heroCtaHref: hrefSchema,
  heroCtaNewTab: z.boolean().default(false),

  heroSecondaryCtaEnabled: z.boolean().default(true),
  heroSecondaryCtaLabel: buttonTextSchema.nullable().optional(),
  heroSecondaryCtaHref: hrefSchema.nullable().optional(),
  heroSecondaryCtaNewTab: z.boolean().default(false),

  contactCtaHeading: z.string().nullable().optional(),
  contactCtaDescription: z.string().nullable().optional(),
  contactCtaButtonText: buttonTextSchema.nullable().optional(),
  contactCtaButtonHref: hrefSchema.nullable().optional(),

  // Section headings/labels below the hero. May contain `**text**` emphasis
  // markers -- rendered as italic serif by the shared Heading component
  // (packages/ui/src/heading.tsx). Admins edit plain text only; they cannot
  // change fonts directly.
  storyHeading: z.string().nullable().optional(),
  storyButtonLabel: buttonTextSchema.nullable().optional(),
  storyMissionLabel: z.string().max(60).nullable().optional(),
  servicesHeading: z.string().nullable().optional(),
  servicesDescription: z.string().nullable().optional(),
  servicesButtonLabel: buttonTextSchema.nullable().optional(),
  portfolioHeading: z.string().nullable().optional(),
  portfolioDescription: z.string().nullable().optional(),
  portfolioButtonLabel: buttonTextSchema.nullable().optional(),
  processHeading: z.string().nullable().optional(),
  technologiesHeading: z.string().nullable().optional(),
  whyHeading: z.string().nullable().optional(),
  testimonialsHeading: z.string().nullable().optional(),

  // .nullable() matters here: GET returns `seo: null` (Prisma's shape for
  // an unset optional relation) whenever no SeoMeta row has been created
  // yet, and the route (pages.routes.ts) already treats null/undefined
  // identically via `if (seo)`. Without .nullable(), a client that
  // round-trips that null value straight back into the PUT body fails
  // validation with "seo: Expected object, received null" even though
  // null is exactly what this same endpoint just returned.
  seo: seoMetaSchema.partial().nullable().optional(),
});
export type HomePageContentInput = z.infer<typeof homePageContentSchema>;

// Same leaked-relation issue as homePageContentSchema above, for /pages/about.
// yearsExperience/projectsShipped intentionally omitted -- those figures now
// come from Home Page Statistics (HomeStat.highlightKey) so there's one
// source of truth instead of two numbers that can drift apart. `seo` is
// handled the same way as homePageContentSchema (see pages.routes.ts).
export const aboutPageContentSchema = z.object({
  story: z.string().min(1, "Story is required"),
  mission: z.string().min(1, "Mission is required"),
  vision: z.string().min(1, "Vision is required"),
  philosophy: z.string().min(1, "Philosophy is required"),

  // Section headings/labels beyond the hero. May contain `**text**` emphasis
  // markers -- see homePageContentSchema above for the same convention.
  heroHeading: z.string().nullable().optional(),
  missionLabel: z.string().max(60).nullable().optional(),
  visionLabel: z.string().max(60).nullable().optional(),
  philosophyLabel: z.string().max(60).nullable().optional(),
  valuesHeading: z.string().nullable().optional(),
  timelineHeading: z.string().nullable().optional(),
  teamHeading: z.string().nullable().optional(),
  skillsHeading: z.string().nullable().optional(),
  certificationsHeading: z.string().nullable().optional(),
  technologiesHeading: z.string().nullable().optional(),

  // .nullable() matters here: GET returns `seo: null` (Prisma's shape for
  // an unset optional relation) whenever no SeoMeta row has been created
  // yet, and the route (pages.routes.ts) already treats null/undefined
  // identically via `if (seo)`. Without .nullable(), a client that
  // round-trips that null value straight back into the PUT body fails
  // validation with "seo: Expected object, received null" even though
  // null is exactly what this same endpoint just returned.
  seo: seoMetaSchema.partial().nullable().optional(),
});
export type AboutPageContentInput = z.infer<typeof aboutPageContentSchema>;

// Shared by Privacy Policy and Terms & Conditions -- both are singleton
// pages with an identical shape (title, rich-text body, optional last-
// updated date, SEO), used as the body for both the draft-save (PATCH) and
// publish (POST .../publish) routes in legal.routes.ts. Enforcing title and
// content on every save (not just publish) also means a page can never end
// up published with empty content, since publish goes through this same
// validation.
export const legalPageContentSchema = z.object({
  title: z.string().min(1, "Page title is required").max(120),
  content: z.string().min(1, "Rich text content is required"),
  lastUpdatedAt: z.coerce.date().nullable().optional(),
  seo: seoMetaSchema.partial().nullable().optional(),
});
export type LegalPageContentInput = z.infer<typeof legalPageContentSchema>;

// Singleton hero content for the four pages that don't have their own
// bespoke content model (Services/Portfolio/Affiliate Tools/Contact are
// otherwise static route components). Only a hero heading + paragraph --
// the current layout has no separate "intro" section on any of these pages.
// SEO for these pages stays on the existing PageSeo model (page-seo.routes.ts),
// unchanged. heroHeading may contain `**text**` emphasis markers, same
// convention as homePageContentSchema/aboutPageContentSchema above.
export const servicesPageContentSchema = z.object({
  heroHeading: z.string().min(1, "Hero heading is required"),
  heroDescription: z.string().min(1, "Hero paragraph is required"),
});
export type ServicesPageContentInput = z.infer<typeof servicesPageContentSchema>;

export const portfolioPageContentSchema = z.object({
  heroHeading: z.string().min(1, "Hero heading is required"),
  heroDescription: z.string().min(1, "Hero paragraph is required"),
});
export type PortfolioPageContentInput = z.infer<typeof portfolioPageContentSchema>;

export const affiliateToolsPageContentSchema = z.object({
  heroHeading: z.string().min(1, "Hero heading is required"),
  heroDescription: z.string().min(1, "Hero paragraph is required"),
  disclosureText: z.string().min(1, "Disclosure text is required"),
});
export type AffiliateToolsPageContentInput = z.infer<typeof affiliateToolsPageContentSchema>;

export const contactPageContentSchema = z.object({
  heroHeading: z.string().min(1, "Hero heading is required"),
  heroDescription: z.string().min(1, "Hero paragraph is required"),
  whatsappLabel: z.string().min(1, "WhatsApp button label is required").max(60),
  calendlyLabel: z.string().min(1, "Calendly button label is required").max(60),
});
export type ContactPageContentInput = z.infer<typeof contactPageContentSchema>;

// Sitewide default CTA copy -- CtaSection's fallback when a page doesn't pass
// explicit headline/subheadline/ctaLabel/ctaHref overrides (only the Home
// page does, via HomePageContent.contactCta*). Stored as the `default_cta`
// SiteSetting key rather than its own table, since it's a single small blob
// shared across many pages, not owned by any one page's content model.
export const defaultCtaSchema = z.object({
  headline: z.string().min(1, "Headline is required"),
  subheadline: z.string().min(1, "Subheadline is required"),
  ctaLabel: buttonTextSchema.min(1, "Button text is required"),
  ctaHref: hrefSchema,
});
export type DefaultCtaInput = z.infer<typeof defaultCtaSchema>;
