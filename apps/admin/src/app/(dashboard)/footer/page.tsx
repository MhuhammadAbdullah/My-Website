"use client";

import { ResourceManager } from "@/components/resource-manager/resource-manager";
import { createResourceClient } from "@/lib/api";

interface NavItem {
  id: string;
  label: string;
  href: string;
  location: "HEADER" | "FOOTER";
  order: number;
}

const client = createResourceClient<NavItem>("/navigation");

export default function FooterPage() {
  return (
    <ResourceManager
      title="Footer links"
      description="Links shown in the site footer's legal column."
      resourceClient={client}
      filter={(item) => item.location === "FOOTER"}
      columns={[
        { key: "label", label: "Label" },
        { key: "href", label: "URL" },
      ]}
      fields={[
        { key: "label", label: "Label", type: "text", required: true },
        { key: "href", label: "URL", type: "text", required: true },
        { key: "order", label: "Sort order", type: "number" },
      ]}
      defaultValues={{ label: "", href: "/", location: "FOOTER", order: 0 }}
    />
  );
}
