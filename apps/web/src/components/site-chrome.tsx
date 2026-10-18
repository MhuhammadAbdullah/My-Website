"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { cn } from "@agency/ui";
import type { NavItemRead, SiteSettings, PopupRead } from "@/lib/types";
import type { ResolvedBranding } from "@/lib/branding";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnnouncementBar } from "@/components/announcement-bar";
import { getVisibleAnnouncementMessages } from "@/lib/announcement";

// ssr:false -- popups are a fully client-driven overlay (targeting/trigger
// logic needs pathname/viewport, only known post-hydration), so there's no
// benefit to including this in the server-rendered payload or the initial
// client bundle; it loads once the page is already interactive.
const PopupProvider = dynamic(() => import("@/components/popups/popup-provider").then((m) => m.PopupProvider), { ssr: false });

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
  popups,
  children,
}: {
  headerNav: NavItemRead[];
  footerNav: NavItemRead[];
  settings: SiteSettings;
  branding: ResolvedBranding;
  popups: PopupRead[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [dismissed, setDismissed] = React.useState(false);

  // A dismissed announcement stays dismissed until its text/link changes.
  const announcementKey = React.useMemo(() => {
    const bar = settings.announcement_bar;
    const raw = JSON.stringify([bar?.messages, bar?.link]);
    let h = 0;
    for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
    return `announcement-dismissed:${h}`;
  }, [settings.announcement_bar]);

  React.useEffect(() => {
    try {
      setDismissed(localStorage.getItem(announcementKey) === "1");
    } catch {
      /* storage unavailable: just show the bar */
    }
  }, [announcementKey]);

  const hideChrome = CHROME_LESS_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (hideChrome) {
    return <>{children}</>;
  }

  const dismissible = !!settings.announcement_bar?.dismissible;
  const hasAnnouncement = getVisibleAnnouncementMessages(settings.announcement_bar).length > 0 && !(dismissible && dismissed);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(announcementKey, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only z-[100] rounded-full bg-accent-500 px-4 py-2 font-bold text-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      {hasAnnouncement && <AnnouncementBar settings={settings.announcement_bar} onDismiss={dismissible ? dismiss : undefined} />}
      <SiteHeader navItems={headerNav} branding={branding} header={settings.header} hasAnnouncement={hasAnnouncement} />
      <main id="main" className={cn(hasAnnouncement ? "pt-40" : "pt-32")}>
        {children}
      </main>
      <SiteFooter navItems={footerNav} settings={settings} branding={branding} />
      {popups.length > 0 && <PopupProvider popups={popups} />}
    </>
  );
}
