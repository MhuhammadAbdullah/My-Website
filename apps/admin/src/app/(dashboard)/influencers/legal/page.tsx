"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { Input, Label, RichTextEditor, Skeleton, Switch, toast } from "@agency/ui";
import { influencerLegalPageSchema, type InfluencerLegalKey, type InfluencerLegalPage } from "@agency/types";
import { request } from "@/lib/api";
import { usePermissions } from "@/lib/use-permissions";
import { HomeHeader, PageTabs, StatusChip } from "@/components/home/home-header";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const PAGES: { key: InfluencerLegalKey; tab: string; defaultTitle: string; href: string }[] = [
  { key: "influencer_terms", tab: "Terms & Conditions", defaultTitle: "Influencer Terms & Conditions", href: "/influencer/terms" },
  { key: "influencer_privacy", tab: "Privacy Policy", defaultTitle: "Influencer Privacy Policy", href: "/influencer/privacy-policy" },
];

const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

// The creator-facing Terms & Conditions and Privacy Policy. Registration links to both, so keep them published.
export default function InfluencerLegalAdminPage() {
  const { can } = usePermissions();
  const canEdit = can("influencerSettings", "update");
  const [tab, setTab] = React.useState<InfluencerLegalKey>("influencer_terms");
  const [pages, setPages] = React.useState<Record<InfluencerLegalKey, InfluencerLegalPage> | null>(null);
  const [baseline, setBaseline] = React.useState<Record<InfluencerLegalKey, string>>({ influencer_terms: "", influencer_privacy: "" });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    request<{ settings: Partial<Record<InfluencerLegalKey, unknown>> }>("/settings")
      .then((r) => {
        const load = (p: (typeof PAGES)[number]) => influencerLegalPageSchema.parse(r.settings[p.key] ?? { title: p.defaultTitle, published: false });
        const next = { influencer_terms: load(PAGES[0]!), influencer_privacy: load(PAGES[1]!) };
        setPages(next);
        setBaseline({ influencer_terms: JSON.stringify(next.influencer_terms), influencer_privacy: JSON.stringify(next.influencer_privacy) });
      })
      .catch(() => toast.error("Could not load the legal pages"));
  }, []);

  if (!pages) return <Skeleton className="h-96 w-full" />;

  const meta = PAGES.find((p) => p.key === tab)!;
  const page = pages[tab];
  const dirty = JSON.stringify(page) !== baseline[tab];
  const update = (patch: Partial<InfluencerLegalPage>) => setPages((all) => (all ? { ...all, [tab]: { ...all[tab], ...patch } } : all));

  async function save() {
    const next = { ...page, lastUpdated: today() };
    const parsed = influencerLegalPageSchema.safeParse(next);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Check the fields");
    if (parsed.data.published && !parsed.data.content.replace(/<[^>]*>/g, "").trim()) return toast.error("Write the text before publishing it");
    setSaving(true);
    try {
      await request(`/settings/${tab}`, { method: "PUT", body: JSON.stringify({ value: parsed.data }) });
      setPages((all) => (all ? { ...all, [tab]: parsed.data } : all));
      setBaseline((b) => ({ ...b, [tab]: JSON.stringify(parsed.data) }));
      toast.success(parsed.data.published ? "Saved and live" : "Saved (not shown on the site)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <HomeHeader
        title="Creator legal"
        description="The Terms & Conditions and Privacy Policy creators agree to when they register. The registration form links to both."
        tabs={<PageTabs tabs={PAGES.map((p) => ({ value: p.key, label: p.tab }))} value={tab} onChange={setTab} />}
        chips={
          <>
            <StatusChip tone={page.published ? "saved" : "todo"}>{page.published ? "Live on site" : "Not published"}</StatusChip>
            {dirty && <StatusChip tone="unsaved">Unsaved edits</StatusChip>}
          </>
        }
        actions={
          <>
            <a href={`${siteUrl}${meta.href}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-neutral-300 px-4 text-[13px] font-bold text-heading transition-colors hover:border-accent-500 hover:text-accent-500">
              View page <ExternalLink className="size-3.5" aria-hidden />
            </a>
            {canEdit && (
              <button type="button" onClick={save} disabled={saving || !dirty} className="inline-flex h-10 items-center rounded-full bg-accent-500 px-5 text-[13px] font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50">
                {saving ? "Saving…" : "Save changes"}
              </button>
            )}
          </>
        }
      />

      <div className="mt-6 grid gap-5">
        <div className="grid items-end gap-4 rounded-[10px] border border-neutral-200 bg-neutral-50 p-5 sm:grid-cols-[1fr_auto]">
          <div>
            <Label>Page title</Label>
            <Input value={page.title} disabled={!canEdit} onChange={(e) => update({ title: e.target.value })} />
          </div>
          <label className="flex items-center gap-3 rounded-[8px] border border-neutral-200 px-4 py-2.5">
            <span>
              <span className="block text-body-sm font-medium text-heading">Show on the site</span>
              <span className="block text-label text-neutral-500">{page.lastUpdated ? `Last updated ${page.lastUpdated}` : "Never saved yet"}</span>
            </span>
            <Switch checked={page.published} disabled={!canEdit} onCheckedChange={(v) => update({ published: v })} />
          </label>
        </div>

        <div>
          <Label>Text</Label>
          <RichTextEditor value={page.content} onChange={(html) => update({ content: html })} placeholder="Write the text creators will agree to…" />
        </div>
      </div>
    </div>
  );
}
