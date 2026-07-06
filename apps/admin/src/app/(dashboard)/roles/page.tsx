"use client";

import { ResourceManager } from "@/components/resource-manager/resource-manager";
import { createResourceClient, request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";

interface Permission {
  id: string;
  resource: string;
  action: string;
  label: string;
}

interface RolePermission {
  permissionId: string;
  permission: Permission;
}

interface Role {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  permissions: RolePermission[];
}

const client = createResourceClient<Role>("/roles");

export default function RolesPage() {
  const { data: permissions } = useAsyncData<Permission[]>(
    () => request<{ items: Permission[] }>("/permissions").then((r) => r.items),
    [],
  );

  return (
    <ResourceManager
      title="Roles"
      description="Roles determine what each admin user can see and edit."
      resourceClient={client}
      columns={[
        { key: "name", label: "Name" },
        { key: "permissions", label: "Permissions", render: (r) => `${r.permissions.length} granted` },
        { key: "isSystem", label: "System role", render: (r) => (r.isSystem ? "Yes" : "No") },
      ]}
      fields={[
        { key: "name", label: "Name", type: "text", required: true },
        { key: "slug", label: "Slug", type: "text", required: true },
        { key: "description", label: "Description", type: "textarea" },
        {
          key: "permissionIds",
          label: "Permissions",
          type: "multiselect",
          options: (permissions ?? []).map((p) => ({ value: p.id, label: p.label })),
        },
      ]}
      defaultValues={{ name: "", slug: "", description: "", permissionIds: [] }}
      toFormValues={(item) => ({ ...item, permissionIds: item.permissions.map((p) => p.permissionId) })}
    />
  );
}
