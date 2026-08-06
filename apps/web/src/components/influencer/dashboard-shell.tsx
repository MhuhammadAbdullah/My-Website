"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetTitle } from "@agency/ui";
import { InfluencerSidebar, InfluencerSidebarNav } from "./dashboard-sidebar";
import { InfluencerDashboardTopbar } from "./dashboard-topbar";

const COLLAPSE_STORAGE_KEY = "influencer-sidebar-collapsed";

export function InfluencerDashboardShell({ name, children }: { name: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

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

  return (
    <div className="flex min-h-dvh">
      <InfluencerSidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-4">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <div className="flex items-center gap-2.5 px-2 py-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-heading text-body-sm font-bold text-white">
              I
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-body font-semibold text-heading">Influencer</p>
              <p className="truncate text-body-sm text-neutral-400">Partner panel</p>
            </div>
          </div>
          <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
            <InfluencerSidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <InfluencerDashboardTopbar name={name} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
