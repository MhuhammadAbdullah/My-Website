"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarClock, LayoutDashboard, User, Wallet } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, cn } from "@agency/ui";
import { influencerAuthClient } from "@/lib/influencer-auth-client";
import { InfluencerBrand, InfluencerSidebar, InfluencerSidebarNav } from "./dashboard-sidebar";
import { InfluencerDashboardTopbar } from "./dashboard-topbar";

const COLLAPSE_STORAGE_KEY = "influencer-sidebar-collapsed";

// The four things creators do most, always one tap away on a phone.
const QUICK_TABS = [
  { label: "Home", href: "/influencer/dashboard", icon: LayoutDashboard },
  { label: "Bookings", href: "/influencer/dashboard/bookings", icon: CalendarClock },
  { label: "Earnings", href: "/influencer/dashboard/earnings", icon: Wallet },
  { label: "Profile", href: "/influencer/dashboard/profile", icon: User },
];

export function InfluencerDashboardShell({ name, children }: { name: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Tighter corner radii for everything on this page, popups included (they render outside this element).
  React.useEffect(() => {
    document.documentElement.classList.add("influencer-dash-root");
    return () => document.documentElement.classList.remove("influencer-dash-root");
  }, []);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  async function handleSignOut() {
    await influencerAuthClient.signOut();
    router.push("/influencers");
    router.refresh();
  }

  return (
    <div className="influencer-dash flex min-h-dvh">
      <InfluencerSidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} name={name} onSignOut={handleSignOut} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-4">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <div className="px-1 py-2">
            <InfluencerBrand />
          </div>
          <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-neutral-200 pt-4">
            <InfluencerSidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
          <button type="button" onClick={handleSignOut} className="mt-3 w-full rounded-full border border-neutral-300 px-5 py-2.5 text-body-sm font-semibold text-heading hover:border-accent-500">
            Sign out
          </button>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <InfluencerDashboardTopbar name={name} onMenuClick={() => setMobileOpen(true)} onSignOut={handleSignOut} />
        <main className="flex-1 overflow-x-hidden p-4 pb-24 sm:p-6 md:pb-8 lg:px-8">{children}</main>
      </div>

      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-neutral-200 bg-background/95 backdrop-blur-xl md:hidden">
        {QUICK_TABS.map((t) => {
          const active = pathname === t.href || (t.href !== "/influencer/dashboard" && pathname.startsWith(`${t.href}/`));
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold transition-colors", active ? "text-accent-500" : "text-neutral-500")}>
              <Icon className="size-5" aria-hidden />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
