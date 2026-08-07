"use client";

import * as React from "react";
import { request } from "./api";
import type { SiteSettings } from "./types";

interface SiteBrandingValue {
  brandName: string;
  logoUrl: string | null;
  loading: boolean;
}

const DEFAULT_BRAND_NAME = "MAB Digital";

const SiteBrandingContext = React.createContext<SiteBrandingValue | null>(null);

// Mirrors use-permissions.tsx's provider pattern: one shared fetch of the
// public /settings endpoint, mounted once in the dashboard layout so the
// sidebar, mobile menu, and topbar all reflect whatever logo the admin set
// in Settings > Branding without each independently re-fetching. `logoUrl`
// is only surfaced when displayMode is "LOGO" -- a brand admin who picked
// "TEXT" display deliberately doesn't want an image shown anywhere,
// including here, so this respects that same choice apps/web's header does.
export function SiteBrandingProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = React.useState<Omit<SiteBrandingValue, "loading">>({
    brandName: DEFAULT_BRAND_NAME,
    logoUrl: null,
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    request<{ settings: SiteSettings }>("/settings")
      .then((r) => {
        if (cancelled) return;
        const branding = r.settings.branding;
        setValue({
          brandName: branding?.brandName || DEFAULT_BRAND_NAME,
          logoUrl: branding?.displayMode === "LOGO" ? (branding.logoUrl ?? null) : null,
        });
      })
      .catch(() => {
        if (!cancelled) setValue({ brandName: DEFAULT_BRAND_NAME, logoUrl: null });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ctx = React.useMemo(() => ({ ...value, loading }), [value, loading]);

  return <SiteBrandingContext.Provider value={ctx}>{children}</SiteBrandingContext.Provider>;
}

export function useSiteBranding() {
  const ctx = React.useContext(SiteBrandingContext);
  if (!ctx) throw new Error("useSiteBranding must be used within SiteBrandingProvider");
  return ctx;
}
