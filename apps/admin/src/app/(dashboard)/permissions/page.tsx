"use client";

import { Badge, Heading, Skeleton } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";

interface Permission {
  id: string;
  resource: string;
  action: string;
  label: string;
}

export default function PermissionsPage() {
  const { data: permissions, loading } = useAsyncData<Permission[]>(
    () => request<{ items: Permission[] }>("/permissions").then((r) => r.items),
    [],
  );

  const grouped = (permissions ?? []).reduce<Record<string, Permission[]>>((acc, perm) => {
    (acc[perm.resource] ??= []).push(perm);
    return acc;
  }, {});

  return (
    <div>
      <Heading level={2} className="admin-page-title">Permissions</Heading>
      <p className="mt-2 text-body-sm text-neutral-500">
        Every permission available to assign to a role. Managed by the system — assign combinations via Roles.
      </p>

      <div className="mt-6">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(grouped).map(([resource, perms]) => (
              <section key={resource} className="rounded-[10px] border border-neutral-200 bg-neutral-50 p-5">
                <h3 className="font-heading text-[1.0625rem] font-extrabold tracking-tight text-heading">{resource.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</h3>
                <ul className="mt-3 divide-y divide-neutral-200">
                  {perms?.map((perm) => (
                    <li key={perm.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-[13px] text-heading">{perm.label}</span>
                      <Badge variant="neutral">{perm.action}</Badge>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
