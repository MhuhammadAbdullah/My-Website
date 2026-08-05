import { z } from "zod";
import { newMediaUploadSchema } from "./influencer.js";

// Free-text on the Booking model (brief §9's "Campaign Type" implies a
// picker, not a full enum/migration) -- this list only drives the client
// booking form's <select> options; the server accepts any non-empty string.
export const CAMPAIGN_TYPES = [
  "Product Launch",
  "Brand Awareness",
  "Sponsored Post",
  "Product Review",
  "Event Coverage",
  "UGC Campaign",
  "Giveaway",
  "Long-term Partnership",
  "Other",
] as const;

export const BOOKING_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "AWAITING_PAYMENT",
  "PAYMENT_RECEIVED",
  "APPROVED",
  "INFLUENCER_NOTIFIED",
  "ACCEPTED_BY_INFLUENCER",
  "DECLINED_BY_INFLUENCER",
  "IN_PROGRESS",
  "DELIVERED",
  "CLIENT_APPROVED",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
] as const;
export type BookingStatusId = (typeof BOOKING_STATUSES)[number];

// Client-facing labels for the admin/influencer status badges/timeline.
export const BOOKING_STATUS_LABELS: Record<BookingStatusId, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  AWAITING_PAYMENT: "Awaiting payment",
  PAYMENT_RECEIVED: "Payment received",
  APPROVED: "Approved",
  INFLUENCER_NOTIFIED: "Influencer notified",
  ACCEPTED_BY_INFLUENCER: "Accepted by influencer",
  DECLINED_BY_INFLUENCER: "Declined by influencer",
  IN_PROGRESS: "In progress",
  DELIVERED: "Delivered",
  CLIENT_APPROVED: "Client approved",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

// The public "book this influencer" submission (brief §9). Money is never
// taken from the client directly -- `pricingCardId` references one of the
// influencer's own InfluencerPricingCard rows so the server (never the
// browser) resolves the actual price into the booking's requiredDeliverables
// snapshot. A card flagged `isCustomQuote` has no fixed price -- the client
// still picks it here, and the influencer/admin negotiate the real amount
// afterward via the existing gross-amount override at AWAITING_PAYMENT.
export const bookingSubmissionSchema = z.object({
  businessName: z.string().min(2, "Business name is required").max(150),
  businessWebsite: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  contactPerson: z.string().min(2, "Contact person is required").max(120),
  contactEmail: z.string().email("Enter a valid email address"),
  contactPhone: z.string().min(5, "Enter a valid phone number").max(30),
  campaignObjective: z.string().min(5, "Describe your campaign objective").max(2000),
  industry: z.string().min(2, "Industry is required").max(120),
  product: z.string().min(2, "Product/service is required").max(200),
  campaignType: z.string().min(2, "Campaign type is required").max(120),
  targetAudience: z.string().min(2, "Describe your target audience").max(1000),
  pricingCardId: z.string().min(1, "Select a package"),
  discountCode: z.string().max(40).optional().or(z.literal("")),
  timeline: z.string().min(2, "Timeline is required").max(500),
  notes: z.string().max(2000).optional().or(z.literal("")),
  attachments: z.array(newMediaUploadSchema).max(5, "Up to 5 attachments").default([]),
  termsAccepted: z.boolean().refine((v) => v === true, { message: "You must accept the terms to submit a booking" }),
});
export type BookingSubmissionInput = z.infer<typeof bookingSubmissionSchema>;

// Admin's generic status-transition action. Extra fields are only required
// for specific `toStatus` targets (grossAmount at AWAITING_PAYMENT,
// platformFees/taxAmount optionally at COMPLETED, cancelReason at
// CANCELLED) -- validated per-branch in the route handler, not here, since a
// single rigid schema can't express "required only when X".
export const bookingStatusTransitionSchema = z.object({
  toStatus: z.enum(BOOKING_STATUSES),
  note: z.string().max(2000).optional().or(z.literal("")),
  grossAmount: z.coerce.number().positive().optional(),
  platformFees: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).optional(),
  cancelReason: z.string().max(1000).optional().or(z.literal("")),
});
export type BookingStatusTransitionInput = z.infer<typeof bookingStatusTransitionSchema>;
