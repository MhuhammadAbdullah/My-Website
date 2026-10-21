"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, FieldError, Heading, Input, Label, Skeleton, Switch, toast } from "@agency/ui";
import { affiliatePageSchema, type AffiliatePageSettings } from "@agency/types";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import type { SiteSettings } from "@/lib/types";

function Group({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 p-5 bg-neutral-50">
      <Heading level={3}>{title}</Heading>
      {help && <p className="mt-1 text-body-sm text-neutral-500">{help}</p>}
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

const LABELS: { key: keyof AffiliatePageSettings["labels"]; label: string; help?: string }[] = [
  { key: "all", label: "“All” filter" },
  { key: "searchPlaceholder", label: "Search box hint" },
  { key: "featuredOnly", label: "Featured switch" },
  { key: "showing", label: "Counter text", help: "{shown} and {total} become numbers." },
  { key: "why", label: "“Why we use it” label" },
  { key: "copyCode", label: "Copy code button label" },
  { key: "copied", label: "After copying" },
  { key: "noResults", label: "Nothing found message" },
];

// "Page Sections" tab of the Affiliate Tools admin: everything on the public page besides the tools themselves.
export function AffiliatePageSettingsForm() {
  const { data: settings, loading } = useAsyncData<SiteSettings>(() => request<{ settings: SiteSettings }>("/settings").then((r) => r.settings), []);
  const [form, setForm] = React.useState<AffiliatePageSettings>(() => affiliatePageSchema.parse({}));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (settings) setForm(affiliatePageSchema.parse(settings.affiliate_page ?? {}));
  }, [settings]);

  async function save() {
    const parsed = affiliatePageSchema.safeParse(form);
    if (!parsed.success) {
      const i = parsed.error.issues[0]!;
      return setError(`${i.path.join(" › ")}: ${i.message}`);
    }
    setError("");
    setSaving(true);
    try {
      await request("/settings/affiliate_page", { method: "PUT", body: JSON.stringify({ value: parsed.data }) });
      toast.success("Saved — the Affiliate Tools page updates within about 30 seconds.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-64 w-full max-w-3xl" />;

  const pick = form.pick;
  const setPick = (patch: Partial<typeof pick>) => setForm({ ...form, pick: { ...pick, ...patch } });
  const cmp = form.compare;
  const setCmp = (patch: Partial<typeof cmp>) => setForm({ ...form, compare: { ...cmp, ...patch } });

  return (
    <div className="grid max-w-none items-start gap-6 xl:grid-cols-2">
      <p className="xl:col-span-2 text-body-sm text-neutral-500">
        The tools come from <strong>All Tools</strong> (promo code: write “code ABC123” in a tool’s Special offer; the “Why we use it” note is its own field). The heading and disclosure are in <strong>Page Content</strong>. Everything else is here.
      </p>

      <Group title="Editor’s pick (big accent block)" help="Leave the tool empty to use the first featured tool.">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Tool slug</Label>
            <Input value={pick.toolSlug} placeholder="hostinger-business-web-hosting" onChange={(e) => setPick({ toolSlug: e.target.value })} />
          </div>
          <div>
            <Label>Tag</Label>
            <Input value={pick.tag} onChange={(e) => setPick({ tag: e.target.value })} />
          </div>
          <div>
            <Label>Main button (blank = tool’s offer)</Label>
            <Input value={pick.buttonLabel} placeholder="Get 20% off" onChange={(e) => setPick({ buttonLabel: e.target.value })} />
          </div>
          <div>
            <Label>Second button</Label>
            <Input value={pick.compareLabel} onChange={(e) => setPick({ compareLabel: e.target.value })} />
          </div>
          <div>
            <Label>Rating label</Label>
            <Input value={pick.ratingLabel} onChange={(e) => setPick({ ratingLabel: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Rating</Label>
              <Input value={pick.rating} onChange={(e) => setPick({ rating: e.target.value })} />
            </div>
            <div>
              <Label>Out of</Label>
              <Input value={pick.ratingMax} onChange={(e) => setPick({ ratingMax: e.target.value })} />
            </div>
          </div>
        </div>
        <Label>Good points (rating card)</Label>
        {pick.pros.map((t, i) => (
          <div key={i} className="flex gap-2">
            <Input value={t} onChange={(e) => setPick({ pros: pick.pros.map((x, j) => (j === i ? e.target.value : x)) })} />
            <Button type="button" variant="outline" size="sm" aria-label="Remove" onClick={() => setPick({ pros: pick.pros.filter((_, j) => j !== i) })}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={pick.pros.length >= 6} onClick={() => setPick({ pros: [...pick.pros, ""] })}>
          <Plus /> Add point
        </Button>
        <div>
          <Label>Honest drawback</Label>
          <Input value={pick.con} onChange={(e) => setPick({ con: e.target.value })} />
        </div>
      </Group>

      <Group title="Small labels">
        <div className="grid gap-3 sm:grid-cols-3">
          {LABELS.map((f) => (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <Input value={form.labels[f.key]} onChange={(e) => setForm({ ...form, labels: { ...form.labels, [f.key]: e.target.value } })} />
              {f.help && <p className="mt-1 text-label text-neutral-500">{f.help}</p>}
            </div>
          ))}
        </div>
      </Group>

      <Group title="Comparison table" help="Remove all rows to hide the table. Each row has one value per column.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Heading</Label>
            <Input value={cmp.heading} onChange={(e) => setCmp({ heading: e.target.value })} />
          </div>
          <div>
            <Label>First column title</Label>
            <Input value={cmp.featureLabel} onChange={(e) => setCmp({ featureLabel: e.target.value })} />
          </div>
        </div>
        <Label>Columns</Label>
        {cmp.columns.map((c, i) => (
          <div key={i} className="flex items-center gap-3">
            <Input value={c.name} placeholder="Plan name" onChange={(e) => setCmp({ columns: cmp.columns.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
            <label className="flex shrink-0 items-center gap-2 text-body-sm">
              <Switch checked={c.highlight} onCheckedChange={(v) => setCmp({ columns: cmp.columns.map((x, j) => (j === i ? { ...x, highlight: v } : x)) })} /> Recommended ★
            </label>
            <Button type="button" variant="outline" size="sm" aria-label="Remove column" onClick={() => setCmp({ columns: cmp.columns.filter((_, j) => j !== i), rows: cmp.rows.map((r) => ({ ...r, values: r.values.filter((_, j) => j !== i) })) })}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={cmp.columns.length >= 4} onClick={() => setCmp({ columns: [...cmp.columns, { name: "", highlight: false }] })}>
          <Plus /> Add column
        </Button>
        <Label>Rows</Label>
        {cmp.rows.map((r, i) => {
          const upd = (patch: Partial<typeof r>) => setCmp({ rows: cmp.rows.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
          return (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 p-3 bg-neutral-50">
              <Input className="w-40" value={r.feature} placeholder="Feature" onChange={(e) => upd({ feature: e.target.value })} />
              {cmp.columns.map((c, ci) => (
                <Input key={ci} className="w-40" value={r.values[ci] ?? ""} placeholder={c.name || `Column ${ci + 1}`} onChange={(e) => upd({ values: cmp.columns.map((_, k) => (k === ci ? e.target.value : (r.values[k] ?? ""))) })} />
              ))}
              <Button type="button" variant="outline" size="sm" aria-label="Remove row" onClick={() => setCmp({ rows: cmp.rows.filter((_, j) => j !== i) })}>
                <Trash2 />
              </Button>
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={cmp.rows.length >= 20} onClick={() => setCmp({ rows: [...cmp.rows, { feature: "", values: cmp.columns.map(() => "") }] })}>
          <Plus /> Add row
        </Button>
      </Group>

      <Group title="“Get new deals first” (email signup)">
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["heading", "Heading"],
              ["button", "Button label"],
              ["placeholder", "Email box hint"],
              ["success", "After signing up"],
              ["error", "Error message"],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <Label>{label}</Label>
              <Input value={form.newsletter[k]} onChange={(e) => setForm({ ...form, newsletter: { ...form.newsletter, [k]: e.target.value } })} />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Label>Text</Label>
            <Input value={form.newsletter.text} onChange={(e) => setForm({ ...form, newsletter: { ...form.newsletter, text: e.target.value } })} />
          </div>
        </div>
      </Group>

      <Group title="“We’ll set it up” card" help="Wrap a word in **double stars** to highlight it.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Heading</Label>
            <Input value={form.setup.heading} onChange={(e) => setForm({ ...form, setup: { ...form.setup, heading: e.target.value } })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Text</Label>
            <Input value={form.setup.text} onChange={(e) => setForm({ ...form, setup: { ...form.setup, text: e.target.value } })} />
          </div>
          <div>
            <Label>Button label</Label>
            <Input value={form.setup.button.label} onChange={(e) => setForm({ ...form, setup: { ...form.setup, button: { ...form.setup.button, label: e.target.value } } })} />
          </div>
          <div>
            <Label>Button link</Label>
            <Input value={form.setup.button.href} placeholder="/contact" onChange={(e) => setForm({ ...form, setup: { ...form.setup, button: { ...form.setup.button, href: e.target.value } } })} />
          </div>
        </div>
      </Group>

      <FieldError>{error}</FieldError>
      <Button type="button" onClick={save} disabled={saving} className="w-fit">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
