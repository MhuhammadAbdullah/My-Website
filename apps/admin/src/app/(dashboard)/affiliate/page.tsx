"use client";

import { Suspense } from "react";
import { Badge, Heading, Tabs, TabsContent, TabsList, TabsTrigger } from "@agency/ui";
import { PaginatedResourceManager } from "@/components/resource-manager/paginated-resource-manager";
import { createResourceClient, request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { PageHeroContentForm } from "@/components/page-hero-content-form";

interface AffiliateCategory {
  id: string;
  name: string;
}

interface AffiliateTool {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  benefits: string[];
  specialOffer: string | null;
  ctaUrl: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  order: number;
}

const client = createResourceClient<AffiliateTool>("/affiliate/tools");

const statusOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }));

function AffiliatePageInner() {
  const { data: categories } = useAsyncData<AffiliateCategory[]>(
    () => request<{ items: AffiliateCategory[] }>("/affiliate/categories").then((r) => r.items),
    [],
  );

  return (
    <PaginatedResourceManager
      title="Affiliate Tools"
      description="Tools shown in the unified grid on the Affiliate Tools page."
      resourceClient={client}
      searchPlaceholder="Search name or description…"
      sortOptions={[
        { value: "name", label: "Name" },
        { value: "status", label: "Status" },
        { value: "order", label: "Sort order" },
        { value: "createdAt", label: "Date created" },
        { value: "updatedAt", label: "Date updated" },
      ]}
      filterOptions={[
        { key: "categoryId", label: "Category", options: (categories ?? []).map((c) => ({ value: c.id, label: c.name })) },
        { key: "status", label: "Status", options: statusOptions },
        {
          key: "isFeatured",
          label: "Featured",
          options: [
            { value: "true", label: "Featured only" },
            { value: "false", label: "Not featured" },
          ],
        },
      ]}
      defaultSortBy="order"
      defaultSortOrder="asc"
      columns={[
        { key: "name", label: "Name" },
        {
          key: "categoryId",
          label: "Category",
          render: (item) => categories?.find((c) => c.id === item.categoryId)?.name ?? "—",
        },
        { key: "specialOffer", label: "Special offer" },
        {
          key: "isFeatured",
          label: "Featured",
          render: (item) => (item.isFeatured ? <Badge variant="accent">Featured</Badge> : "—"),
        },
        {
          key: "status",
          label: "Status",
          render: (item) => <Badge variant={item.status === "PUBLISHED" ? "success" : "neutral"}>{item.status}</Badge>,
        },
      ]}
      fields={[
        { key: "name", label: "Name", type: "text", required: true },
        { key: "slug", label: "Slug", type: "text", required: true },
        {
          key: "categoryId",
          label: "Category",
          type: "combobox",
          options: (categories ?? []).map((c) => ({ value: c.id, label: c.name })),
          required: true,
        },
        { key: "description", label: "Description", type: "textarea", required: true },
        { key: "benefits", label: "Benefits", type: "tags", placeholder: "Add a benefit…" },
        { key: "specialOffer", label: "Special offer", type: "text" },
        { key: "ctaUrl", label: "Link URL", type: "url", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
        { key: "isFeatured", label: "Featured", type: "checkbox" },
        { key: "order", label: "Sort order", type: "number" },
      ]}
      defaultValues={{
        name: "",
        slug: "",
        categoryId: categories?.[0]?.id ?? "",
        description: "",
        benefits: [],
        specialOffer: "",
        ctaUrl: "",
        status: "PUBLISHED",
        isFeatured: false,
        order: 0,
      }}
    />
  );
}

export default function AffiliatePage() {
  return (
    <Tabs defaultValue="list">
      <TabsList>
        <TabsTrigger value="list">All Tools</TabsTrigger>
        <TabsTrigger value="content">Page Content</TabsTrigger>
      </TabsList>
      <TabsContent value="list">
        <Suspense fallback={null}>
          <AffiliatePageInner />
        </Suspense>
      </TabsContent>
      <TabsContent value="content">
        <Heading level={2}>Affiliate Tools Page Content</Heading>
        <p className="mt-1 text-body-sm text-neutral-500">The hero heading, paragraph, and disclosure text at the top of the public Affiliate Tools page.</p>
        <div className="mt-6">
          <PageHeroContentForm
            endpoint="/pages/affiliate-tools"
            emptyValues={{ heroHeading: "", heroDescription: "", disclosureText: "" }}
            fields={[
              { key: "heroHeading", label: "Hero heading", isHeading: true, placeholder: "Tools we **actually** use." },
              { key: "heroDescription", label: "Hero paragraph", type: "textarea" },
              { key: "disclosureText", label: "Affiliate disclosure text (shown after the bold \"Affiliate disclosure:\" label)", type: "textarea" },
            ]}
            successMessage="Affiliate Tools page content updated"
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
