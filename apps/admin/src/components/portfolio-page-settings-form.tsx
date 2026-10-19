"use client";

import * as React from "react";
import { Button, FieldError, Heading, Input, Label, Skeleton, toast } from "@agency/ui";
import { portfolioPageSchema, type PortfolioPageSettings } from "@agency/types";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import type { SiteSettings } from "@/lib/types";

const DETAIL_FIELDS: { key: Exclude<keyof PortfolioPageSettings["detail"], "ctaButton" | "chapterGroups">; label: string; wide?: boolean }[] = [
  { key: "visitSite", label: "Live site button" },
  { key: "viewCode", label: "Code button" },
  { key: "readStory", label: "“Read the story” button" },
  { key: "client", label: "Facts: client" },
  { key: "industry", label: "Facts: industry" },
  { key: "timeline", label: "Facts: timeline" },
  { key: "stack", label: "Facts: stack" },
  { key: "numbersTitle", label: "Results block title" },
  { key: "chapters", label: "Chapters list title" },
  { key: "beforeAfter", label: "Before/After heading" },
  { key: "beforeAfterHint", label: "Before/After hint", wide: true },
  { key: "compare", label: "Compare label" },
  { key: "before", label: "“Before” tag" },
  { key: "after", label: "“After” tag" },
  { key: "screens", label: "Screens heading" },
  { key: "nextProject", label: "“Next project” label" },
];

const LABEL_FIELDS: { key: keyof PortfolioPageSettings["labels"]; label: string; help?: string }[] = [
  { key: "featured", label: "“Featured” tag" },
  { key: "all", label: "“All” filter" },
  { key: "searchPlaceholder", label: "Search box hint" },
  { key: "grid", label: "Grid switch" },
  { key: "list", label: "List switch" },
  { key: "readCaseStudy", label: "Case study button" },
  { key: "projectsShipped", label: "Big number 1 label", help: "The number is your published project count." },
  { key: "industriesServed", label: "Big number 2 label", help: "The number is your project category count." },
  { key: "loadMore", label: "Load more button" },
  { key: "showing", label: "Counter text", help: "{shown} and {total} become numbers." },
  { key: "noResults", label: "Nothing found message" },
];

