import { z } from "zod";
import { contentStatusSchema } from "./common.js";

// Shared solid-badge color palette -- InfluencerBadge.color and
// Discount.color both admin-assigned from this same set (see
// apps/web/src/lib/influencer-format.ts's badgeSolidClasses, which maps
// each of these to its Tailwind classes for both badge types).
export const BADGE_COLORS = [
  "amber",
  "emerald",
  "orange",
  "rose",
  "blue",
  "violet",
  "sky",
  "yellow",
  "purple",
  "pink",
] as const;
export type BadgeColorId = (typeof BADGE_COLORS)[number];

export const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// InfluencerBadge.color / Discount.color both accept either a name from
// BADGE_COLORS (rendered with the shared Tailwind palette -- see
// badgeSolidClasses/discountBadgeColorProps in
// apps/web/src/lib/influencer-format.ts) or an admin-entered hex code
// (rendered with an inline style instead, since Tailwind can't generate a
// class for a color it doesn't know about at build time).
export const badgeColorSchema = z
  .string()
  .refine((v) => (BADGE_COLORS as readonly string[]).includes(v) || HEX_COLOR_REGEX.test(v), {
    message: "Pick a preset color or enter a valid hex code (e.g. #FF6B00)",
  })
  .nullable()
  .optional();

// Prefixed to avoid colliding with the unrelated `SocialPlatformId` in
// settings.ts (lowercase footer/social-link icon ids like "facebook").
export const INFLUENCER_SOCIAL_PLATFORMS = [
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "FACEBOOK",
  "LINKEDIN",
  "TWITTER_X",
  "PINTEREST",
  "SNAPCHAT",
  "THREADS",
] as const;
export type InfluencerSocialPlatformId = (typeof INFLUENCER_SOCIAL_PLATFORMS)[number];

export const DELIVERABLE_TYPES = [
  "INSTAGRAM_STORY",
  "INSTAGRAM_REEL",
  "INSTAGRAM_FEED_POST",
  "TIKTOK_VIDEO",
  "YOUTUBE_SHORTS",
  "DEDICATED_VIDEO",
  "PRODUCT_REVIEW",
  "BRAND_MENTION",
  "UGC",
  "CUSTOM",
] as const;
export type DeliverableTypeId = (typeof DELIVERABLE_TYPES)[number];

export const PAYOUT_METHOD_TYPES = ["BANK_ACCOUNT", "RAAST", "EASYPAISA", "JAZZCASH", "NAYAPAY", "SADAPAY", "OTHER_WALLET"] as const;
export type PayoutMethodTypeId = (typeof PAYOUT_METHOD_TYPES)[number];

// Display labels + brand color per method, shared by every payout-method
// picker (registration step and dashboard) so an icon/color added in one
// place doesn't drift from the other.
export const PAYOUT_METHOD_LABELS: Record<PayoutMethodTypeId, string> = {
  BANK_ACCOUNT: "Bank Transfer",
  RAAST: "Raast",
  EASYPAISA: "Easypaisa",
  JAZZCASH: "JazzCash",
  NAYAPAY: "Nayapay",
  SADAPAY: "SadaPay",
  OTHER_WALLET: "Other Wallet",
};

// Registration collects real payout details up front now (brief update:
// "Creator Payout" step), but only offers the 3 methods most of this
// platform's creators actually use -- the full PAYOUT_METHOD_TYPES set
// stays reachable from the influencer dashboard post-approval, unchanged.
export const REGISTRATION_PAYOUT_METHOD_TYPES = ["BANK_ACCOUNT", "JAZZCASH", "EASYPAISA"] as const;
export type RegistrationPayoutMethodTypeId = (typeof REGISTRATION_PAYOUT_METHOD_TYPES)[number];

export const IDENTITY_DOCUMENT_TYPES = ["CNIC", "PASSPORT"] as const;
export type IdentityDocumentType = (typeof IDENTITY_DOCUMENT_TYPES)[number];

