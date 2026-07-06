"use client";

import { Badge, Heading, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@agency/ui";
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
      <Heading level={2}>Permissions</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">
        Every permission available to assign to a role. Managed by the system — assign combinations via Roles.
      </p>

      <div className="mt-8 space-y-8">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          Object.entries(grouped).map(([resource, perms]) => (
            <div key={resource}>
              <h3 className="font-mono text-label uppercase tracking-wide text-neutral-400">{resource}</h3>
              <Table className="mt-2">
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Label</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perms?.map((perm) => (
                    <TableRow key={perm.id}>
                      <TableCell>
                        <Badge variant="neutral">{perm.action}</Badge>
                      </TableCell>
                      <TableCell>{perm.label}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
