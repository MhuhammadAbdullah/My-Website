"use client";

import Link from "next/link";
import { PaginatedResourceManager } from "@/components/resource-manager/paginated-resource-manager";
import { createResourceClient } from "@/lib/api";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from "@agency/types";

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  currency: string;
  notes: string | null;
  isArchived: boolean;
}

const client = createResourceClient<Client>("/finance/clients");

const currencyComboboxOptions = CURRENCY_OPTIONS.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}` }));

export default function FinanceClientsPage() {
  return (
    <PaginatedResourceManager
      title="Clients"
      description="Businesses and individuals you quote, invoice, and bill."
      resourceClient={client}
      searchPlaceholder="Search name, email, or company…"
      sortOptions={[
        { value: "name", label: "Name" },
        { value: "company", label: "Company" },
        { value: "createdAt", label: "Date created" },
        { value: "updatedAt", label: "Date updated" },
      ]}
      filterOptions={[
        {
          key: "isArchived",
          label: "Status",
          options: [
            { value: "false", label: "Active" },
            { value: "true", label: "Archived" },
          ],
        },
      ]}
      defaultSortBy="name"
      defaultSortOrder="asc"
      columns={[
        {
          key: "name",
          label: "Name",
          render: (item) => (
            <Link href={`/finance/clients/${item.id}`} className="font-medium text-heading hover:underline">
              {item.name}
            </Link>
          ),
        },
        { key: "company", label: "Company", render: (item) => item.company ?? "—" },
        { key: "email", label: "Email", render: (item) => item.email ?? "—" },
        { key: "phone", label: "Phone", render: (item) => item.phone ?? "—" },
        { key: "currency", label: "Currency" },
      ]}
      fields={[
        { key: "name", label: "Name", type: "text", required: true },
        { key: "email", label: "Email", type: "text" },
        { key: "phone", label: "Phone", type: "text" },
        { key: "company", label: "Company", type: "text" },
        { key: "address", label: "Address", type: "textarea" },
        { key: "currency", label: "Currency", type: "combobox", options: currencyComboboxOptions, required: true },
        { key: "notes", label: "Notes", type: "textarea" },
        { key: "isArchived", label: "Archived", type: "checkbox" },
      ]}
      defaultValues={{
        name: "",
        email: "",
        phone: "",
        company: "",
        address: "",
        currency: DEFAULT_CURRENCY,
        notes: "",
        isArchived: false,
      }}
    />
  );
}
