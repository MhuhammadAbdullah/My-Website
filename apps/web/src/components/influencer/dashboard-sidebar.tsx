"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button, cn } from "@agency/ui";
import { influencerNavItems } from "@/lib/influencer-nav-config";

function isActive(href: string, pathname: string) {
  return pathname === href || (href !== "/influencer/dashboard" && pathname.startsWith(`${href}/`));
}

// A native title attribute (rather than a Popover, which would fight the
// Link's own click-to-navigate behavior) gives a lightweight hover label for
// the icon-only collapsed state.
function CollapsedNavItem({ item, active, onNavigate }: { item: (typeof influencerNavItems)[number]; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={item.label}
      aria-label={item.label}
      className={cn(
        "flex w-full items-center justify-center rounded-xl p-2.5 transition-colors",
        active ? "bg-neutral-100 text-heading" : "text-body hover:bg-neutral-50 hover:text-heading",
      )}
    >
      <Icon className="size-5" />
    </Link>
  );
}

export function InfluencerSidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  if (collapsed) {
    return (
      <nav className="flex-1 space-y-1">
        {influencerNavItems.map((item) => (
          <CollapsedNavItem key={item.href} item={item} active={isActive(item.href, pathname)} onNavigate={onNavigate} />
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex-1 space-y-0.5">
      {influencerNavItems.map((item) => {
        const active = isActive(item.href, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-body-sm font-medium transition-colors",
              active ? "bg-neutral-100 text-heading" : "text-body hover:bg-neutral-50 hover:text-heading",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function InfluencerSidebar({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse: () => void }) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-neutral-200 bg-background p-4 transition-[width] duration-300 ease-[var(--ease-premium)] md:flex",
        collapsed ? "w-[4.5rem] px-2.5" : "w-64",
      )}
    >
      <div className={cn("flex items-center gap-2.5 px-2 py-3", collapsed && "flex-col justify-center px-0")}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-heading text-body-sm font-bold text-white">
          I
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-body font-semibold text-heading">Influencer</p>
            <p className="truncate text-body-sm text-neutral-400">Partner panel</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn("size-11 shrink-0", collapsed && "mt-1")}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </Button>
      </div>

      <div className="mt-4 flex flex-1 flex-col overflow-hidden overflow-y-auto border-t border-neutral-100 pt-4">
        <InfluencerSidebarNav collapsed={collapsed} />
      </div>
    </aside>
  );
}
