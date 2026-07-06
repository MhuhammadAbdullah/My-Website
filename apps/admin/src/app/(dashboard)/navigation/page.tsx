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

export default function NavigationPage() {
  return (
    <ResourceManager
      title="Navigation"
      description="Header and footer links shown across the public site."
      resourceClient={client}
      columns={[
        { key: "label", label: "Label" },
        { key: "href", label: "URL" },
        { key: "location", label: "Location" },
      ]}
      fields={[
        { key: "label", label: "Label", type: "text", required: true },
        { key: "href", label: "URL", type: "text", required: true },
        {
          key: "location",
          label: "Location",
          type: "select",
          options: [
            { value: "HEADER", label: "Header" },
            { value: "FOOTER", label: "Footer" },
          ],
          required: true,
        },
        { key: "order", label: "Sort order", type: "number" },
      ]}
      defaultValues={{ label: "", href: "/", location: "HEADER", order: 0 }}
    />
  );
}
