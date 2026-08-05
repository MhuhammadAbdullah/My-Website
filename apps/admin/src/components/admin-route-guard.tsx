"use client";

import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Heading, Skeleton } from "@agency/ui";
import { getRequiredResourcesForPath } from "@/lib/nav-config";
import { usePermissions } from "@/lib/use-permissions";

// Wraps every dashboard page (admin-shell.tsx) so a user who isn't shown a
// section in the sidebar also can't reach it by typing/bookmarking its URL
// directly -- hiding a nav item alone is cosmetic, this is the actual gate.
export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can, loading } = usePermissions();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const requiredResources = getRequiredResourcesForPath(pathname);
  const allowed = requiredResources.length === 0 || requiredResources.some((resource) => can(resource, "view"));

  if (!allowed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-error-50 text-error-500">
          <ShieldAlert className="size-7" />
        </div>
        <Heading level={2} className="mt-5">
          Access denied
        </Heading>
        <p className="mt-2 max-w-sm text-body-sm text-neutral-500">
          You don't have permission to view this page. If you think this is a mistake, ask an administrator to update your role.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
