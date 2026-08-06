"use client";

import { usePathname } from "next/navigation";
import type { NavItemRead, SiteSettings } from "@/lib/types";
import type { ResolvedBranding } from "@/lib/branding";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

// The influencer dashboard is its own admin-style app-shell (sidebar + topbar,
// see InfluencerDashboardShell) and manages its own chrome entirely, so the
// marketing SiteHeader/SiteFooter -- and the pt-32 offset that reserves space
// for the fixed header -- would just add a duplicate, unwanted layer on top
// of it. Gating on pathname here (rather than a route group) keeps every
// other route's layout untouched.
const CHROME_LESS_PREFIXES = ["/influencer/dashboard"];

export function SiteChrome({
  headerNav,
  footerNav,
  settings,
  branding,
  children,
}: {
  headerNav: NavItemRead[];
  footerNav: NavItemRead[];
  settings: SiteSettings;
  branding: ResolvedBranding;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideChrome = CHROME_LESS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (hideChrome) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader navItems={headerNav} branding={branding} />
      <main className="pt-32">{children}</main>
      <SiteFooter navItems={footerNav} settings={settings} branding={branding} />
    </>
  );
}
