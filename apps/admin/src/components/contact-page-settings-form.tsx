"use client";

import * as React from "react";
import { Button, FieldError, Heading, Input, Label, Skeleton, Textarea, toast } from "@agency/ui";
import { contactPageSchema, type ContactPageSettings } from "@agency/types";
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

const lines = (v: string) => v.split("\n").map((x) => x.trim()).filter(Boolean);

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function LineList({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  // keep the raw text while typing so Enter / trailing spaces are not eaten
  const [raw, setRaw] = React.useState(value.join("\n"));
  React.useEffect(() => setRaw(value.join("\n")), [value.join("\n")]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <Label>{label} (one per line)</Label>
      <Textarea
        rows={Math.min(10, Math.max(3, value.length + 1))}
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          onChange(lines(e.target.value));
        }}
      />
    </div>
  );
}

// "Page Sections" tab of the Contact admin: everything on the public Contact page besides contact details (Site Settings) and the hero (Page Content).
export function ContactPageSettingsForm() {
  const { data: settings, loading } = useAsyncData<SiteSettings>(() => request<{ settings: SiteSettings }>("/settings").then((r) => r.settings), []);
  const [f, setF] = React.useState<ContactPageSettings>(() => contactPageSchema.parse({}));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (settings) setF(contactPageSchema.parse(settings.contact_page ?? {}));
  }, [settings]);

  async function save() {
    const parsed = contactPageSchema.safeParse(f);
    if (!parsed.success) {
      const i = parsed.error.issues[0]!;
      return setError(`${i.path.join(" › ")}: ${i.message}`);
    }
    setError("");
    setSaving(true);
    try {
      await request("/settings/contact_page", { method: "PUT", body: JSON.stringify({ value: parsed.data }) });
      toast.success("Saved — the Contact page updates within about 30 seconds.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-64 w-full max-w-3xl" />;

  const st = f.status;
  const ch = f.channels;
  const fm = f.form;
  const sd = f.studio;

  return (
    <div className="grid max-w-none items-start gap-6 xl:grid-cols-2">
      <p className="xl:col-span-2 text-body-sm text-neutral-500">
        Email, WhatsApp number, address, hours, map and Calendly link come from <strong>Site Settings</strong>. The hero heading is in <strong>Page Content</strong>. Everything else is edited here.
      </p>

      <Group title="Studio status card (next to the heading)">
        <Field label="Status line" value={st.text} onChange={(v) => setF({ ...f, status: { ...st, text: v } })} />
        <Field label="Hours line" value={st.hours} onChange={(v) => setF({ ...f, status: { ...st, hours: v } })} />
        <Field label="Reply time line" value={st.reply} onChange={(v) => setF({ ...f, status: { ...st, reply: v } })} />
      </Group>

      <Group title="Four contact cards" help="Leave a title empty to use its default (email address, the WhatsApp and Calendly button labels from Page Content).">
        {(
          [
            ["email", "Email"],
            ["whatsapp", "WhatsApp"],
            ["call", "Call"],
          ] as const
        ).map(([k, name]) => (
          <div key={k} className="grid gap-3 rounded-xl border border-neutral-200 p-3 sm:grid-cols-3 bg-neutral-50">
            <Field label={`${name}: small label`} value={ch[k].tag} onChange={(v) => setF({ ...f, channels: { ...ch, [k]: { ...ch[k], tag: v } } })} />
            <Field label="Big title (optional)" value={ch[k].title} onChange={(v) => setF({ ...f, channels: { ...ch, [k]: { ...ch[k], title: v } } })} />
            <Field label="Line under it" value={ch[k].sub} onChange={(v) => setF({ ...f, channels: { ...ch, [k]: { ...ch[k], sub: v } } })} />
          </div>
        ))}
        <div className="grid gap-3 rounded-xl border border-neutral-200 p-3 sm:grid-cols-4 bg-neutral-50">
          <Field label="Influencers: small label" value={ch.influencers.tag} onChange={(v) => setF({ ...f, channels: { ...ch, influencers: { ...ch.influencers, tag: v } } })} />
          <Field label="Big title" value={ch.influencers.title} onChange={(v) => setF({ ...f, channels: { ...ch, influencers: { ...ch.influencers, title: v } } })} />
          <Field label="Line under it" value={ch.influencers.sub} onChange={(v) => setF({ ...f, channels: { ...ch, influencers: { ...ch.influencers, sub: v } } })} />
          <Field label="Link" value={ch.influencers.href} placeholder="/influencers" onChange={(v) => setF({ ...f, channels: { ...ch, influencers: { ...ch.influencers, href: v } } })} />
        </div>
      </Group>

      <Group title="“Start a project” form" help="Choices the visitor makes in steps 1 and 2 are added to the top of the message they send (see Site → Messages).">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Heading" value={fm.heading} onChange={(v) => setF({ ...f, form: { ...fm, heading: v } })} />
          <Field label="Intro line" value={fm.intro} onChange={(v) => setF({ ...f, form: { ...fm, intro: v } })} />
        </div>
        <LineList label="Step names (3)" value={fm.steps} onChange={(v) => setF({ ...f, form: { ...fm, steps: v.slice(0, 3) } })} />
        <Field label="Step 1 question" value={fm.typeQuestion} onChange={(v) => setF({ ...f, form: { ...fm, typeQuestion: v } })} />
        <LineList label="Project types" value={fm.types} onChange={(v) => setF({ ...f, form: { ...fm, types: v } })} />
        <Field label="Step 2 budget question" value={fm.budgetQuestion} onChange={(v) => setF({ ...f, form: { ...fm, budgetQuestion: v } })} />
        <LineList label="Budgets" value={fm.budgets} onChange={(v) => setF({ ...f, form: { ...fm, budgets: v } })} />
        <Field label="Step 2 timeline question" value={fm.timelineQuestion} onChange={(v) => setF({ ...f, form: { ...fm, timelineQuestion: v } })} />
        <LineList label="Timelines" value={fm.timelines} onChange={(v) => setF({ ...f, form: { ...fm, timelines: v } })} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Step 3 heading" value={fm.detailsQuestion} onChange={(v) => setF({ ...f, form: { ...fm, detailsQuestion: v } })} />
          <Field label="Nothing picked message" value={fm.pickOne} onChange={(v) => setF({ ...f, form: { ...fm, pickOne: v } })} />
          <Field label="Success message" value={fm.success} onChange={(v) => setF({ ...f, form: { ...fm, success: v } })} />
          <Field label="Continue button" value={fm.next} onChange={(v) => setF({ ...f, form: { ...fm, next: v } })} />
          <Field label="Back button" value={fm.back} onChange={(v) => setF({ ...f, form: { ...fm, back: v } })} />
          <Field label="Send button" value={fm.submit} onChange={(v) => setF({ ...f, form: { ...fm, submit: v } })} />
        </div>
      </Group>

      <Group title="Studio card (address + map)">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Small label" value={sd.tag} onChange={(v) => setF({ ...f, studio: { ...sd, tag: v } })} />
          <Field label="Note under the hours" value={sd.note} onChange={(v) => setF({ ...f, studio: { ...sd, note: v } })} />
          <Field label="Directions button" value={sd.directions} onChange={(v) => setF({ ...f, studio: { ...sd, directions: v } })} />
          <Field label="Directions link (blank = Google Maps search of the address)" value={sd.mapLink} onChange={(v) => setF({ ...f, studio: { ...sd, mapLink: v } })} />
        </div>
      </Group>

      <Group title="Questions block" help="The questions themselves are in Site → FAQs (context: Contact).">
        <Field label="Heading" value={f.faqHeading} onChange={(v) => setF({ ...f, faqHeading: v })} />
      </Group>

      <FieldError>{error}</FieldError>
      <Button type="button" onClick={save} disabled={saving} className="w-fit">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
