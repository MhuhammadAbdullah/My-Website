"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTriggerPrimitive,
  AccordionContentPrimitive,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  cn,
} from "@agency/ui";
import { adminNavGroups, findGroupKeyForPath, type AdminNavGroup } from "@/lib/nav-config";
import { usePermissions } from "@/lib/use-permissions";
import { request } from "@/lib/api";
import { useSiteBranding } from "@/lib/use-site-branding";

// Shared by the desktop sidebar, the mobile Sheet header (admin-shell.tsx),
// and the topbar (admin-topbar.tsx) -- shows the admin-configured site logo
// (Settings > Branding) once it's loaded, falling back to a letter mark
// (brand name's first letter) so there's never a blank box while the one
// shared /settings fetch resolves.
//
// Deliberately a plain <img> at its natural aspect ratio (h-* + w-auto +
// object-contain), matching apps/web/src/components/site-header.tsx's own
// logo rendering exactly -- NOT next/image's `fill` inside a fixed square
// box. Real uploaded logos are usually a wide horizontal lockup (mark +
// wordmark, often with their own padding/canvas baked into the asset, e.g.
// this app's current one is ~2:1) -- forcing that into a small SQUARE
// avatar-style box (object-contain fitting by width) left most of the box
// as dead vertical letterboxing, and paired with an opaque background behind
// it, that empty space visually swallowed the whole logo (confirmed via
// devtools: the image loaded fine, it just rendered inside a mostly-empty
// box). Sizing here is controlled entirely by `className` (a height +
// max-width pair) so each call site can fit its own available space.
export function AdminBrandMark({ className = "h-8 max-w-28" }: { className?: string }) {
  const { brandName, logoUrl } = useSiteBranding();
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary Cloudinary URL, not a static asset (same reasoning as site-header.tsx)
      <img src={logoUrl} alt={brandName || "Admin"} className={cn("brand-logo w-auto shrink-0 object-contain", className)} />
    );
  }
  return (
    <div className={cn("flex aspect-square shrink-0 items-center justify-center rounded-[10px] bg-accent-500 font-heading text-body-sm font-extrabold text-on-accent", className)}>
      {(brandName || "A").charAt(0).toUpperCase()}
    </div>
  );
}

const GROUP_STORAGE_KEY = "admin-sidebar-expanded-group";

function isGroupActive(group: AdminNavGroup, pathname: string) {
  return group.items.some((item) => item.href === pathname || (item.href !== "/" && pathname.startsWith(`${item.href}/`)));
}

// A user only sees the nav items (and, transitively, groups) they actually
// have "view" permission for -- an item with resource:null (just Dashboard)
// is always visible. Groups that end up empty after filtering are dropped
// entirely rather than shown as an empty header.
function useVisibleNavGroups(): AdminNavGroup[] {
  const { can } = usePermissions();
  return React.useMemo(
    () =>
      adminNavGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => item.resource === null || can(item.resource, "view")),
        }))
        .filter((group) => group.items.length > 0),
    [can],
  );
}

