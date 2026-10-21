"use client";

import * as React from "react";
import { ChevronRight, Search } from "lucide-react";
import { Heading, Input, Skeleton, cn } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { EmailTemplateDialog } from "@/components/email-templates/email-template-dialog";
import type { EmailRecipientRole, EmailTemplate } from "@/components/email-templates/types";

const SECTIONS: { role: EmailRecipientRole; short: string; title: string; description: string }[] = [
  { role: "ADMIN", short: "Admin", title: "Sent to Admin", description: "Internal alerts that land in the admin notification inbox." },
  { role: "CLIENT", short: "Clients", title: "Sent to Clients", description: "Booking updates sent to the client who requested a campaign." },
  { role: "INFLUENCER", short: "Influencers", title: "Sent to Influencers", description: "Account, application, and booking emails sent to influencers." },
];

function TemplateCard({ template, onEdit }: { template: EmailTemplate; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="group flex h-full w-full items-start justify-between gap-3 rounded-[10px] border border-neutral-200 bg-neutral-50 p-4 text-left transition-colors hover:border-accent-500"
    >
      <div className="min-w-0">
        <p className="font-heading text-[0.9375rem] font-extrabold leading-tight tracking-tight text-heading">{template.name}</p>
        {template.description && <p className="mt-1 line-clamp-2 text-[13px] text-neutral-500">{template.description}</p>}
        <p className="mt-2.5 truncate rounded-[6px] bg-neutral-100 px-2 py-1 text-label text-neutral-500">
          <span className="font-semibold text-heading">Subject:</span> {template.subject}
        </p>
      </div>
      <ChevronRight className="mt-0.5 size-4 shrink-0 text-neutral-400 transition-colors group-hover:text-accent-500" aria-hidden />
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
  const [tab, setTab] = React.useState<"ALL" | EmailRecipientRole>("ALL");
  const [search, setSearch] = React.useState("");

  function handleSaved(updated: EmailTemplate) {
    reload();
    setEditing(updated);
  }

  const q = search.trim().toLowerCase();
  const visible = (templates ?? []).filter((t) => (!q || `${t.name} ${t.description ?? ""} ${t.subject}`.toLowerCase().includes(q)));
  const count = (role: EmailRecipientRole) => (templates ?? []).filter((t) => t.recipientRole === role).length;

  return (
    <div>
      <Heading level={2} className="admin-page-title">
        Email Templates
      </Heading>
      <p className="mt-2 max-w-3xl text-body-sm text-neutral-500">
        Manage the subject and body of every automated email — organised by who receives it. Inside a template, use “Insert placeholder” to add the recipient’s name, booking number and more without typing any codes.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Recipient" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-neutral-200 bg-neutral-50 p-1">
          {([{ role: "ALL" as const, short: "All", n: (templates ?? []).length }, ...SECTIONS.map((s) => ({ role: s.role, short: s.short, n: count(s.role) }))]).map((t) => (
            <button
              key={t.role}
              type="button"
              role="tab"
              aria-selected={tab === t.role}
              onClick={() => setTab(t.role)}
              className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors", tab === t.role ? "bg-accent-500 text-on-accent" : "text-neutral-500 hover:text-heading")}
            >
              {t.short}
              <span className={cn("rounded-full px-1.5 text-[11px]", tab === t.role ? "bg-black/15" : "bg-neutral-200 text-neutral-600")}>{t.n}</span>
            </button>
          ))}
        </div>
        <div className="relative min-w-[14rem] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <Input aria-label="Search templates" placeholder="Search templates…" className="h-10 pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading || !templates ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-6 rounded-[10px] border border-dashed border-neutral-300 p-8 text-center text-body-sm text-neutral-500">No templates match your search.</p>
      ) : (
        <div className="mt-6 space-y-8">
          {SECTIONS.filter((s) => tab === "ALL" || tab === s.role).map((section) => {
            const items = visible.filter((t) => t.recipientRole === section.role);
            if (items.length === 0) return null;
            return (
              <section key={section.role}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-heading text-[1.25rem] font-extrabold tracking-tight text-heading">{section.title}</h3>
                  <p className="text-body-sm text-neutral-500">{section.description}</p>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((template) => (
                    <TemplateCard key={template.key} template={template} onEdit={() => setEditing(template)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <EmailTemplateDialog template={editing} onOpenChange={(open) => !open && setEditing(null)} onSaved={handleSaved} />
    </div>
  );
}
