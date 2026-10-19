"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, FieldError, Heading, Input, Label, Skeleton, toast } from "@agency/ui";
import { aboutPageSchema, type AboutPageSettings } from "@agency/types";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import type { SiteSettings } from "@/lib/types";

function Group({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 p-5">
      <Heading level={3}>{title}</Heading>
      {help && <p className="mt-1 text-body-sm text-neutral-500">{help}</p>}
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

// "Page Sections" tab of the About admin: everything on the public About page besides the story, values, timeline and team records.
export function AboutPageSettingsForm() {
  const { data: settings, loading } = useAsyncData<SiteSettings>(() => request<{ settings: SiteSettings }>("/settings").then((r) => r.settings), []);
  const [form, setForm] = React.useState<AboutPageSettings>(() => aboutPageSchema.parse({}));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (settings) setForm(aboutPageSchema.parse(settings.about_page ?? {}));
  }, [settings]);

  async function save() {
    const parsed = aboutPageSchema.safeParse(form);
    if (!parsed.success) {
      const i = parsed.error.issues[0]!;
      return setError(`${i.path.join(" › ")}: ${i.message}`);
    }
    setError("");
    setSaving(true);
    try {
      await request("/settings/about_page", { method: "PUT", body: JSON.stringify({ value: parsed.data }) });
      toast.success("Saved — the About page updates within about 30 seconds.");
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
        The story, mission/vision/philosophy texts, core values, timeline and team come from the other tabs. The numbers, headlines, open roles and closing block are edited here.
      </p>

      <Group title="Numbers under the intro" help="Up to 6. Write the value as you want it shown, e.g. 10+ or 85%.">
        {form.stats.map((st, i) => (
          <div key={i} className="grid grid-cols-[8rem_1fr_auto] items-end gap-3">
            <div>
              <Label>Value</Label>
              <Input value={st.value} onChange={(e) => setForm({ ...form, stats: form.stats.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
            </div>
            <div>
              <Label>Label</Label>
              <Input value={st.label} onChange={(e) => setForm({ ...form, stats: form.stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
            </div>
            <Button type="button" variant="outline" size="sm" aria-label="Remove" onClick={() => setForm({ ...form, stats: form.stats.filter((_, j) => j !== i) })}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={form.stats.length >= 6} onClick={() => setForm({ ...form, stats: [...form.stats, { value: "", label: "" }] })}>
          <Plus /> Add number
        </Button>
      </Group>

      <Group title="Mission / Vision / Philosophy headlines" help="The big line shown above each text (the text itself is in the Story tab).">
        {(["mission", "vision", "philosophy"] as const).map((k) => (
          <div key={k}>
            <Label className="capitalize">{k}</Label>
            <Input value={form.tabHeadings[k]} onChange={(e) => setForm({ ...form, tabHeadings: { ...form.tabHeadings, [k]: e.target.value } })} />
          </div>
        ))}
      </Group>

      <Group title="Short lines under headings">
        <div>
          <Label>Under the timeline heading</Label>
          <Input value={form.timelineSubtitle} onChange={(e) => setForm({ ...form, timelineSubtitle: e.target.value })} />
        </div>
        <div>
          <Label>Under the team heading</Label>
          <Input value={form.teamSubtitle} onChange={(e) => setForm({ ...form, teamSubtitle: e.target.value })} />
        </div>
      </Group>

      <Group title="Join the team" help="Remove all roles to hide this block.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Heading</Label>
            <Input value={form.careers.heading} onChange={(e) => setForm({ ...form, careers: { ...form.careers, heading: e.target.value } })} />
          </div>
          <div>
            <Label>Line under the heading</Label>
            <Input value={form.careers.text} onChange={(e) => setForm({ ...form, careers: { ...form.careers, text: e.target.value } })} />
          </div>
        </div>
        {form.careers.roles.map((r, i) => {
          const upd = (patch: Partial<typeof r>) => setForm({ ...form, careers: { ...form.careers, roles: form.careers.roles.map((x, j) => (j === i ? { ...x, ...patch } : x)) } });
          return (
            <div key={i} className="grid gap-2 rounded-xl border border-neutral-200 p-3 sm:grid-cols-[1fr_12rem_10rem_auto] sm:items-end">
              <div>
                <Label>Role</Label>
                <Input value={r.title} onChange={(e) => upd({ title: e.target.value })} />
              </div>
              <div>
                <Label>Place · type</Label>
                <Input value={r.meta} onChange={(e) => upd({ meta: e.target.value })} />
              </div>
              <div>
                <Label>Link</Label>
                <Input value={r.href} placeholder="/contact" onChange={(e) => upd({ href: e.target.value })} />
              </div>
              <Button type="button" variant="outline" size="sm" aria-label="Remove" onClick={() => setForm({ ...form, careers: { ...form.careers, roles: form.careers.roles.filter((_, j) => j !== i) } })}>
                <Trash2 />
              </Button>
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={form.careers.roles.length >= 12} onClick={() => setForm({ ...form, careers: { ...form.careers, roles: [...form.careers.roles, { title: "", meta: "", href: "/contact" }] } })}>
          <Plus /> Add role
        </Button>
      </Group>

      <Group title="Closing block" help="Wrap a word in **double stars** to highlight it.">
        <div className="grid gap-3 sm:grid-cols-3">
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
      </Group>

      <FieldError>{error}</FieldError>
      <Button type="button" onClick={save} disabled={saving} className="w-fit">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