// Per-type payout detail schemas -- colocated with PAYOUT_METHOD_TYPES
// (rather than in payout.ts, which already imports that constant from here)
// so payout.ts can import these too without a circular dependency between
// the two files. "Bank Transfer" collects account number, IBAN, and bank
// name; every other method collects account title/number/IBAN only.
const bankAccountDetailsSchema = z.object({
  bankName: z.string().min(2, "Bank name is required").max(150),
  accountTitle: z.string().min(2, "Account title is required").max(150),
  accountNumber: z.string().min(4, "Account number is required").max(60),
  iban: z.string().min(10, "Enter a valid IBAN").max(40),
  branchCode: z.string().max(30).optional().or(z.literal("")),
});
// Every non-bank-transfer method (Raast, Easypaisa, JazzCash, Nayapay,
// SadaPay, Other Wallet) collects the same 3 fields.
const walletDetailsSchema = z.object({
  accountTitle: z.string().min(2, "Account title is required").max(150),
  accountNumber: z.string().min(4, "Account number is required").max(60),
  iban: z.string().min(10, "Enter a valid IBAN").max(40),
});

export const PAYOUT_METHOD_DETAILS_SCHEMA_BY_TYPE = {
  BANK_ACCOUNT: bankAccountDetailsSchema,
  RAAST: walletDetailsSchema,
  EASYPAISA: walletDetailsSchema,
  JAZZCASH: walletDetailsSchema,
  NAYAPAY: walletDetailsSchema,
  SADAPAY: walletDetailsSchema,
  OTHER_WALLET: walletDetailsSchema,
} as const;

// Per-type field definitions the client form renders from, kept next to the
// schema above so the two can never drift.
const WALLET_FIELDS = [
  { key: "accountTitle", label: "Account title" },
  { key: "accountNumber", label: "Account number" },
  { key: "iban", label: "IBAN" },
];
export const PAYOUT_METHOD_FIELDS_BY_TYPE: Record<(typeof PAYOUT_METHOD_TYPES)[number], { key: string; label: string }[]> = {
  BANK_ACCOUNT: [
    { key: "bankName", label: "Bank name" },
    { key: "accountTitle", label: "Account title" },
    { key: "accountNumber", label: "Account number" },
    { key: "iban", label: "IBAN" },
    { key: "branchCode", label: "Branch name (optional)" },
  ],
  RAAST: WALLET_FIELDS,
  EASYPAISA: WALLET_FIELDS,
  JAZZCASH: WALLET_FIELDS,
  NAYAPAY: WALLET_FIELDS,
  SADAPAY: WALLET_FIELDS,
  OTHER_WALLET: WALLET_FIELDS,
};

// The submission schemas below only *validate* `details` -- Zod's
// superRefine doesn't replace the field with the parsed/stripped output, so
// a raw `z.record(string, string())` request body sails through with
// whatever extra keys the client sent (e.g. a stale `phoneNumber` left over
// from editing a payout method that used to be phone-based, before this
// field set changed to accountTitle/accountNumber/iban) and in whatever key
// order the client happened to build the object in. Routes that persist
// payout method details MUST run them through this first so storage always
// holds exactly the current per-type fields, in the schema's declared order.
export function normalizePayoutMethodDetails(type: PayoutMethodTypeId, details: Record<string, string>): Record<string, string> {
  const parsed = PAYOUT_METHOD_DETAILS_SCHEMA_BY_TYPE[type].parse(details) as Record<string, string | undefined>;
  return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, string] => entry[1] !== undefined));
}

// Every read UI (influencer dashboard, admin review queue) that lists out a
// payout method's details MUST build its rows from this, not
// `Object.entries(details)` directly -- Postgres' jsonb storage does not
// preserve object key insertion order (it reorders keys internally, roughly
// by key length), so the field order the app wrote is not the order it gets
// back. This walks PAYOUT_METHOD_FIELDS_BY_TYPE's declared order instead and
// looks each value up by key, which is order-stable regardless of storage.
export function orderedPayoutMethodDetails(
  type: string,
  details: Record<string, string>,
): { key: string; label: string; value: string }[] {
  const fields = PAYOUT_METHOD_FIELDS_BY_TYPE[type as PayoutMethodTypeId] as { key: string; label: string }[] | undefined;
  if (!fields) return Object.entries(details).map(([key, value]) => ({ key, label: key, value }));

  const knownKeys = new Set(fields.map((f) => f.key));
  const ordered = fields
    .filter((f) => details[f.key] !== undefined && details[f.key] !== "")
    .map((f) => ({ key: f.key, label: f.label.replace(/\s*\(optional\)$/i, ""), value: details[f.key]! }));
  // Any leftover key the current field set doesn't know about (legacy data
  // that predates a field-set change) still surfaces, appended at the end,
  // rather than silently disappearing.
  const extras = Object.entries(details)
    .filter(([k]) => !knownKeys.has(k))
    .map(([key, value]) => ({ key, label: key, value }));
  return [...ordered, ...extras];
}

