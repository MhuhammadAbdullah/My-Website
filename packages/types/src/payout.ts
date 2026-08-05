import { z } from "zod";
import { PAYOUT_METHOD_TYPES, PAYOUT_METHOD_DETAILS_SCHEMA_BY_TYPE } from "./influencer.js";

export const PAYOUT_STATUSES = ["PENDING", "PROCESSING", "PAID", "FAILED", "CANCELLED"] as const;
export type PayoutStatusId = (typeof PAYOUT_STATUSES)[number];

// The per-type detail schemas/field lists live in influencer.ts (which
// already anchors PAYOUT_METHOD_TYPES) so both this file's full 7-method
// dashboard flow and influencer.ts's narrower registration-time
// applicationPayoutMethodSchema share one source of truth without a
// circular import between the two files.
export { PAYOUT_METHOD_DETAILS_SCHEMA_BY_TYPE, PAYOUT_METHOD_FIELDS_BY_TYPE } from "./influencer.js";

export const influencerPayoutMethodSubmissionSchema = z
  .object({
    type: z.enum(PAYOUT_METHOD_TYPES),
    details: z.record(z.string(), z.string()),
    isDefault: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    const schema = PAYOUT_METHOD_DETAILS_SCHEMA_BY_TYPE[data.type];
    const result = schema.safeParse(data.details);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ["details", ...issue.path] });
      }
    }
  });
export type InfluencerPayoutMethodSubmissionInput = z.infer<typeof influencerPayoutMethodSubmissionSchema>;

export const PAYOUT_METHOD_REVIEW_STATUSES = ["APPROVED", "REJECTED"] as const;
export const payoutMethodReviewSchema = z.object({
  status: z.enum(PAYOUT_METHOD_REVIEW_STATUSES),
});
export type PayoutMethodReviewInput = z.infer<typeof payoutMethodReviewSchema>;

export const payoutBatchCreateSchema = z.object({
  influencerId: z.string().min(1, "Select an influencer"),
  bookingIds: z.array(z.string()).min(1, "Select at least one completed booking"),
  notes: z.string().max(1000).optional().or(z.literal("")),
});
export type PayoutBatchCreateInput = z.infer<typeof payoutBatchCreateSchema>;

export const PAYOUT_TRANSITIONABLE_STATUSES = ["PROCESSING", "PAID", "FAILED", "CANCELLED"] as const;
export const payoutStatusUpdateSchema = z.object({
  status: z.enum(PAYOUT_TRANSITIONABLE_STATUSES),
  notes: z.string().max(1000).optional().or(z.literal("")),
});
export type PayoutStatusUpdateInput = z.infer<typeof payoutStatusUpdateSchema>;
