import { z } from "zod";

export const contentStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export type ContentStatus = z.infer<typeof contentStatusSchema>;

export const techCategorySchema = z.enum([
  "FRONTEND",
  "BACKEND",
  "DATABASE",
  "DEVOPS",
  "DESIGN",
  "TOOL",
]);
export type TechCategory = z.infer<typeof techCategorySchema>;

export const faqContextSchema = z.enum([
  "GENERAL",
  "SERVICE",
  "PORTFOLIO",
  "CONTACT",
  "AFFILIATE",
]);
export type FaqContext = z.infer<typeof faqContextSchema>;

export const mediaSchema = z.object({
  id: z.string(),
  publicId: z.string(),
  url: z.string().url(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  altText: z.string().nullable().optional(),
});
export type Media = z.infer<typeof mediaSchema>;

// The four combinations content teams actually choose between; a free-form
// string would let an admin type a robots directive that doesn't exist.
export const seoRobotsSchema = z.enum(["index, follow", "noindex, follow", "index, nofollow", "noindex, nofollow"]);
export type SeoRobots = z.infer<typeof seoRobotsSchema>;

export const seoMetaSchema = z.object({
  metaTitle: z.string().min(1).max(60),
  metaDescription: z.string().min(1).max(160),
  keywords: z.array(z.string()).default([]),
  canonicalUrl: z.string().url().nullable().optional(),
  ogTitle: z.string().nullable().optional(),
  ogDescription: z.string().nullable().optional(),
  ogImageId: z.string().nullable().optional(),
  twitterCard: z.string().default("summary_large_image"),
  twitterTitle: z.string().nullable().optional(),
  twitterDescription: z.string().nullable().optional(),
  twitterImageId: z.string().nullable().optional(),
  robots: seoRobotsSchema.default("index, follow"),
  structuredData: z.record(z.string(), z.unknown()).optional(),
});
export type SeoMetaInput = z.infer<typeof seoMetaSchema>;

// Accepts either an internal relative path ("/contact") or a fully-qualified
// URL -- CTA hrefs across the site are legitimately either (most point
// in-app), so a strict `.url()` check would reject the common case.
export const hrefSchema = z
  .string()
  .min(1, "Link is required")
  .refine((value) => value.startsWith("/") || z.string().url().safeParse(value).success, {
    message: "Enter a valid URL or a relative path starting with /",
  });

// Pages without their own content model (Services/Portfolio/Affiliate
// Tools/Contact are static route components) get SEO settings keyed by a
// plain string rather than a relation -- add a new page by adding its key
// here, no database migration required.
export const SEO_PAGE_KEYS = ["services", "portfolio", "affiliate-tools", "contact"] as const;
export const seoPageKeySchema = z.enum(SEO_PAGE_KEYS);
export type SeoPageKey = z.infer<typeof seoPageKeySchema>;

// Simpler than seoMetaSchema above: one "social image" (not separate OG/
// Twitter images) that the frontend applies to both, and no ogTitle/
// ogDescription overrides -- metaTitle/metaDescription cover both by design,
// keeping this admin form to one screen per page.
export const pageSeoSchema = z.object({
  metaTitle: z.string().min(1, "Meta title is required").max(60, "Meta title must be 60 characters or fewer"),
  metaDescription: z.string().min(1, "Meta description is required").max(160, "Meta description must be 160 characters or fewer"),
  keywords: z.array(z.string()).default([]),
  socialImageId: z.string().nullable().optional(),
  canonicalUrl: z.string().url("Enter a valid URL").nullable().optional(),
  robots: seoRobotsSchema.default("index, follow"),
});
export type PageSeoInput = z.infer<typeof pageSeoSchema>;

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(9),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export function paginatedResponseSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    totalPages: z.number().int(),
  });
}
