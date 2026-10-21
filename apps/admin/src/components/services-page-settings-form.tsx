"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, FieldError, Heading, Input, Label, Skeleton, Switch, Textarea, toast } from "@agency/ui";
import { servicesPageSchema, type ServicesPageSettings } from "@agency/types";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import type { SiteSettings } from "@/lib/types";

const LABEL_FIELDS: { key: keyof ServicesPageSettings["labels"]; label: string }[] = [
  { key: "all", label: "“All” filter" },
  { key: "pricesIn", label: "“Prices in” label" },
  { key: "from", label: "“From” (before a price)" },
  { key: "perMonth", label: "Monthly suffix" },
  { key: "getQuote", label: "Quote button" },
  { key: "details", label: "Details button" },
  { key: "whatYouGet", label: "“What you get” title" },
  { key: "timeline", label: "“Timeline” title" },
  { key: "onRequest", label: "No price shown" },
];

function Group({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 p-5 bg-neutral-50">
      <Heading level={3}>{title}</Heading>
      {help && <p className="mt-1 text-body-sm text-neutral-500">{help}</p>}
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

// "Page Sections" tab of the Services admin: everything on the public Services page below the hero.
export function ServicesPageSettingsForm() {
  const { data: settings, loading } = useAsyncData<SiteSettings>(() => request<{ settings: SiteSettings }>("/settings").then((r) => r.settings), []);
  const [form, setForm] = React.useState<ServicesPageSettings>(() => servicesPageSchema.parse({}));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (settings) setForm(servicesPageSchema.parse(settings.services_page ?? {}));
  }, [settings]);

  const set = <K extends keyof ServicesPageSettings>(key: K, value: ServicesPageSettings[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    const parsed = servicesPageSchema.safeParse(form);
    if (!parsed.success) {
      const i = parsed.error.issues[0]!;
      setError(`${i.path.join(" › ")}: ${i.message}`);
      return;
    }
    setError("");
    setSaving(true);
    try {
      await request("/settings/services_page", { method: "PUT", body: JSON.stringify({ value: parsed.data }) });
      toast.success("Saved — the Services page updates within about 30 seconds.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-64 w-full max-w-3xl" />;

  return (
    <div className="grid max-w-none items-start gap-6 xl:grid-cols-2">
      <p className="xl:col-span-2 text-body-sm text-neutral-500">
        The service rows themselves come from the <strong>All Services</strong> tab; the heading and paragraph at the very top come from <strong>Page Content</strong>. Everything below the list is edited here.
      </p>

      <Group title="Price currencies" help="Add two or more currencies to show the “Prices in” switcher. Each number says how many units equal 1 of your reference currency (e.g. USD 1, PKR 280). Prices are converted from their own currency. Set the rates yourself and keep them current.">
        {form.currencies.map((c, i) => (
          <div key={i} className="grid grid-cols-[8rem_1fr_auto] items-end gap-3">
            <div>
              <Label>Code</Label>
              <Input value={c.code} maxLength={3} onChange={(e) => set("currencies", form.currencies.map((x, j) => (j === i ? { ...x, code: e.target.value.toUpperCase() } : x)))} placeholder="USD" />
            </div>
            <div>
              <Label>Rate</Label>
              <Input type="number" min={0} step="any" value={c.rate} onChange={(e) => set("currencies", form.currencies.map((x, j) => (j === i ? { ...x, rate: Number(e.target.value) } : x)))} />
            </div>
            <Button type="button" variant="ghost" size="sm" aria-label="Remove currency" onClick={() => set("currencies", form.currencies.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={form.currencies.length >= 6} onClick={() => set("currencies", [...form.currencies, { code: "", rate: 1 }])}>
          <Plus /> Add currency
        </Button>
      </Group>

      <Group title="Ways to work with us" help="Up to 4 cards under the list. Tick “Highlighted” on one to make it the accent card.">
        <div>
          <Label>Heading</Label>
          <Input value={form.engagement.heading} onChange={(e) => set("engagement", { ...form.engagement, heading: e.target.value })} />
        </div>
        <div>
          <Label>Intro</Label>
          <Textarea rows={2} value={form.engagement.intro} onChange={(e) => set("engagement", { ...form.engagement, intro: e.target.value })} />
        </div>
        {form.engagement.models.map((m, i) => {
          const upd = (patch: Partial<typeof m>) => set("engagement", { ...form.engagement, models: form.engagement.models.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
          return (
            <div key={i} className="grid gap-3 rounded-xl border border-neutral-200 p-4 bg-neutral-50">
              <div className="flex items-center justify-between">
                <p className="text-body-sm font-semibold text-heading">Card {i + 1}</p>
                <Button type="button" variant="ghost" size="sm" aria-label="Remove card" onClick={() => set("engagement", { ...form.engagement, models: form.engagement.models.filter((_, j) => j !== i) })}>
                  <Trash2 />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Small label</Label>
                  <Input value={m.label} onChange={(e) => upd({ label: e.target.value })} placeholder="Fixed project" />
                </div>
                <div>
                  <Label>Title</Label>
                  <Input value={m.title} onChange={(e) => upd({ title: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={2} value={m.description} onChange={(e) => upd({ description: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-body-sm">
                <Switch checked={m.highlighted} onCheckedChange={(v) => upd({ highlighted: v })} /> Highlighted (accent card)
              </label>
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={form.engagement.models.length >= 4} onClick={() => set("engagement", { ...form.engagement, models: [...form.engagement.models, { label: "", title: "", description: "", highlighted: false }] })}>
          <Plus /> Add card
        </Button>
      </Group>

      <Group title="Estimate your project" help="The calculator at the bottom. Visitors tick services and see a combined starting price. In the note, {count} becomes the number of selected services.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Heading</Label>
            <Input value={form.estimate.heading} onChange={(e) => set("estimate", { ...form.estimate, heading: e.target.value })} />
          </div>
          <div>
            <Label>Card label</Label>
            <Input value={form.estimate.cardLabel} onChange={(e) => set("estimate", { ...form.estimate, cardLabel: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Intro</Label>
          <Textarea rows={2} value={form.estimate.intro} onChange={(e) => set("estimate", { ...form.estimate, intro: e.target.value })} />
        </div>
        <div>
          <Label>Note under the price</Label>
          <Textarea rows={2} value={form.estimate.note} onChange={(e) => set("estimate", { ...form.estimate, note: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Text before anything is picked</Label>
            <Input value={form.estimate.emptyText} onChange={(e) => set("estimate", { ...form.estimate, emptyText: e.target.value })} />
          </div>
          <div>
            <Label>Button label</Label>
            <Input value={form.estimate.button.label} onChange={(e) => set("estimate", { ...form.estimate, button: { ...form.estimate.button, label: e.target.value } })} />
          </div>
          <div>
            <Label>Button link</Label>
            <Input value={form.estimate.button.href} onChange={(e) => set("estimate", { ...form.estimate, button: { ...form.estimate.button, href: e.target.value } })} placeholder="/contact" />
          </div>
        </div>
      </Group>

      <Group title="Client reviews" help="Visitors can write a review of your service at the bottom of the Services page; it goes live at once. Hide or show reviews in Admin → Testimonials.">
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["heading", "Heading"],
              ["write", "Write a review button"],
              ["formTitle", "Form title"],
              ["yourRating", "Rating label"],
              ["yourName", "Name label"],
              ["yourCompany", "Company label"],
              ["yourReview", "Review text label"],
              ["submit", "Submit button"],
              ["showMore", "Show more button"],
              ["reviewsCount", "Count text ({n} = number)"],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <Label>{label}</Label>
              <Input value={form.reviews[k]} onChange={(e) => set("reviews", { ...form.reviews, [k]: e.target.value })} />
            </div>
          ))}
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3 rounded-xl border border-neutral-200 p-3 sm:col-span-3 bg-neutral-50">
            <label className="flex items-center gap-2 text-body-sm">
              <Switch checked={form.reviews.marquee.enabled} onCheckedChange={(v) => set("reviews", { ...form.reviews, marquee: { ...form.reviews.marquee, enabled: v } })} /> Slide reviews automatically (infinite slider)
            </label>
            <div className="w-40">
              <Label>Seconds per loop (higher = slower)</Label>
              <Input type="number" min={10} max={200} value={form.reviews.marquee.speed} onChange={(e) => set("reviews", { ...form.reviews, marquee: { ...form.reviews.marquee, speed: Number(e.target.value) || 50 } })} />
            </div>
            <label className="flex items-center gap-2 text-body-sm">
              <Switch checked={form.reviews.marquee.pauseOnHover} onCheckedChange={(v) => set("reviews", { ...form.reviews, marquee: { ...form.reviews.marquee, pauseOnHover: v } })} /> Pause when the mouse is over it
            </label>
          </div>
          <div className="sm:col-span-3">
            <Label>Form intro</Label>
            <Input value={form.reviews.formIntro} onChange={(e) => set("reviews", { ...form.reviews, formIntro: e.target.value })} />
          </div>
          <div className="sm:col-span-3">
            <Label>After submitting</Label>
            <Input value={form.reviews.thanks} onChange={(e) => set("reviews", { ...form.reviews, thanks: e.target.value })} />
          </div>
          <div className="sm:col-span-3">
            <Label>When there are no reviews yet</Label>
            <Input value={form.reviews.empty} onChange={(e) => set("reviews", { ...form.reviews, empty: e.target.value })} />
          </div>
        </div>
      </Group>

      <Group title="Small labels" help="The short words used on the page (filters, buttons, price text).">
        <div className="grid gap-3 sm:grid-cols-3">
          {LABEL_FIELDS.map((f) => (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <Input value={form.labels[f.key]} onChange={(e) => set("labels", { ...form.labels, [f.key]: e.target.value })} />
            </div>
          ))}
        </div>
      </Group>

      <FieldError>{error}</FieldError>
      <Button type="button" onClick={save} disabled={saving} className="w-fit">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
