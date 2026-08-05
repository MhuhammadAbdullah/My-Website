import type { SocialPlatformId } from "@agency/ui";
import { formatCurrency } from "@agency/utils";
import { HEX_COLOR_REGEX } from "@agency/types";

// Maps the Prisma SocialPlatform enum (used throughout the influencer
// domain) to @agency/ui's lowercase SocialIcon ids. Snapchat has no brand
// icon in that shared set (packages/ui/src/social-icons.tsx) -- callers fall
// back to the plain label for it.
const PLATFORM_ICON_ID: Partial<Record<string, SocialPlatformId>> = {
  INSTAGRAM: "instagram",
  TIKTOK: "tiktok",
  YOUTUBE: "youtube",
  FACEBOOK: "facebook",
  LINKEDIN: "linkedin",
  TWITTER_X: "x",
  PINTEREST: "pinterest",
  THREADS: "threads",
};

const PLATFORM_LABEL: Record<string, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  TWITTER_X: "X (Twitter)",
  PINTEREST: "Pinterest",
  SNAPCHAT: "Snapchat",
  THREADS: "Threads",
};

export function platformIconId(platform: string): SocialPlatformId | undefined {
  return PLATFORM_ICON_ID[platform];
}

export function platformLabel(platform: string): string {
  return PLATFORM_LABEL[platform] ?? platform;
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function formatEngagementRate(value: string | number): string {
  return `${Number(value).toFixed(1)}%`;
}

export function formatStartingPrice(price: { price: string | number; currency: string | null } | null): string {
  if (!price) return "Custom pricing";
  return `From ${formatCurrency(Number(price.price), price.currency || "USD")}`;
}

// "20% OFF" for a PERCENT discount, "$10 OFF" for a FIXED one -- the badge
// shown alongside a struck-through original price on influencer/pricing
// cards once a live auto-apply discount applies.
export function formatDiscountBadge(discount: { type: "PERCENT" | "FIXED"; value: number } | null, currency: string | null): string | null {
  if (!discount) return null;
  return discount.type === "PERCENT" ? `${discount.value}% OFF` : `${formatCurrency(discount.value, currency || "USD")} OFF`;
}

export function formatDiscountedPrice(price: { price: string | number; currency: string | null }, amountOff: number): string {
  return formatCurrency(Math.max(0, Number(price.price) - amountOff), price.currency || "USD");
}

// Each seeded InfluencerBadge carries its own Tailwind color family (see
// packages/database/prisma/seed.ts) -- solid/saturated here (not the pastel
// bg-50 used for the badges elsewhere on the page) because these render as
// an overlay on top of a photo on the influencer card, same contrast need
// as the "Featured" badge they sit alongside. Literal class strings (not
// template-interpolated) so Tailwind's scanner picks them up.
const BADGE_SOLID_CLASSES: Record<string, string> = {
  amber: "bg-amber-500 text-white",
  emerald: "bg-emerald-500 text-white",
  orange: "bg-orange-500 text-white",
  rose: "bg-rose-500 text-white",
  blue: "bg-blue-500 text-white",
  violet: "bg-violet-500 text-white",
  sky: "bg-sky-500 text-white",
  yellow: "bg-yellow-500 text-neutral-900",
  purple: "bg-purple-500 text-white",
  pink: "bg-pink-500 text-white",
};

export interface BadgeColorProps {
  className: string;
  style?: { backgroundColor: string };
}

// Rough relative-luminance check so an admin-entered hex color still gets
// readable text -- same idea as the preset palette's yellow using dark text
// while every other preset uses white.
function readableTextClass(hex: string): string {
  const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  const r = Number.parseInt(full.slice(1, 3), 16);
  const g = Number.parseInt(full.slice(3, 5), 16);
  const b = Number.parseInt(full.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "text-neutral-900" : "text-white";
}

// `color` is either a name from BADGE_SOLID_CLASSES (rendered with the
// static Tailwind classes above, so Tailwind's build-time scanner can see
// them) or an admin-entered hex code (rendered with an inline style
// instead -- Tailwind can't generate a class for a color it doesn't know
// about at build time, e.g. `bg-[${color}]` with a runtime value never
// makes it into the compiled CSS).
export function badgeColorProps(color: string | null): BadgeColorProps {
  if (color && HEX_COLOR_REGEX.test(color)) {
    return { className: readableTextClass(color), style: { backgroundColor: color } };
  }
  return { className: (color && BADGE_SOLID_CLASSES[color]) || "bg-heading text-background" };
}

// Same as badgeColorProps, but defaults to rose instead of the neutral
// heading/background fallback -- an admin-unset discount badge should
// still read as a "sale" tag, not blend in like an unstyled badge.
const DEFAULT_DISCOUNT_BADGE_CLASSES = "bg-rose-500 text-white";

export function discountBadgeColorProps(color: string | null): BadgeColorProps {
  if (color && HEX_COLOR_REGEX.test(color)) {
    return { className: readableTextClass(color), style: { backgroundColor: color } };
  }
  return { className: (color && BADGE_SOLID_CLASSES[color]) || DEFAULT_DISCOUNT_BADGE_CLASSES };
}

export function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
