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
