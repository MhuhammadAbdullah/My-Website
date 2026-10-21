"use client";

import { usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { getInfluencerPageTitle } from "@/lib/influencer-nav-config";
import { ModeToggle } from "@/components/mode-toggle";
import { InfluencerNotificationBell } from "./notification-bell";

export function InfluencerDashboardTopbar({ name, onMenuClick, onSignOut }: { name: string; onMenuClick: () => void; onSignOut: () => void }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-neutral-200 bg-background/90 px-4 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" onClick={onMenuClick} aria-label="Open menu" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-heading md:hidden">
          <Menu className="size-5" aria-hidden />
        </button>
        <p className="truncate font-heading text-[1.0625rem] font-extrabold tracking-tight text-heading">{getInfluencerPageTitle(pathname)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ModeToggle />
        <InfluencerNotificationBell />
        <span className="hidden max-w-40 truncate rounded-full border border-neutral-200 py-1.5 pl-3 pr-3.5 text-body-sm font-semibold text-heading sm:block">{name}</span>
        <button type="button" onClick={onSignOut} aria-label="Sign out" title="Sign out" className="flex size-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:border-accent-500 hover:text-heading md:hidden">
          <LogOut className="size-4" aria-hidden />
        </button>
      </div>
    </header>
  );
}
