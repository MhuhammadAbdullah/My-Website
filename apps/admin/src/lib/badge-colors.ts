import { BADGE_COLORS, HEX_COLOR_REGEX, type BadgeColorId } from "@agency/types";

// Solid Tailwind classes per palette color, for the small dot preview shown
// next to each option in ColorSelect and next to already-saved rows in
// list tables -- literal class strings (not template-interpolated) so
// Tailwind's scanner picks them up, same reasoning as the web app's
// badgeSolidClasses (apps/web/src/lib/influencer-format.ts), which this
// mirrors so admin-picked colors render identically on the public site.
export const BADGE_COLOR_DOT_CLASSES: Record<BadgeColorId, string> = {
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  orange: "bg-orange-500",
  rose: "bg-rose-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  sky: "bg-sky-500",
  yellow: "bg-yellow-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
};

export const BADGE_COLOR_OPTIONS = BADGE_COLORS.map((color) => ({
  value: color,
  label: color.charAt(0).toUpperCase() + color.slice(1),
}));

export function isPresetColor(color: string): color is BadgeColorId {
  return (BADGE_COLORS as readonly string[]).includes(color);
}

export { BADGE_COLORS, HEX_COLOR_REGEX };
export type { BadgeColorId };