export const REGISTRATION_PAYOUT_METHOD_LABELS: Record<RegistrationPayoutMethodTypeId, string> = {
  BANK_ACCOUNT: "Bank Transfer",
  JAZZCASH: "JazzCash",
  EASYPAISA: "EasyPaisa",
};

// Registration's "Creator Payout" step submission (brief update §5/§6):
// real account details, not just a method preference -- but held as
// PENDING on InfluencerPayoutMethod until admin approves the application
// (see influencer-applications.routes.ts), same as any other payout method
// change. `type` is deliberately narrower than the dashboard's
// influencerPayoutMethodSubmissionSchema (payout.ts) -- registration only
// ever offers the 3 REGISTRATION_PAYOUT_METHOD_TYPES.
export const applicationPayoutMethodSchema = z
  .object({
    type: z.enum(REGISTRATION_PAYOUT_METHOD_TYPES),
    details: z.record(z.string(), z.string()),
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
export type ApplicationPayoutMethodInput = z.infer<typeof applicationPayoutMethodSchema>;

export const INFLUENCER_STATUSES = ["PENDING", "APPROVED", "REJECTED", "NEEDS_MORE_INFO", "SUSPENDED"] as const;
export type InfluencerStatusId = (typeof INFLUENCER_STATUSES)[number];

// A raw, just-uploaded-to-Cloudinary asset that hasn't been registered as a
// Media row yet -- distinct from @agency/types' `mediaSchema` (common.ts),
// which references an *existing* Media row by id. The application/profile
// routes create the Media row themselves, atomically with the rest of the
// submission, from exactly these fields.
export const newMediaUploadSchema = z.object({
  publicId: z.string().min(1),
  url: z.string().url(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  format: z.string().nullable().optional(),
  bytes: z.number().int().nullable().optional(),
  altText: z.string().nullable().optional(),
});
export type NewMediaUploadInput = z.infer<typeof newMediaUploadSchema>;

// Per-platform audience demographic breakdown (brief §19 "Platform
// Analytics" / §20's per-platform tabs) -- scoped to one platform, not
// blended across all of an influencer's platforms.
export const influencerAudienceInsightSchema = z.object({
  genderMalePercent: z.coerce.number().min(0).max(100).default(0),
  genderFemalePercent: z.coerce.number().min(0).max(100).default(0),
  genderOtherPercent: z.coerce.number().min(0).max(100).default(0),
  ageGroups: z.record(z.string(), z.coerce.number().min(0).max(100)).default({}),
});
export type InfluencerAudienceInsightInput = z.infer<typeof influencerAudienceInsightSchema>;

export const AUDIENCE_LOCATION_LEVELS = ["COUNTRY", "STATE", "CITY"] as const;
export type AudienceLocationLevelId = (typeof AUDIENCE_LOCATION_LEVELS)[number];
export const influencerAudienceLocationSchema = z.object({
  level: z.enum(AUDIENCE_LOCATION_LEVELS),
  name: z.string().min(1).max(100),
  percentage: z.coerce.number().min(0).max(100),
});
export type InfluencerAudienceLocationInput = z.infer<typeof influencerAudienceLocationSchema>;

// `engagementRate` is deliberately NOT here -- it's server-computed from
// avgLikes/avgComments/avgShares/followers on every save (see
// influencer-me.routes.ts), never a value the influencer types directly, so
// what's displayed is always a real calculation. `accountReach` (period-level
// "accounts reached") and `avgReach` ("Average Content Reach" per post) are
// two distinct metrics on every platform's own Insights screen -- neither is
// derivable from the other, so both stay raw/self-reported inputs.
export const influencerPlatformSchema = z.object({
  platform: z.enum(INFLUENCER_SOCIAL_PLATFORMS),
  handle: z.string().max(80).optional().or(z.literal("")),
  profileUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  followers: z.coerce.number().int().min(0).default(0),
  following: z.coerce.number().int().min(0).default(0),
  posts: z.coerce.number().int().min(0).default(0),
  accountReach: z.coerce.number().int().min(0).default(0),
  avgReach: z.coerce.number().int().min(0).default(0),
  avgViews: z.coerce.number().int().min(0).default(0),
  avgLikes: z.coerce.number().int().min(0).default(0),
  avgComments: z.coerce.number().int().min(0).default(0),
  avgShares: z.coerce.number().int().min(0).default(0),
  avgSaves: z.coerce.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false),
  audienceInsight: influencerAudienceInsightSchema.optional(),
  audienceLocations: z.array(influencerAudienceLocationSchema).max(20).optional(),
});
export type InfluencerPlatformInput = z.infer<typeof influencerPlatformSchema>;

export const influencerPricingItemSchema = z.object({
  deliverableTypeKey: z.enum(DELIVERABLE_TYPES),
  customLabel: z.string().max(80).optional().or(z.literal("")),
  price: z.coerce.number().positive("Enter a price greater than 0"),
  currency: z.string().max(10).optional().or(z.literal("")),
  isEnabled: z.boolean().default(true),
});
export type InfluencerPricingItemInput = z.infer<typeof influencerPricingItemSchema>;

// "Package" cards (brief §15) -- what a client now actually books against
// via bookingSubmissionSchema's `pricingCardId`, replacing
// influencerPricingItemSchema above's old "Required deliverables" role
// (that model/UI is retired but left in place). Admin caps how many of
// these an influencer may have (InfluencerSettings.maxPricingCards),
// enforced server-side on save. `isCustomQuote` cards skip the price
// requirement entirely -- the client picks the card to signal "I want this
// kind of package, quote me," and the influencer/admin negotiates the
// actual amount afterward.
export const influencerPricingCardSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(100),
    price: z.coerce.number().positive("Enter a price greater than 0").optional(),
    currency: z.string().max(10).optional().or(z.literal("")),
    estimatedDeliveryTime: z.string().max(60).optional().or(z.literal("")),
    description: z.string().max(1000).optional().or(z.literal("")),
    features: z.array(z.string().min(1).max(120)).max(20).default([]),
    isCustomQuote: z.boolean().default(false),
    isEnabled: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (!data.isCustomQuote && !data.price) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Enter a price greater than 0" });
    }
  });
