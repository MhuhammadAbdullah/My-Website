"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Avatar, AvatarFallback, Button } from "@agency/ui";
import { authClient } from "@/lib/auth-client";
import { getPageTitle } from "@/lib/nav-config";

export function AdminTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
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
        <p className="truncate font-heading text-body font-semibold text-heading">{getPageTitle(pathname)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback>{session?.user?.name?.charAt(0) ?? "A"}</AvatarFallback>
        </Avatar>
        <div className="hidden text-body-sm sm:block">
          <p className="max-w-40 truncate font-medium text-heading">{session?.user?.name ?? "Admin"}</p>
          <p className="max-w-40 truncate text-neutral-400">{session?.user?.email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out" className="size-11">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
