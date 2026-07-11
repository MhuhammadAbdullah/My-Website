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
