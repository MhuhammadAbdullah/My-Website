import { ACCENT_HEX, type AccentId } from "@agency/types";
import type { SiteSettings } from "@/lib/types";

/** The site's accent colour as #rrggbb (preset or the custom one picked in Admin > Site Settings > Theme). */
export function accentHex(settings: SiteSettings): string {
  const t = settings.theme;
  if (t?.accent === "custom" && t.customColor && /^#[0-9a-fA-F]{6}$/.test(t.customColor)) return t.customColor;
  const preset = t?.accent && t.accent !== "custom" ? ACCENT_HEX[t.accent as AccentId] : undefined;
  return preset ?? ACCENT_HEX.lime;
}

export const APP_BG_DARK = "#0b0b0c";
export const APP_BG_LIGHT = "#f6f6f2";

/** Splash / title-bar colour of the installed app follows the default look chosen in Site Settings. */
export function appBackground(settings: SiteSettings): string {
  return settings.theme?.mode === "light" ? APP_BG_LIGHT : APP_BG_DARK;
}