// Sidebar badges: the number of unanswered contact submissions next to "Messages".
function useNavBadges(): Record<string, number> {
  const [badges, setBadges] = React.useState<Record<string, number>>({});
  React.useEffect(() => {
    let cancelled = false;
    const load = () =>
      request<{ total: number }>("/contact?status=NEW&limit=1")
        .then((r) => !cancelled && setBadges({ "/analytics": r.total }))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);
  return badges;
}

function NavBadge({ count }: { count: number }) {
  if (!count) return null;
  return <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-500 px-1.5 text-[10px] font-extrabold text-on-accent">{count > 99 ? "99+" : count}</span>;
}

function SidebarNavSkeleton() {
  return (
    <div className="flex-1 space-y-3 px-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

function CollapsedGroupFlyout({ group, active, onNavigate }: { group: AdminNavGroup; active: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const Icon = group.icon;

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  React.useEffect(() => () => cancelClose(), []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => {
            cancelClose();
            setOpen(true);
          }}
          onMouseLeave={scheduleClose}
          onClick={() => setOpen((v) => !v)}
          aria-label={group.label}
          className={cn(
            "flex w-full items-center justify-center rounded-xl p-2.5 transition-colors",
            active ? "bg-neutral-100 text-heading" : "text-body hover:bg-neutral-50 hover:text-heading",
          )}
        >
          <Icon className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={12}
        className="w-56"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
      >
        <p className="px-2.5 py-1.5 font-mono text-label uppercase tracking-wide text-neutral-400">{group.label}</p>
        <div className="space-y-0.5">
          {group.items.map((item) => {
            const ItemIcon = item.icon;
            const itemActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-sm font-medium transition-colors",
                  itemActive ? "bg-neutral-100 text-heading" : "text-body hover:bg-neutral-50 hover:text-heading",
                )}
              >
                <ItemIcon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { loading } = usePermissions();
  const visibleGroups = useVisibleNavGroups();
  const badges = useNavBadges();
  const [expandedGroup, setExpandedGroup] = React.useState<string>("");
  const firstRun = React.useRef(true);

  React.useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      const stored = window.localStorage.getItem(GROUP_STORAGE_KEY);
      setExpandedGroup(stored ?? findGroupKeyForPath(pathname) ?? "");
      return;
    }
    const activeGroup = findGroupKeyForPath(pathname);
    if (activeGroup) {
      setExpandedGroup(activeGroup);
      window.localStorage.setItem(GROUP_STORAGE_KEY, activeGroup);
    }
     
  }, [pathname]);

  function handleValueChange(value: string) {
    setExpandedGroup(value);
    if (value) window.localStorage.setItem(GROUP_STORAGE_KEY, value);
  }

  if (loading) {
    return <SidebarNavSkeleton />;
  }

  if (collapsed) {
    return (
      <nav className="flex-1 space-y-1">
        {visibleGroups.map((group) => (
          <CollapsedGroupFlyout key={group.key} group={group} active={isGroupActive(group, pathname)} onNavigate={onNavigate} />
        ))}
      </nav>
    );
  }

  return (
    <Accordion type="single" collapsible value={expandedGroup} onValueChange={handleValueChange} className="flex-1 space-y-1">
      {visibleGroups.map((group) => (
        <AccordionItem key={group.key} value={group.key} className="border-b-0">
          <AccordionHeader>
            <AccordionTriggerPrimitive className="group flex w-full items-center justify-between rounded-lg px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 transition-colors hover:text-heading">
              {group.label}
              <span aria-hidden className="text-sm leading-none">
                <span className="group-data-[state=open]:hidden">+</span>
                <span className="hidden group-data-[state=open]:inline">–</span>
              </span>
            </AccordionTriggerPrimitive>
          </AccordionHeader>
          <AccordionContentPrimitive className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="mt-1 space-y-0.5 pb-1">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition-colors",
                      active ? "bg-accent-500 text-on-accent" : "text-body hover:bg-neutral-100 hover:text-heading",
                    )}
                  >
                    <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", active ? "bg-on-accent" : "bg-neutral-400")} />
                    {item.label}
                    <NavBadge count={badges[item.href] ?? 0} />
                  </Link>
                );
              })}
            </div>
          </AccordionContentPrimitive>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function AdminSidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const { brandName } = useSiteBranding();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-neutral-200 bg-background p-4 transition-[width] duration-300 ease-[var(--ease-premium)] md:flex",
        collapsed ? "w-[4.5rem] px-2.5" : "w-64",
      )}
    >
      <div className={cn("flex items-center gap-2.5 px-2 py-3", collapsed && "flex-col justify-center px-0")}>
        <AdminBrandMark className={collapsed ? "h-7 max-w-10" : "h-8 max-w-28"} />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-body font-extrabold uppercase tracking-tight text-heading">{brandName || "Admin"}</p>
            <p className="truncate text-label text-neutral-400">Admin panel</p>
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

      <div className="scrollbar-thin mt-4 flex flex-1 flex-col overflow-y-auto overflow-x-hidden border-t border-neutral-100 pt-4">
        <SidebarNav collapsed={collapsed} />
      </div>
    </aside>
  );
}
