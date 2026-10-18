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
  // Noir Lime additions -- all optional so payloads from before this change
  // (and rows already stored) still validate untouched.
  // Logo variant designed for the dark theme; the header/footer prefer it
  // over `logoUrl` and warn in admin when it is missing.
  logoDarkMediaId: z.string().nullable().optional().default(null),
  logoDarkUrl: z.string().nullable().optional().default(null),
  faviconMediaId: z.string().nullable().optional().default(null),
  faviconUrl: z.string().nullable().optional().default(null),
  footerTagline: z.string().trim().max(240).optional().default(""),
  // Supports {year} and {brand} tokens. Empty = "(c) {year} {brand}. All rights reserved."
  copyrightText: z.string().trim().max(240).optional().default(""),
  // Display name on outgoing email ("Name <address>"). Empty = brand name.
  emailSenderName: z.string().trim().max(80).optional().default(""),
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
  // Cloudflare Turnstile SITE key (public). The secret key is the
  // TURNSTILE_SECRET_KEY env var on apps/api -- never stored here.
  turnstileSiteKey: z.string().trim().max(100).optional().default(""),
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

// Sitewide scrolling announcement bar shown above the header on every public
// page (SiteChrome). Same SiteSetting-blob mechanism as `influencer_flags`
// above -- `enabled` lets admin hide it instantly without losing saved
// colors/messages, `messages` is one marquee loop of N items (the web app
// duplicates the array once and translates -50% for a seamless CSS-only
// loop, same technique as TechMarquee/ReviewsMarquee).
// Internal paths ("/about", "#faq"), absolute URLs, mailto:/tel: -- never "javascript:".
export const linkHrefSchema = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^(\/|#|https?:\/\/|mailto:|tel:)/i.test(v), {
    message: "Use a path like /contact, a full https:// URL, mailto: or tel:.",
  });

const hexColor = (fallback: string) =>
  z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Enter a valid hex color, e.g. #111111.")
    .default(fallback);

export const announcementBarSchema = z.object({
  enabled: z.boolean().default(false),
  backgroundColor: hexColor("#111111"),
  textColor: hexColor("#ffffff"),
  messages: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  link: linkHrefSchema.optional().default(""),
  dismissible: z.boolean().optional().default(false),
});
export type AnnouncementBarInput = z.infer<typeof announcementBarSchema>;

export const influencerInsightsGuideSchema = z.object({
  instagram: z.string().max(10_000).optional().default(""),
  tiktok: z.string().max(10_000).optional().default(""),
  youtube: z.string().max(10_000).optional().default(""),
  facebook: z.string().max(10_000).optional().default(""),
  linkedin: z.string().max(10_000).optional().default(""),
  x: z.string().max(10_000).optional().default(""),
});
export type InfluencerInsightsGuideInput = z.infer<typeof influencerInsightsGuideSchema>;

// ---------------------------------------------------------------------------
// Site Settings (Noir Lime foundation)
//
// Each of these is one `SiteSetting` row, same blob mechanism as the keys
// above. `GET /settings` is public, so nothing secret may live in these --
// see PRIVATE_SETTING_KEYS for the keys that are withheld from it.
// ---------------------------------------------------------------------------

export const ACCENT_OPTIONS = ["lime", "orange", "blue", "yellow"] as const;
export type AccentId = (typeof ACCENT_OPTIONS)[number];
export const ACCENT_HEX: Record<AccentId, string> = {
  lime: "#C8F25A",
  orange: "#FF7A3D",
  blue: "#7AA2FF",
  yellow: "#F5D547",
};

export const themeSchema = z.object({
  accent: z.enum(ACCENT_OPTIONS).default("lime"),
});
export type ThemeInput = z.infer<typeof themeSchema>;

export const headerSettingsSchema = z.object({
  ctaVisible: z.boolean().default(true),
  ctaLabel: z.string().trim().max(40).default("Book a call"),
  ctaHref: linkHrefSchema.default("/contact"),
  ctaNewTab: z.boolean().default(false),
});
export type HeaderSettingsInput = z.infer<typeof headerSettingsSchema>;

const footerLinkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: linkHrefSchema,
  newTab: z.boolean().default(false),
});
export const footerColumnsSchema = z
  .array(
    z.object({
      title: z.string().trim().min(1).max(60),
      links: z.array(footerLinkSchema).max(12),
    }),
  )
  .max(6);
export type FooterColumnsInput = z.infer<typeof footerColumnsSchema>;

export const legalLinksSchema = z.array(footerLinkSchema).max(8);
export type LegalLinksInput = z.infer<typeof legalLinksSchema>;

export const SOCIAL_FOOTER_PLATFORMS = ["facebook", "instagram", "linkedin", "x", "youtube", "github"] as const;

export const seoDefaultsSchema = z.object({
  // `%s` = page title, `{brand}` = brand name from Branding.
  titleTemplate: z.string().trim().max(120).default("%s | {brand}"),
  defaultTitle: z.string().trim().max(120).default("{brand}"),
  description: z.string().trim().max(300).default(""),
  ogImageUrl: z.string().trim().max(500).default(""),
  twitterHandle: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || /^@?\w{1,15}$/.test(v), { message: "Enter a valid handle, e.g. @yourbrand." }),
});
export type SeoDefaultsInput = z.infer<typeof seoDefaultsSchema>;

export const organizationSchema = z.object({
  legalName: z.string().trim().max(120).default(""),
  description: z.string().trim().max(500).default(""),
  foundingDate: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || /^\d{4}(-\d{2}(-\d{2})?)?$/.test(v), { message: "Use YYYY, YYYY-MM or YYYY-MM-DD." }),
  areaServed: z.string().trim().max(120).default(""),
});
export type OrganizationInput = z.infer<typeof organizationSchema>;

export const BUSINESS_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type BusinessDay = (typeof BUSINESS_DAYS)[number];
const timeOrEmpty = z.string().refine((v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), { message: "Use HH:MM." });
const businessDaySchema = z.object({
  closed: z.boolean().default(false),
  open: timeOrEmpty.default("09:00"),
  close: timeOrEmpty.default("18:00"),
});
export const businessHoursSchema = z.object({
  mon: businessDaySchema,
  tue: businessDaySchema,
  wed: businessDaySchema,
  thu: businessDaySchema,
  fri: businessDaySchema,
  sat: businessDaySchema,
  sun: businessDaySchema,
});
export type BusinessHoursInput = z.infer<typeof businessHoursSchema>;

export const timezoneSchema = z.string().refine(
  (tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { message: "Enter a valid IANA timezone, e.g. Asia/Karachi." },
);
export const DEFAULT_TIMEZONE = "Asia/Karachi";

export const whatsappNumberSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\+?[0-9 ()-]{7,20}$/.test(v), { message: "Enter a valid phone number, e.g. +923001234567." });

/** Builds the wa.me link; returns "" when there is no usable number. */
export function buildWhatsAppLink(number: string | undefined, message?: string): string {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 7) return "";
  const text = message?.trim();
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

// Private (never in the public GET /settings): where admin alerts go.
export const PRIVATE_SETTING_KEYS = ["notifications"] as const;
export const notificationsSchema = z.object({
  emails: z.array(z.string().trim().email()).max(10).default([]),
});
export type NotificationsInput = z.infer<typeof notificationsSchema>;
