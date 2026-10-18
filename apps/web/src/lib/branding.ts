import type { SiteSettings } from "@/lib/types";
import { cloudinaryTransform } from "@/lib/cloudinary";
import { getSettings } from "@/lib/api";

export interface ResolvedBranding {
  name: string;
  /** Header logo, preferring the dark-background variant (the site theme is dark). */
  logoUrl: string | null;
  footerLogoUrl: string | null;
  faviconUrl: string | null;
  footerTagline: string;
  /** Final copyright line, tokens already filled in. */
  copyright: string;
}

/** Replaces {brand} and {year} tokens. */
export function fillTokens(text: string, brand: string, year = new Date().getFullYear()): string {
  return text.replace(/\{brand\}/g, brand).replace(/\{year\}/g, String(year)).replace(/\s{2,}/g, " ").trim();
}

// Single source of truth for "Logo mode + no logo yet -> fall back to the
// brand name" so the header and footer can never disagree with each other.
export function resolveBranding(settings: SiteSettings, fallbackName: string): ResolvedBranding {
  const branding = settings.branding;
  const name = branding?.brandName || settings.company_name || fallbackName;
  const isLogoMode = branding?.displayMode === "LOGO";

  // The theme is dark, so the dark-background logo wins when one is uploaded.
  // Footer logo falls back to the header logo when no footer-specific
  // override has been uploaded -- it's a separate asset, not a separate
  // on/off switch (that's still just `displayMode`).
  // No dedicated dark logo yet? The footer logo is, by convention, the light-on-dark one, so it beats the standard logo.
  const headerLogo = branding?.logoDarkUrl || branding?.footerLogoUrl || branding?.logoUrl;
  const footerLogo = branding?.logoDarkUrl || branding?.footerLogoUrl || branding?.logoUrl;
  const transform = (url: string | null | undefined) => (isLogoMode && url ? cloudinaryTransform(url, "f_auto,q_auto") : null);

  const copyrightTemplate = branding?.copyrightText?.trim() || "© {year} {brand}. All rights reserved.";

  return {
    name,
    logoUrl: transform(headerLogo),
    footerLogoUrl: transform(footerLogo),
    faviconUrl: branding?.faviconUrl || null,
    footerTagline: branding?.footerTagline ?? "",
    copyright: fillTokens(copyrightTemplate, name),
  };
}

// Server-side brand name for metadata / JSON-LD. The name always comes from
// Site Settings (Admin > Branding); there is deliberately no brand literal in
// code, so when settings can't be loaded this is an empty string and callers
// omit the brand rather than show a stale or invented one.
export async function getBrandName(): Promise<string> {
  const settings = await getSettings().catch(() => null);
  return resolveBranding(settings ?? {}, "").name;
}
