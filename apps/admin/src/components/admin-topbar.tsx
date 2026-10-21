"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@agency/ui";
import { authClient } from "@/lib/auth-client";
import { NotificationBell } from "@/components/notification-bell";
import { GlobalSearch } from "@/components/global-search";
import { adminNavGroups, findGroupKeyForPath, getPageTitle } from "@/lib/nav-config";
import { ModeToggle } from "@/components/mode-toggle";

export function AdminTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  // useSession() can resolve synchronously from a cached session cookie on the
  // client's first paint, while the server render always has no session data.
  // That mismatch trips React hydration, so the session-derived text below is
  // held back until after mount rather than rendered on the first pass.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const user = mounted ? session?.user : undefined;
  const name = user?.name ?? "Admin";

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-neutral-200 bg-background/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Open navigation menu" className="size-10 shrink-0 md:hidden">
          <Menu className="size-5" />
        </Button>
        {pathname === "/" ? (
          <GlobalSearch className="w-full max-w-[22rem]" />
        ) : (
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 truncate text-[13px] text-neutral-500">
            <span className="hidden sm:inline">{adminNavGroups.find((g) => g.key === findGroupKeyForPath(pathname))?.label ?? "Admin"}</span>
            <span className="hidden sm:inline" aria-hidden>
              /
            </span>
            <span className="truncate font-semibold text-heading">{getPageTitle(pathname)}</span>
          </nav>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <ModeToggle />
        <NotificationBell />
        <Link href="/profile" aria-label="My profile" title="My profile" className="flex items-center gap-2 rounded-full border border-neutral-200 py-1 pl-1 pr-1 transition-colors hover:border-accent-500 sm:pr-3.5">
          <span className="flex size-7 items-center justify-center rounded-full bg-heading text-[12px] font-extrabold text-background">{name.charAt(0).toUpperCase()}</span>
          <span className="hidden max-w-32 truncate text-[13px] font-semibold text-heading sm:block">{name}</span>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Log out"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-neutral-200 px-3 text-[13px] font-semibold text-heading transition-colors hover:border-accent-500 hover:text-accent-500 sm:px-4"
        >
          <LogOut className="size-3.5 sm:hidden" aria-hidden />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
