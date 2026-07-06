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

export const seoMetaSchema = z.object({
  metaTitle: z.string().min(1).max(70),
  metaDescription: z.string().min(1).max(160),
  keywords: z.array(z.string()).default([]),
  canonicalUrl: z.string().url().nullable().optional(),
  ogTitle: z.string().nullable().optional(),
  ogDescription: z.string().nullable().optional(),
  twitterCard: z.string().default("summary_large_image"),
  structuredData: z.record(z.string(), z.unknown()).optional(),
});
export type SeoMetaInput = z.infer<typeof seoMetaSchema>;

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
