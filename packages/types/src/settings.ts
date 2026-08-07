import { z } from "zod";
import { ALL_CURRENCIES } from "./currencies.js";

// Keep in sync with SOCIAL_PLATFORMS in @agency/ui/social-icons.tsx (the icon
// set lives there since it's presentation-only; this package stays React-free).
export const SOCIAL_PLATFORM_IDS = [
  "facebook",
  "instagram",
  "linkedin",
  "x",
  "youtube",
  "behance",
  "dribbble",
  "tiktok",
  "pinterest",
  "github",
  "threads",
  "medium",
  "whatsapp",
  "telegram",
] as const;
export type SocialPlatformId = (typeof SOCIAL_PLATFORM_IDS)[number];

const optionalUrl = z.string().url().optional().or(z.literal(""));

export const socialLinksSchema = z.object({
  facebook: optionalUrl,
  instagram: optionalUrl,
  linkedin: optionalUrl,
  x: optionalUrl,
  youtube: optionalUrl,
  behance: optionalUrl,
  dribbble: optionalUrl,
  tiktok: optionalUrl,
  pinterest: optionalUrl,
  github: optionalUrl,
  threads: optionalUrl,
  medium: optionalUrl,
  whatsapp: optionalUrl,
  telegram: optionalUrl,
});
export type SocialLinksInput = z.infer<typeof socialLinksSchema>;

// Sourced from Intl's ISO 4217 table (see ./currencies.ts) — all ~160
// internationally recognized currencies, not a hardcoded shortlist.
export const CURRENCY_OPTIONS = ALL_CURRENCIES.map((c) => ({
  code: c.code,
  symbol: c.symbol,
  label: c.name,
}));
export const CURRENCY_CODES = CURRENCY_OPTIONS.map((c) => c.code);
export type CurrencyCode = string;

const CURRENCY_CODE_SET = new Set(CURRENCY_CODES);
export const currencySchema = z.string().refine((val) => CURRENCY_CODE_SET.has(val), {
  message: "Invalid currency code",
});

export const DEFAULT_CURRENCY: CurrencyCode = "PKR";

export const BRANDING_DISPLAY_MODES = ["LOGO", "TEXT"] as const;
export type BrandingDisplayMode = (typeof BRANDING_DISPLAY_MODES)[number];

export const brandingSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  logoMediaId: z.string().nullable(),
  logoUrl: z.string().nullable(),
  displayMode: z.enum(BRANDING_DISPLAY_MODES),
  // Independent from the header logo above -- null means "reuse the header
  // logo in the footer too" (see resolveBranding() in apps/web), not "show
  // no logo in the footer".
  footerLogoMediaId: z.string().nullable(),
  footerLogoUrl: z.string().nullable(),
});
export type BrandingInput = z.infer<typeof brandingSchema>;

export const TECH_STACK_DISPLAY_MODES = ["TAGS", "MARQUEE"] as const;
export type TechStackDisplayMode = (typeof TECH_STACK_DISPLAY_MODES)[number];

export const techStackDisplaySchema = z.enum(TECH_STACK_DISPLAY_MODES);

// Each ID is independently optional -- every tracking integration on the
// frontend only loads when its own field is non-empty, so validation here
// only needs to reject a *non-empty* value that doesn't look like the ID
// format the given provider actually issues. Custom scripts are allowed
// through mostly as-is (trusted admin input, gated behind the "settings"
// RBAC resource, which only Super Admin holds -- see seed.ts) but are
// length-capped to stop accidental multi-MB pastes from bloating every page.
const optionalPattern = (regex: RegExp, message: string) =>
  z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => v === "" || regex.test(v), { message });

