"use client";

import { Badge } from "@agency/ui";
import { PaginatedResourceManager } from "@/components/resource-manager/paginated-resource-manager";
import { createResourceClient, request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";

interface Project {
  id: string;
  title: string;
}

interface Testimonial {
  id: string;
  author: string;
  role: string | null;
  company: string | null;
  avatarId: string | null;
  avatar: { id: string; url: string } | null;
  quote: string;
  rating: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  order: number;
  projects: Project[];
}

const client = createResourceClient<Testimonial>("/testimonials");

const statusOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }));

export default function TestimonialsPage() {
  // limit=100: this populates a searchable dropdown of every project, not a
  // paginated table — /admin now paginates at 10 by default.
  const { data: projects } = useAsyncData<Project[]>(
    () => request<{ items: Project[] }>("/projects/admin?limit=100").then((r) => r.items),
    [],
  );

  return (
    <PaginatedResourceManager
      title="Testimonials"
      description="Client quotes shown across the home page, service pages, and their related project's detail page."
      resourceClient={client}
      searchPlaceholder="Search author, company, or quote…"
      sortOptions={[
        { value: "author", label: "Author" },
        { value: "company", label: "Company" },
        { value: "rating", label: "Rating" },
        { value: "status", label: "Status" },
        { value: "order", label: "Sort order" },
        { value: "createdAt", label: "Date created" },
        { value: "updatedAt", label: "Date updated" },
      ]}
      filterOptions={[{ key: "status", label: "Status", options: statusOptions }]}
      defaultSortBy="order"
      defaultSortOrder="asc"
      columns={[
        { key: "author", label: "Author" },
        { key: "company", label: "Company" },
        { key: "rating", label: "Rating" },
        {
          key: "status",
          label: "Status",
          render: (item) => <Badge variant={item.status === "PUBLISHED" ? "success" : "neutral"}>{item.status}</Badge>,
        },
      ]}
      fields={[
        { key: "author", label: "Author", type: "text", required: true },
        { key: "role", label: "Role", type: "text" },
        { key: "company", label: "Company", type: "text" },
        { key: "avatarId", label: "Client profile image", type: "image", previewUrlKey: "avatarUrl" },
        { key: "quote", label: "Quote", type: "textarea", required: true },
        { key: "rating", label: "Rating (1–5)", type: "number" },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
        { key: "order", label: "Sort order", type: "number" },
        {
          key: "projectIds",
          label: "Related projects",
          type: "multiselect-search",
          options: (projects ?? []).map((p) => ({ value: p.id, label: p.title })),
          placeholder: "Search portfolio projects…",
        },
      ]}
      defaultValues={{
        author: "",
        role: "",
        company: "",
        avatarId: null,
        avatarUrl: null,
        quote: "",
        rating: 5,
        status: "PUBLISHED",
        order: 0,
        projectIds: [],
      }}
      toFormValues={(item) => ({
        ...item,
        avatarUrl: item.avatar?.url ?? null,
        projectIds: item.projects.map((p) => p.id),
      })}
    />
  );
}
