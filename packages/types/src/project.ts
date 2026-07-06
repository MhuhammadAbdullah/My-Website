import { z } from "zod";
import { contentStatusSchema, seoMetaSchema } from "./common";

export const resultMetricSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});
export type ResultMetric = z.infer<typeof resultMetricSchema>;

export const projectGalleryImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  width: z.number().int().nullable().optional(),
  height: z.number().int().nullable().optional(),
  caption: z.string().nullable().optional(),
});
export type ProjectGalleryImageInput = z.infer<typeof projectGalleryImageSchema>;

export const projectSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  title: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase, hyphen-separated"),
  client: z.string().min(1).nullable().optional(),
  summary: z.string().min(1).max(240),
  overview: z.string().min(1),
  problem: z.string().min(1),
  research: z.string().min(1),
  strategy: z.string().min(1),
  planning: z.string().min(1),
  wireframesNote: z.string().nullable().optional(),
  designNotes: z.string().min(1),
  developmentNotes: z.string().min(1),
  challenges: z.string().min(1),
  solutions: z.string().min(1),
  results: z.array(resultMetricSchema).default([]),
  liveUrl: z.string().url().nullable().optional().or(z.literal("")),
  githubUrl: z.string().url().nullable().optional().or(z.literal("")),
  videoUrl: z.string().url().nullable().optional().or(z.literal("")),
  videoPublicId: z.string().nullable().optional(),
  timelineStart: z.coerce.date().nullable().optional(),
  timelineEnd: z.coerce.date().nullable().optional(),
  status: contentStatusSchema.default("DRAFT"),
  isFeatured: z.boolean().default(false),
  order: z.number().int().default(0),
  techStackIds: z.array(z.string()).default([]),
  relatedProjectIds: z.array(z.string()).default([]),
  gallery: z.array(projectGalleryImageSchema).default([]),
  seo: seoMetaSchema,
});
export type ProjectInput = z.infer<typeof projectSchema>;
