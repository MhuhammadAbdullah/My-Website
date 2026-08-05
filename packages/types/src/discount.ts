import { z } from "zod";
import { discountTypeSchema } from "./finance.js";
import { badgeColorSchema } from "./influencer.js";

// Reuses the same PERCENT/FIXED enum Quotation/Invoice line items already
// use (packages/types/src/finance.ts) -- one Prisma `DiscountType` enum
// backs both concepts, per the schema comment on the Discount model.
export { discountTypeSchema };

export const DISCOUNT_SCOPES = ["ALL", "INFLUENCER", "CATEGORY", "FIRST_BOOKING"] as const;
export type DiscountScopeId = (typeof DISCOUNT_SCOPES)[number];

export const discountSchema = z
  .object({
    code: z
      .string()
      .max(40)
      .regex(/^[A-Z0-9_-]+$/, "Use only uppercase letters, numbers, - and _")
      .optional()
      .or(z.literal("")),
    label: z.string().min(2, "Label is required").max(150),
    type: discountTypeSchema,
    scope: z.enum(DISCOUNT_SCOPES).default("ALL"),
    value: z.coerce.number().positive("Value must be greater than 0"),
    influencerId: z.string().optional().or(z.literal("")),
    categoryId: z.string().optional().or(z.literal("")),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),
    maxUses: z.coerce.number().int().positive().nullable().optional(),
    minBookingAmount: z.coerce.number().min(0).nullable().optional(),
    isActive: z.boolean().default(true),
    // Display color for the "X% OFF" badge -- admin-only.
    color: badgeColorSchema,
  })
  .superRefine((data, ctx) => {
    if (data.scope === "INFLUENCER" && !data.influencerId) {
      ctx.addIssue({ code: "custom", message: "Select an influencer for this scope", path: ["influencerId"] });
    }
    if (data.scope === "CATEGORY" && !data.categoryId) {
      ctx.addIssue({ code: "custom", message: "Select a category for this scope", path: ["categoryId"] });
    }
    if (data.type === "PERCENT" && data.value > 100) {
      ctx.addIssue({ code: "custom", message: "A percentage discount can't exceed 100", path: ["value"] });
    }
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
      ctx.addIssue({ code: "custom", message: "End date must be after start date", path: ["endsAt"] });
    }
  });
export type DiscountInput = z.infer<typeof discountSchema>;

export const DISCOUNT_APPROVAL_STATUSES = ["PENDING", "APPROVED", "DECLINED"] as const;
export type DiscountApprovalStatusId = (typeof DISCOUNT_APPROVAL_STATUSES)[number];

// Influencers no longer create their own discounts -- admin proposes one
// (discountSchema above, any scope) and each affected influencer can only
// ever accept or decline it for themselves, never edit its terms. A
// platform-wide ALL/CATEGORY discount still needs every eligible
// influencer's own buy-in (one DiscountInfluencerResponse row per
// influencer -- see apps/api/src/lib/discount.ts's syncDiscountResponses),
// not just one admin decision. See influencer-discounts.routes.ts's
// PATCH /:id/respond (:id is the response row, not the discount itself).
export const influencerDiscountResponseSchema = z.object({
  decision: z.enum(["APPROVED", "DECLINED"]),
});
export type InfluencerDiscountResponseInput = z.infer<typeof influencerDiscountResponseSchema>;
