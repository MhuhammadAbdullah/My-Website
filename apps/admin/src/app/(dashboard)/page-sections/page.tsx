"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Heading, Skeleton, Switch, cn, toast } from "@agency/ui";
import { PAGE_SECTIONS, type PageSectionKey, type SectionVisibility } from "@agency/types";
import { request } from "@/lib/api";
import { usePermissions } from "@/lib/use-permissions";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const PAGES = Object.entries(PAGE_SECTIONS) as [PageSectionKey, (typeof PAGE_SECTIONS)[PageSectionKey]][];

// Show / hide the blocks of every public page. Hidden keys are stored per page; each switch saves at once.
export default function PageSectionsPage() {
  const { can } = usePermissions();
  const canEdit = can("settings", "update");
  const [hidden, setHidden] = React.useState<SectionVisibility | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    request<{ settings: { section_visibility?: SectionVisibility } }>("/settings")
      .then((r) => setHidden(r.settings.section_visibility ?? {}))
      .catch(() => setHidden({}));
  }, []);

  async function toggle(page: string, key: string, visible: boolean) {
    if (!hidden) return;
    const current = hidden[page] ?? [];
    const next: SectionVisibility = { ...hidden, [page]: visible ? current.filter((k) => k !== key) : [...new Set([...current, key])] };
    const id = `${page}.${key}`;
    setHidden(next);
    setBusy(id);
    try {
      await request("/settings/section_visibility", { method: "PUT", body: JSON.stringify({ value: next }) });
      toast.success(visible ? "Section is shown again" : "Section hidden — the page updates within a few minutes");
    } catch (e) {
      setHidden(hidden);
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <Heading level={2} className="admin-page-title">
        Page sections
      </Heading>
      <p className="mt-2 max-w-2xl text-body-sm text-neutral-500">
        Switch any block of a public page on or off. Hidden blocks stay saved — nothing is deleted. Home page sections are controlled inside{" "}
        <Link href="/home" className="font-bold text-accent-500 hover:underline">
          Home Page
        </Link>
        .
      </p>

      {!hidden ? (
        <Skeleton className="mt-6 h-64 w-full" />
      ) : (
        <div className="mt-6 grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {PAGES.map(([page, def]) => {
            const off = (hidden[page] ?? []).length;
            return (
              <section key={page} className="rounded-[10px] border border-neutral-200 bg-neutral-50">
                <header className="flex items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
                  <div>
                    <h3 className="font-heading font-extrabold tracking-tight text-heading">{def.label}</h3>
                    <p className="mt-0.5 text-label text-neutral-500">{off ? `${off} hidden` : "All sections shown"}</p>
                  </div>
                  <a href={`${siteUrl}${def.href}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-label font-bold text-accent-500 hover:underline">
                    View <ExternalLink className="size-3" aria-hidden />
                  </a>
                </header>
                <ul className="divide-y divide-neutral-200">
                  {def.sections.map((s) => {
                    const visible = !(hidden[page] ?? []).includes(s.key);
                    return (
                      <li key={s.key} className="flex items-center justify-between gap-3 px-5 py-2.5">
                        <span className={cn("text-[13px] font-semibold", visible ? "text-heading" : "text-neutral-400 line-through")}>{s.label}</span>
                        <span className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-neutral-400">{visible ? "Shown" : "Hidden"}</span>
                          <Switch checked={visible} disabled={!canEdit || busy === `${page}.${s.key}`} onCheckedChange={(v) => toggle(page, s.key, v)} aria-label={`Show ${s.label} on the ${def.label} page`} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
