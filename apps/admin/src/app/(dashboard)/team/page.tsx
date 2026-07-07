"use client";

import { Badge } from "@agency/ui";
import { PaginatedResourceManager } from "@/components/resource-manager/paginated-resource-manager";
import { createResourceClient, request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";

interface Skill {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatarId: string | null;
  avatar: { id: string; url: string } | null;
  skills: Skill[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  order: number;
}

const client = createResourceClient<TeamMember>("/team");

const statusOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }));

export default function TeamPage() {
  // /admin (not the public /skills list) so a disabled skill -- hidden from
  // the About page's progress bars -- can still be assigned to a member here.
  const { data: skills } = useAsyncData<Skill[]>(
    () => request<{ items: Skill[] }>("/skills/admin?limit=100").then((r) => r.items),
    [],
  );

  return (
    <PaginatedResourceManager
      title="Team"
      description="Team members shown on the About page."
      resourceClient={client}
      searchPlaceholder="Search name, role, or bio…"
      sortOptions={[
        { value: "name", label: "Name" },
        { value: "role", label: "Role" },
        { value: "status", label: "Status" },
        { value: "order", label: "Sort order" },
        { value: "createdAt", label: "Date created" },
        { value: "updatedAt", label: "Date updated" },
      ]}
      filterOptions={[{ key: "status", label: "Status", options: statusOptions }]}
      defaultSortBy="order"
      defaultSortOrder="asc"
      columns={[
        { key: "name", label: "Name" },
        { key: "role", label: "Role" },
        { key: "skills", label: "Skills", render: (m) => m.skills.map((s) => s.name).join(", ") || "—" },
        {
          key: "status",
          label: "Status",
          render: (item) => <Badge variant={item.status === "PUBLISHED" ? "success" : "neutral"}>{item.status}</Badge>,
        },
      ]}
      fields={[
        { key: "name", label: "Name", type: "text", required: true },
        { key: "role", label: "Role", type: "text", required: true },
        { key: "bio", label: "Bio", type: "textarea", required: true },
        { key: "avatarId", label: "Profile image", type: "image", previewUrlKey: "avatarUrl" },
        {
          key: "skillIds",
          label: "Skills",
          type: "multiselect",
          options: (skills ?? []).map((s) => ({ value: s.id, label: s.name })),
        },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
        { key: "order", label: "Sort order", type: "number" },
      ]}
      defaultValues={{
        name: "",
        role: "",
        bio: "",
        avatarId: null,
        avatarUrl: null,
        skillIds: [],
        status: "PUBLISHED",
        order: 0,
      }}
      toFormValues={(item) => ({
        ...item,
        avatarUrl: item.avatar?.url ?? null,
        skillIds: item.skills.map((s) => s.id),
      })}
    />
  );
}
