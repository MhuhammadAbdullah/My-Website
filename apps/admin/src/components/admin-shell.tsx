"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetTitle } from "@agency/ui";
import { AdminSidebar, AdminBrandMark, SidebarNav } from "@/components/admin-sidebar";
import { AdminTopbar } from "@/components/admin-topbar";
import { AdminRouteGuard } from "@/components/admin-route-guard";
import { useSiteBranding } from "@/lib/use-site-branding";

const COLLAPSE_STORAGE_KEY = "admin-sidebar-collapsed";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { brandName } = useSiteBranding();

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
    <div className="flex min-h-screen">
      <AdminSidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-4">
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <div className="flex items-center gap-2.5 px-2 py-3">
            <AdminBrandMark />
            <div className="min-w-0">
              <p className="truncate font-heading text-body font-semibold text-heading">{brandName}</p>
              <p className="truncate text-body-sm text-neutral-400">Admin panel</p>
            </div>
          </div>
          <div className="scrollbar-thin mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
            <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
          <AdminRouteGuard>{children}</AdminRouteGuard>
        </main>
      </div>
    </div>
  );
}