export type InfluencerPricingCardInput = z.infer<typeof influencerPricingCardSchema>;

// Video-only, no metadata fields (deliberately simplified -- see
// InfluencerPortfolioItem's schema comment). Just the upload and visibility.
export const influencerPortfolioItemSchema = z.object({
  media: newMediaUploadSchema,
  isPublic: z.boolean().default(true),
});
export type InfluencerPortfolioItemInput = z.infer<typeof influencerPortfolioItemSchema>;

// The full "Become an Influencer" submission -- one shot, like the existing
// contact form, rather than a server-persisted multi-session wizard (no
// precedent for that anywhere in this codebase). Pricing/portfolio stay
// server-side defaults here (an approved influencer configures those from
// their dashboard, not at registration) and identity verification isn't
// collected at signup at all -- only real payout details are, held PENDING
// on InfluencerPayoutMethod until admin approves the application (see
// applicationPayoutMethodSchema above and influencer-applications.routes.ts).
export const influencerApplicationSchema = z.object({
  // Account
  name: z.string().min(2, "Name is required").max(120),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),

  // Profile
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30)
    .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Lowercase letters, numbers, and hyphens only"),
  tagline: z.string().max(160).optional().or(z.literal("")),
  bio: z.string().max(2000).optional().or(z.literal("")),
  // Despite the field name, this holds the full country name from
  // @agency/utils' COUNTRIES list (e.g. "Pakistan"), not an ISO alpha-2/3
  // code -- there's no vetted code-to-name table in this app, and every
  // country picker (this form, the self-profile editor, the contact form)
  // already renders/stores COUNTRIES' full names. Renaming the column is a
  // bigger migration than the mismatch warrants.
  countryCode: z.string().max(100).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  languages: z.array(z.string().min(1)).default([]),
  categoryIds: z.array(z.string()).min(1, "Select at least one category"),
  profilePhoto: newMediaUploadSchema.nullable().optional(),
  coverImage: newMediaUploadSchema.nullable().optional(),
  introVideo: newMediaUploadSchema.nullable().optional(),

  // Platforms -- pricing/portfolio are configured post-approval from the
  // dashboard, not collected here (brief update §3); the fields still exist
  // on InfluencerProfile/the self-profile schema below for that later step.
  platforms: z.array(influencerPlatformSchema).min(1, "Add at least one social platform"),

  // Creator Payout (brief update §4/§5) -- real details, not just a
  // preference; see applicationPayoutMethodSchema's comment for why this
  // stays PENDING rather than active immediately.
  payoutMethod: applicationPayoutMethodSchema,

  termsAccepted: z.boolean().refine((v) => v === true, { message: "You must accept the terms to apply" }),
});
export type InfluencerApplicationInput = z.infer<typeof influencerApplicationSchema>;

