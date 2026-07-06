import { z } from "zod";
import { contentStatusSchema, seoMetaSchema } from "./common";
import { currencySchema } from "./settings";

export const billingTypeSchema = z.enum(["ONE_TIME", "HOURLY", "MONTHLY", "YEARLY", "CUSTOM"]);
export type BillingType = z.infer<typeof billingTypeSchema>;

export const processStepSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});
export type ProcessStep = z.infer<typeof processStepSchema>;

export const pricingPlanSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  regularPrice: z.number().positive().nullable().optional(),
  discountPrice: z.number().positive().nullable().optional(),
  billingType: billingTypeSchema.default("ONE_TIME"),
  priceLabel: z.string().max(60).nullable().optional(),
  currency: currencySchema.nullable().optional(),
  features: z.array(z.string().min(1)).min(1),
  isFeatured: z.boolean().default(false),
  isCustomQuote: z.boolean().default(false),
  ctaLabel: z.string().default("Get Started"),
  ctaHref: z.string().default("/contact"),
  order: z.number().int().default(0),
});
export type PricingPlanInput = z.infer<typeof pricingPlanSchema>;

export const serviceSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase, hyphen-separated"),
  tagline: z.string().min(1).max(160),
  description: z.string().min(1),
  benefits: z.array(z.string().min(1)).min(1),
  process: z.array(processStepSchema).min(1),
  deliverables: z.array(z.string().min(1)).min(1),
  timeline: z.string().min(1),
  status: contentStatusSchema.default("DRAFT"),
  isFeatured: z.boolean().default(false),
  order: z.number().int().default(0),
  technologyIds: z.array(z.string()).default([]),
  faqIds: z.array(z.string()).default([]),
  relatedServiceIds: z.array(z.string()).default([]),
  // Pricing plans are the sole source of pricing control — a service shows
  // pricing on the site if and only if it has at least one plan here. Cross-
  // field rules per plan (regularPrice required unless isCustomQuote,
  // discountPrice < regularPrice) are enforced in the route handler rather
  // than here, since this schema is also used via `.partial()` for PATCH and
  // ZodEffects (what `.superRefine` would produce) has no `.partial()`.
  pricingPlans: z.array(pricingPlanSchema).max(20).default([]),
  seo: seoMetaSchema,
});
export type ServiceInput = z.infer<typeof serviceSchema>;

export const contactSubmissionSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(1, "Phone number is required").max(30),
  country: z.string().min(1, "Country is required").max(100),
  city: z.string().min(1, "City is required").max(100),
  budget: z.string().max(60).optional().or(z.literal("")),
  message: z.string().min(10).max(4000),
  source: z.string().max(120).optional(),
});
export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;
