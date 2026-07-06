"use client";

import { Badge } from "@agency/ui";
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

const contextOptions = ["GENERAL", "SERVICE", "PORTFOLIO", "CONTACT", "AFFILIATE"].map((v) => ({
  value: v,
  label: v.charAt(0) + v.slice(1).toLowerCase(),
}));

const statusOptions = ["DRAFT", "PUBLISHED", "ARCHIVED"].map((v) => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase() }));

export default function FaqsPage() {
  return (
    <PaginatedResourceManager
      title="FAQs"
      description="Frequently asked questions shown on the home, service, portfolio, contact, and affiliate pages."
      resourceClient={client}
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
