import { z } from "zod";
import { contentStatusSchema, faqContextSchema, paginationQuerySchema } from "./common";

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
