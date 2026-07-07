import { z } from "zod";
import { contentStatusSchema, faqContextSchema, hrefSchema, paginationQuerySchema, seoMetaSchema } from "./common";

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

  seo: seoMetaSchema.partial().optional(),
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
  seo: seoMetaSchema.partial().optional(),
});
export type AboutPageContentInput = z.infer<typeof aboutPageContentSchema>;
