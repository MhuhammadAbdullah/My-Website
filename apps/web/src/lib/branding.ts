import type { SiteSettings } from "@/lib/types";
import { cloudinaryTransform } from "@/lib/cloudinary";

export interface ResolvedBranding {
  name: string;
  logoUrl: string | null;
}

// Single source of truth for "Logo mode + no logo yet -> fall back to the
// brand name" so the header and footer can never disagree with each other.
export function resolveBranding(settings: SiteSettings, fallbackName: string): ResolvedBranding {
  const branding = settings.branding;
  const name = branding?.brandName || settings.company_name || fallbackName;
  const showLogo = branding?.displayMode === "LOGO" && !!branding.logoUrl;

  return {
    name,
    logoUrl: showLogo ? cloudinaryTransform(branding.logoUrl!, "f_auto,q_auto") : null,
  };
}