// Self-service profile edit (brief §18) -- reuses the same platform/pricing/
// portfolio item shapes as the application above, since the influencer
// dashboard's editors are the same sub-forms. Account fields (name/email/
// password) and identity/payout preference aren't editable here; those go
// through Better Auth's own flows / the dedicated payout-method endpoints.
export const influencerSelfProfileSchema = z.object({
  tagline: z.string().max(160).optional().or(z.literal("")),
  bio: z.string().max(2000).optional().or(z.literal("")),
  // Despite the field name, this holds the full country name from
  // @agency/utils' COUNTRIES list (e.g. "Pakistan"), not an ISO alpha-2/3
  // code -- there's no vetted code-to-name table in this app, and every
  // country picker (this form, the self-profile editor, the contact form)
  // already renders/stores COUNTRIES' full names. Renaming the column is a
  // bigger migration than the mismatch warrants.
  countryCode: z.string().max(100).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  languages: z.array(z.string().min(1)).default([]),
  categoryIds: z.array(z.string()).min(1, "Select at least one category"),
  availableForBooking: z.boolean().default(true),
  profilePhoto: newMediaUploadSchema.nullable().optional(),
  coverImage: newMediaUploadSchema.nullable().optional(),
  // Optional, not defaulted -- omitting a sub-list means "leave it
  // untouched" (see route handler). The alternative -- always requiring the
  // client to resubmit the complete list -- forces any caller that isn't
  // editing that section (e.g. the current Profile page, which only exposes
  // scalar fields) to reconstruct fake "new upload" data for items that
  // were never re-uploaded, which has no real Cloudinary publicId to send.
  platforms: z.array(influencerPlatformSchema).optional(),
  pricingItems: z.array(influencerPricingItemSchema).optional(),
  pricingCards: z.array(influencerPricingCardSchema).optional(),
  portfolioItems: z.array(influencerPortfolioItemSchema).optional(),
});
export type InfluencerSelfProfileInput = z.infer<typeof influencerSelfProfileSchema>;

export const influencerApplicationStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "NEEDS_MORE_INFO"]),
  note: z.string().max(2000).optional().or(z.literal("")),
});
export type InfluencerApplicationStatusInput = z.infer<typeof influencerApplicationStatusSchema>;

// Admin-managed badge catalog entry (brief §14) -- distinct from
// InfluencerBadgeAward, which just links a catalog badge to an influencer.
// `key` is the stable identifier badge-scoring.ts's automated pass matches
// against, so it's immutable after creation (accepted here for create, but
// the update route never lets it change -- see influencer-badges.routes.ts).
export const influencerBadgeSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and - only"),
  label: z.string().min(2, "Label is required").max(60),
  description: z.string().max(300).optional().or(z.literal("")),
  iconKey: z.string().max(60).optional().or(z.literal("")),
  color: badgeColorSchema,
  isAutomated: z.boolean().default(true),
  order: z.coerce.number().int().min(0).default(0),
});
export type InfluencerBadgeInput = z.infer<typeof influencerBadgeSchema>;

// Admin-authored testimonial for an influencer's public profile -- not
// tied to a real booking (InfluencerReview.bookingId stays null here),
// distinct from any future client-submitted review flow. influencerId is
// required so PATCH can move a review to a different influencer if admin
// picked the wrong one; the route recomputes both the old and new
// influencer's ratingAverage/ratingCount when that happens (see
// apps/api/src/routes/influencer-reviews.routes.ts).
export const influencerReviewSchema = z.object({
  influencerId: z.string().min(1, "Select an influencer"),
  authorName: z.string().min(1, "Name is required").max(150),
  authorCompany: z.string().max(150).nullable().optional(),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  comment: z.string().min(1, "Review text is required").max(2000),
  status: contentStatusSchema.default("PUBLISHED"),
});
export type InfluencerReviewInput = z.infer<typeof influencerReviewSchema>;