export const integrationsSchema = z.object({
  gtmId: optionalPattern(/^GTM-[A-Z0-9]+$/i, "Enter a valid GTM container ID, e.g. GTM-XXXXXXX."),
  ga4Id: optionalPattern(/^G-[A-Z0-9]+$/i, "Enter a valid GA4 Measurement ID, e.g. G-XXXXXXXXXX."),
  metaPixelId: optionalPattern(/^\d{5,20}$/, "Enter a numeric Meta Pixel ID, e.g. 123456789123456."),
  googleAdsId: optionalPattern(/^AW-\d{5,15}$/i, "Enter a valid Google Ads Conversion ID, e.g. AW-123456789."),
  googleAdsConversionLabel: z.string().trim().max(100).optional().default(""),
  clarityId: optionalPattern(/^[a-zA-Z0-9]{5,20}$/, "Enter a valid Microsoft Clarity Project ID."),
  googleSiteVerification: z.string().trim().max(300).optional().default(""),
  headScript: z.string().max(20_000, "Head script is too long (max 20,000 characters).").optional().default(""),
  bodyScript: z.string().max(20_000, "Body script is too long (max 20,000 characters).").optional().default(""),
  footerScript: z.string().max(20_000, "Footer script is too long (max 20,000 characters).").optional().default(""),
});
export type IntegrationsInput = z.infer<typeof integrationsSchema>;

// Influencer Marketplace kill-switches (brief §29) -- reuses the exact same
// SiteSetting-blob mechanism as `integrations` above: `GET /settings` is
// public/unauthenticated, so apps/web reads this key directly to gate
// listing/detail/booking routes with zero extra API surface and zero
// redeploy required to flip a toggle.
export const influencerFlagsSchema = z.object({
  marketplaceEnabled: z.boolean().default(true),
  registrationEnabled: z.boolean().default(true),
  bookingsEnabled: z.boolean().default(true),
  // Rich-text (HTML from the admin's rich-text editor), shown in place of
  // the marketplace when marketplaceEnabled is false.
  maintenanceNotice: z.string().max(5000).optional().default(""),
  registrationClosedMessage: z
    .string()
    .max(2000)
    .optional()
    .default("Influencer registrations are currently closed. Please check back later."),
  bookingsDisabledMessage: z
    .string()
    .max(2000)
    .optional()
    .default("Bookings are temporarily unavailable right now. Please check back later."),
});
export type InfluencerFlagsInput = z.infer<typeof influencerFlagsSchema>;

// Admin-manageable copy for the "Video Guide" modal on the registration
// form's Introduction Video field -- rich-text (HTML from the admin's
// rich-text editor) so admin can rewrite the steps/wording without a code
// change, same mechanism as `influencerFlagsSchema.maintenanceNotice`.
export const influencerVideoGuideSchema = z.object({
  content: z.string().max(10_000).optional().default(""),
});
export type InfluencerVideoGuideInput = z.infer<typeof influencerVideoGuideSchema>;

// Admin-manageable copy for the dashboard's "Platform Insights Guide" page --
// one rich-text field per platform (same mechanism/pattern as
// influencerVideoGuideSchema above), so admin can rewrite where-to-find-your-
// analytics instructions without a code change. Empty string per platform
// means "not customized yet" -- the web app falls back to a sensible default
// in that case, same convention as influencer_flags' maintenanceNotice.
// Admin-manageable copy for the commission notice banner shown at the top of
// the influencer dashboard's Earnings page -- same content-blob mechanism as
// influencerVideoGuideSchema, but plain text (not rich text) since it's a
// one-line disclosure rather than a multi-step guide, and an `enabled` flag
// so admin can hide the banner entirely without clearing the saved copy.
export const influencerCommissionNoticeSchema = z.object({
  enabled: z.boolean().default(true),
  content: z
    .string()
    .max(2000)
    .optional()
    .default(
      "Admin charges a commission on every completed booking before it's paid out to you. The amounts shown below are your net earnings after commission.",
    ),
});
export type InfluencerCommissionNoticeInput = z.infer<typeof influencerCommissionNoticeSchema>;

export const influencerInsightsGuideSchema = z.object({
  instagram: z.string().max(10_000).optional().default(""),
  tiktok: z.string().max(10_000).optional().default(""),
  youtube: z.string().max(10_000).optional().default(""),
  facebook: z.string().max(10_000).optional().default(""),
  linkedin: z.string().max(10_000).optional().default(""),
  x: z.string().max(10_000).optional().default(""),
});
export type InfluencerInsightsGuideInput = z.infer<typeof influencerInsightsGuideSchema>;
