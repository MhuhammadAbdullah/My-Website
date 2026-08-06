"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Avatar, AvatarFallback, Button } from "@agency/ui";
import { influencerAuthClient } from "@/lib/influencer-auth-client";
import { getInfluencerPageTitle } from "@/lib/influencer-nav-config";
import { InfluencerNotificationBell } from "./notification-bell";

export function InfluencerDashboardTopbar({ name, onMenuClick }: { name: string; onMenuClick: () => void }) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    await influencerAuthClient.signOut();
    router.push("/influencer/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-background px-4 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="size-11 shrink-0 md:hidden"
        >
          <Menu className="size-5" />
        </Button>
        <p className="truncate font-heading text-body font-semibold text-heading">{getInfluencerPageTitle(pathname)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <InfluencerNotificationBell />
        <Avatar className="size-9">
          <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <p className="hidden max-w-40 truncate text-body-sm font-medium text-heading sm:block">{name}</p>
        <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out" className="size-11">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
