"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback, Button } from "@agency/ui";
import { authClient } from "@/lib/auth-client";

export function AdminTopbar() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-neutral-200 bg-background px-6 py-4">
      <div />
      <div className="flex items-center gap-3">
        <Avatar className="size-9">
          <AvatarFallback>{session?.user?.name?.charAt(0) ?? "A"}</AvatarFallback>
        </Avatar>
        <div className="hidden text-body-sm sm:block">
          <p className="font-medium text-heading">{session?.user?.name ?? "Admin"}</p>
          <p className="text-neutral-400">{session?.user?.email}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
