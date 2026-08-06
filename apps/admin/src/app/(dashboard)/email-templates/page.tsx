"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Badge, Heading, Skeleton } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { EmailTemplateDialog } from "@/components/email-templates/email-template-dialog";
import type { EmailRecipientRole, EmailTemplate } from "@/components/email-templates/types";

const SECTIONS: { role: EmailRecipientRole; title: string; description: string; badgeVariant: "dark" | "accent" | "success" }[] = [
  { role: "ADMIN", title: "Sent to Admin", description: "Internal alerts that land in the admin notification inbox.", badgeVariant: "dark" },
  { role: "CLIENT", title: "Sent to Clients", description: "Booking updates sent to the client who requested a campaign.", badgeVariant: "accent" },
  { role: "INFLUENCER", title: "Sent to Influencers", description: "Account, application, and booking emails sent to influencers.", badgeVariant: "success" },
];

function TemplateRow({ template, onEdit }: { template: EmailTemplate; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-neutral-200 p-5 text-left transition-colors hover:border-accent-300 hover:bg-accent-50/30"
    >
      <div className="min-w-0">
        <p className="font-medium text-heading">{template.name}</p>
        {template.description && <p className="mt-1 text-body-sm text-neutral-500">{template.description}</p>}
        <p className="mt-2 truncate text-body-sm text-neutral-400">
          <span className="font-medium text-neutral-500">Subject:</span> {template.subject}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-neutral-300" />
    </button>
  );
}

export default function EmailTemplatesPage() {
  const {
    data: templates,
    loading,
    reload,
  } = useAsyncData<EmailTemplate[]>(() => request<{ items: EmailTemplate[] }>("/email-templates").then((r) => r.items), []);

  const [editing, setEditing] = React.useState<EmailTemplate | null>(null);

  function handleSaved(updated: EmailTemplate) {
    reload();
    setEditing(updated);
  }

  return (
    <div>
      <Heading level={1}>Email Templates</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">
        Manage the subject and body of every automated email — organized by who receives it: Admin, Clients, or Influencers.
      </p>

      {loading || !templates ? (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {SECTIONS.map((section) => {
            const items = templates.filter((t) => t.recipientRole === section.role);
            if (items.length === 0) return null;
            return (
              <div key={section.role}>
                <div className="flex items-center gap-2.5">
                  <Heading level={3}>{section.title}</Heading>
                  <Badge variant={section.badgeVariant}>{items.length}</Badge>
                </div>
                <p className="mt-1 text-body-sm text-neutral-500">{section.description}</p>
                <div className="mt-4 grid gap-3">
                  {items.map((template) => (
                    <TemplateRow key={template.key} template={template} onEdit={() => setEditing(template)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EmailTemplateDialog template={editing} onOpenChange={(open) => !open && setEditing(null)} onSaved={handleSaved} />
    </div>
  );
}
