"use client";

import { Suspense } from "react";
import * as React from "react";
import { Badge, Button, Input, Label, toast } from "@agency/ui";
import { request } from "@/lib/api";
import { PaginatedResourceManager } from "@/components/resource-manager/paginated-resource-manager";
import { createResourceClient } from "@/lib/api";

interface Faq {
  id: string;
  question: string;
  answer: string;
  context: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  order: number;
}

const client = createResourceClient<Faq>("/faqs");

const contextOptions = ["GENERAL", "SERVICE", "PORTFOLIO", "CONTACT", "AFFILIATE", "INFLUENCER"].map((v) => ({
  value: v,
  label: v.charAt(0) + v.slice(1).toLowerCase(),
}));

const statusOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }));

// The heading above the FAQ accordion on the Home, About and Contact pages.
function FaqHeadingCard() {
  const [value, setValue] = React.useState("");
  const [saved, setSaved] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    request<{ settings: { faq_section_heading?: string } }>("/settings")
      .then((r) => {
        setValue(r.settings.faq_section_heading ?? "");
        setSaved(r.settings.faq_section_heading ?? "");
      })
      .catch(() => {});
  }, []);
  async function save() {
    if (!value.trim()) return toast.error("Enter a heading");
    setSaving(true);
    try {
      await request("/settings/faq_section_heading", { method: "PUT", body: JSON.stringify({ value: value.trim() }) });
      setSaved(value.trim());
      toast.success("FAQ heading saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-[10px] border border-neutral-200 bg-neutral-50 p-4">
      <div className="min-w-[16rem] flex-1">
        <Label htmlFor="faq-heading">FAQ section heading</Label>
        <Input id="faq-heading" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Frequently asked questions" />
      </div>
      <Button onClick={save} disabled={saving || value.trim() === saved}>
        {saving ? "Saving…" : "Save heading"}
      </Button>
      <p className="basis-full text-label text-neutral-500">Shown above the questions on the Home, About and Contact pages.</p>
    </div>
  );
}

function FaqsPageInner() {
  return (
    <PaginatedResourceManager
      title="FAQs"
      description="Frequently asked questions shown on the home, service, portfolio, contact, affiliate, and influencer marketplace pages."
      resourceClient={client}
      headerExtra={<FaqHeadingCard />}
      searchPlaceholder="Search questions and answers…"
      sortOptions={[
        { value: "question", label: "Question" },
        { value: "context", label: "Context" },
        { value: "status", label: "Status" },
        { value: "order", label: "Sort order" },
        { value: "createdAt", label: "Date created" },
        { value: "updatedAt", label: "Date updated" },
      ]}
      filterOptions={[
        { key: "context", label: "Context", options: contextOptions },
        { key: "status", label: "Status", options: statusOptions },
      ]}
      defaultSortBy="order"
      defaultSortOrder="asc"
      columns={[
        { key: "question", label: "Question" },
        { key: "context", label: "Context" },
        {
          key: "status",
          label: "Status",
          render: (item) => <Badge variant={item.status === "PUBLISHED" ? "success" : "neutral"}>{item.status}</Badge>,
        },
      ]}
      fields={[
        { key: "question", label: "Question", type: "text", required: true },
        { key: "answer", label: "Answer", type: "textarea", required: true },
        { key: "context", label: "Context", type: "select", options: contextOptions, required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
        { key: "order", label: "Sort order", type: "number" },
      ]}
      defaultValues={{ question: "", answer: "", context: "GENERAL", status: "PUBLISHED", order: 0 }}
    />
  );
}

export default function FaqsPage() {
  return (
    <Suspense fallback={null}>
      <FaqsPageInner />
    </Suspense>
  );
}