// "Page Sections" tab of the Portfolio admin: everything on the public Work page besides the projects.
export function PortfolioPageSettingsForm() {
  const { data: settings, loading } = useAsyncData<SiteSettings>(() => request<{ settings: SiteSettings }>("/settings").then((r) => r.settings), []);
  const [form, setForm] = React.useState<PortfolioPageSettings>(() => portfolioPageSchema.parse({}));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (settings) setForm(portfolioPageSchema.parse(settings.portfolio_page ?? {}));
  }, [settings]);

  async function save() {
    const parsed = portfolioPageSchema.safeParse(form);
    if (!parsed.success) {
      const i = parsed.error.issues[0]!;
      return setError(`${i.path.join(" › ")}: ${i.message}`);
    }
    setError("");
    setSaving(true);
    try {
      await request("/settings/portfolio_page", { method: "PUT", body: JSON.stringify({ value: parsed.data }) });
      toast.success("Saved — the Portfolio page updates within about 30 seconds.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-64 w-full max-w-3xl" />;

  return (
    <div className="grid max-w-3xl gap-6">
      <p className="text-body-sm text-neutral-500">
        Projects come from <strong>All Projects</strong> (mark a few as <em>featured</em> for the big slider at the top). The heading at the top comes from <strong>Page Content</strong>. The rest is edited here.
      </p>

      <section className="rounded-2xl border border-neutral-200 p-5">
        <Heading level={3}>Grid</Heading>
        <div className="mt-4 max-w-xs">
          <Label>Projects shown at first (and per “Load more”)</Label>
          <Input type="number" min={3} max={24} value={form.pageSize} onChange={(e) => setForm({ ...form, pageSize: Number(e.target.value) || 7 })} />
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 p-5">
        <Heading level={3}>Closing call-to-action</Heading>
        <p className="mt-1 text-body-sm text-neutral-500">The big accent block at the bottom. Wrap a word in **double stars** to underline it.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Label>Heading</Label>
            <Input value={form.cta.heading} onChange={(e) => setForm({ ...form, cta: { ...form.cta, heading: e.target.value } })} />
          </div>
          <div>
            <Label>Button label</Label>
            <Input value={form.cta.button.label} onChange={(e) => setForm({ ...form, cta: { ...form.cta, button: { ...form.cta.button, label: e.target.value } } })} />
          </div>
          <div>
            <Label>Button link</Label>
            <Input value={form.cta.button.href} placeholder="/contact" onChange={(e) => setForm({ ...form, cta: { ...form.cta, button: { ...form.cta.button, href: e.target.value } } })} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 p-5">
        <Heading level={3}>Single project (case study) page</Heading>
        <p className="mt-1 text-body-sm text-neutral-500">
          Each project page is built from the project itself (All Projects tab): summary, live link, results, chapters (sections), gallery images and testimonial. For the Before → After slider, give two gallery images the captions “Before” and “After”; remaining images appear under “Screens”.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {DETAIL_FIELDS.map((f) => (
            <div key={f.key} className={f.wide ? "sm:col-span-3" : ""}>
              <Label>{f.label}</Label>
              <Input value={form.detail[f.key]} onChange={(e) => setForm({ ...form, detail: { ...form.detail, [f.key]: e.target.value } })} />
            </div>
          ))}
          <div className="grid gap-3 sm:col-span-3">
            <Label>Chapters (each groups project sections by their title, e.g. “Overview, Client Problem”)</Label>
            {form.detail.chapterGroups.map((g, i) => {
              const set = (patch: Partial<typeof g>) =>
                setForm({ ...form, detail: { ...form.detail, chapterGroups: form.detail.chapterGroups.map((x, j) => (j === i ? { ...x, ...patch } : x)) } });
              return (
                <div key={i} className="grid gap-2 rounded-xl border border-neutral-200 p-3 sm:grid-cols-2">
                  <Input value={g.title} placeholder="Chapter title" onChange={(e) => set({ title: e.target.value })} />
                  <Input value={g.sections} placeholder="Section titles, comma separated" onChange={(e) => set({ sections: e.target.value })} />
                  <Input className="sm:col-span-2" value={g.lead} placeholder="Intro line under the title (optional)" onChange={(e) => set({ lead: e.target.value })} />
                  <button type="button" className="w-fit text-label text-red-600" onClick={() => setForm({ ...form, detail: { ...form.detail, chapterGroups: form.detail.chapterGroups.filter((_, j) => j !== i) } })}>
                    Remove chapter
                  </button>
                </div>
              );
            })}
            <Button type="button" variant="outline" className="w-fit" onClick={() => setForm({ ...form, detail: { ...form.detail, chapterGroups: [...form.detail.chapterGroups, { title: "", lead: "", sections: "" }] } })}>
              Add chapter
            </Button>
          </div>
          <div className="sm:col-span-3">
            <Label>Closing heading (wrap a word in **stars** to highlight it)</Label>
            <Input value={form.detail.ctaHeading} onChange={(e) => setForm({ ...form, detail: { ...form.detail, ctaHeading: e.target.value } })} />
          </div>
          <div>
            <Label>Closing button label</Label>
            <Input value={form.detail.ctaButton.label} onChange={(e) => setForm({ ...form, detail: { ...form.detail, ctaButton: { ...form.detail.ctaButton, label: e.target.value } } })} />
          </div>
          <div>
            <Label>Closing button link</Label>
            <Input value={form.detail.ctaButton.href} placeholder="/contact" onChange={(e) => setForm({ ...form, detail: { ...form.detail, ctaButton: { ...form.detail.ctaButton, href: e.target.value } } })} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 p-5">
        <Heading level={3}>Small labels</Heading>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {LABEL_FIELDS.map((f) => (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <Input value={form.labels[f.key]} onChange={(e) => setForm({ ...form, labels: { ...form.labels, [f.key]: e.target.value } })} />
              {f.help && <p className="mt-1 text-label text-neutral-500">{f.help}</p>}
            </div>
          ))}
        </div>
      </section>

      <FieldError>{error}</FieldError>
      <Button type="button" onClick={save} disabled={saving} className="w-fit">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
