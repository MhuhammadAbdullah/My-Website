import type { SiteSettings } from "@/lib/types";
import { cloudinaryTransform } from "@/lib/cloudinary";

export interface ResolvedBranding {
  name: string;
  logoUrl: string | null;
  footerLogoUrl: string | null;
}

// Single source of truth for "Logo mode + no logo yet -> fall back to the
// brand name" so the header and footer can never disagree with each other.
export function resolveBranding(settings: SiteSettings, fallbackName: string): ResolvedBranding {
  const branding = settings.branding;
  const name = branding?.brandName || settings.company_name || fallbackName;
  const isLogoMode = branding?.displayMode === "LOGO";

  // Footer logo falls back to the header logo when no footer-specific
  // override has been uploaded -- it's a separate asset, not a separate
  // on/off switch (that's still just `displayMode`).
  const rawLogoUrl = branding?.logoUrl;
  const rawFooterLogoUrl = branding?.footerLogoUrl || rawLogoUrl;

  return {
    name,
    logoUrl: isLogoMode && rawLogoUrl ? cloudinaryTransform(rawLogoUrl, "f_auto,q_auto") : null,
    footerLogoUrl: isLogoMode && rawFooterLogoUrl ? cloudinaryTransform(rawFooterLogoUrl, "f_auto,q_auto") : null,
  };
}
