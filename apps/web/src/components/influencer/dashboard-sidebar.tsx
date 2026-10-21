"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, LogOut } from "lucide-react";
import { cn } from "@agency/ui";
import { influencerNavItems } from "@/lib/influencer-nav-config";

function isActive(href: string, pathname: string) {
  return pathname === href || (href !== "/influencer/dashboard" && pathname.startsWith(`${href}/`));
}

export function InfluencerSidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex-1 space-y-1">
      {influencerNavItems.map((item) => {
        const active = isActive(item.href, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center rounded-[10px] text-body-sm font-semibold transition-colors",
              collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
              active ? "bg-accent-500 text-on-accent" : "text-neutral-500 hover:bg-neutral-100 hover:text-heading",
            )}
          >
            <Icon className="size-[1.125rem] shrink-0" aria-hidden />
            {!collapsed && item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function InfluencerBrand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-500 font-heading text-body-sm font-extrabold text-on-accent">C</span>
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate font-heading text-body font-extrabold tracking-tight text-heading">Creator panel</p>
          <p className="truncate text-label text-neutral-500">Your bookings and earnings</p>
        </div>
      )}
    </div>
  );
}

export function InfluencerSidebar({ collapsed, onToggleCollapse, name, onSignOut }: { collapsed: boolean; onToggleCollapse: () => void; name: string; onSignOut: () => void }) {
  return (
    <aside
      className={cn(
        "sticky top-0 z-20 hidden h-dvh shrink-0 flex-col border-r border-neutral-200 bg-background p-4 transition-[width] duration-300 ease-[var(--ease-premium)] md:flex",
        collapsed ? "w-[4.5rem] px-2.5" : "w-64",
      )}
    >
      <div className="px-1 py-2">
        <InfluencerBrand collapsed={collapsed} />
      </div>

      {/* Sits on the sidebar's right edge so it is always visible, whatever the width of the brand name. */}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-3.5 top-7 z-10 flex size-7 items-center justify-center rounded-full border border-neutral-300 bg-background text-neutral-500 shadow-soft-sm transition-colors hover:border-accent-500 hover:text-accent-500"
      >
        {collapsed ? <ChevronsRight className="size-3.5" aria-hidden /> : <ChevronsLeft className="size-3.5" aria-hidden />}
      </button>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-neutral-200 pt-4">
        <InfluencerSidebarNav collapsed={collapsed} />
      </div>

      <div className={cn("mt-3 flex items-center gap-2.5 border-t border-neutral-200 pt-4", collapsed && "flex-col")}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-heading text-body-sm font-extrabold text-background">{name.charAt(0).toUpperCase()}</span>
        {!collapsed && <p className="min-w-0 flex-1 truncate text-body-sm font-semibold text-heading">{name}</p>}
        <button type="button" onClick={onSignOut} aria-label="Sign out" title="Sign out" className="flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:border-accent-500 hover:text-heading">
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
