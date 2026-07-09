"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronsLeft, ChevronsRight } from "lucide-react";
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
  cn,
} from "@agency/ui";
import { adminNavGroups, findGroupKeyForPath, type AdminNavGroup } from "@/lib/nav-config";

const GROUP_STORAGE_KEY = "admin-sidebar-expanded-group";

function isGroupActive(group: AdminNavGroup, pathname: string) {
  return group.items.some((item) => item.href === pathname || (item.href !== "/" && pathname.startsWith(`${item.href}/`)));
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

  if (collapsed) {
    return (
      <nav className="flex-1 space-y-1">
        {adminNavGroups.map((group) => (
          <CollapsedGroupFlyout key={group.key} group={group} active={isGroupActive(group, pathname)} onNavigate={onNavigate} />
        ))}
      </nav>
    );
  }

  return (
    <Accordion type="single" collapsible value={expandedGroup} onValueChange={handleValueChange} className="flex-1 space-y-1">
      {adminNavGroups.map((group) => (
        <AccordionItem key={group.key} value={group.key} className="border-b-0">
          <AccordionHeader>
            <AccordionTriggerPrimitive className="group flex w-full items-center justify-between rounded-lg px-3 py-2 font-mono text-label uppercase tracking-wide text-neutral-400 transition-colors hover:text-heading">
              {group.label}
              <ChevronDown className="size-3.5 shrink-0 text-neutral-400 transition-transform duration-300 ease-[var(--ease-premium)] group-data-[state=open]:rotate-180" />
            </AccordionTriggerPrimitive>
          </AccordionHeader>
          <AccordionContentPrimitive className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="mt-1 space-y-0.5 pb-1">
              {group.items.map((item) => {
                const active = pathname === item.href;
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
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-neutral-200 bg-background p-4 transition-[width] duration-300 ease-[var(--ease-premium)] md:flex",
        collapsed ? "w-[4.5rem] px-2.5" : "w-64",
      )}
    >
      <div className={cn("flex items-center gap-2.5 px-2 py-3", collapsed && "flex-col justify-center px-0")}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-heading text-body-sm font-bold text-white">
          C
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-body font-semibold text-heading">MAB Digital</p>
            <p className="truncate text-body-sm text-neutral-400">Admin panel</p>
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

      <div className="mt-4 flex flex-1 flex-col overflow-hidden border-t border-neutral-100 pt-4">
        <SidebarNav collapsed={collapsed} />
      </div>
    </aside>
  );
}
