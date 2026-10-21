"use client";

import * as React from "react";
import { InfoHint } from "@/components/field-hint";
import { Button, FieldError, Heading, Input, Label, Skeleton, Switch, Textarea, toast } from "@agency/ui";
import { announcementBarSchema, type AnnouncementBarInput } from "@agency/types";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import type { SiteSettings } from "@/lib/types";

const EMPTY_FORM: AnnouncementBarInput = {
  enabled: false,
  backgroundColor: "#111111",
  textColor: "#ffffff",
  messages: [],
  link: "",
  dismissible: false,
};

export default function AnnouncementBarPage() {
  const { data: settings, loading } = useAsyncData<SiteSettings>(
    () => request<{ settings: SiteSettings }>("/settings").then((r) => r.settings),
    [],
  );
  const [form, setForm] = React.useState<AnnouncementBarInput>(EMPTY_FORM);
  const [messagesText, setMessagesText] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!settings) return;
    const bar = settings.announcement_bar;
    const next: AnnouncementBarInput = {
      enabled: bar?.enabled ?? EMPTY_FORM.enabled,
      backgroundColor: bar?.backgroundColor ?? EMPTY_FORM.backgroundColor,
      textColor: bar?.textColor ?? EMPTY_FORM.textColor,
      messages: bar?.messages ?? EMPTY_FORM.messages,
      link: bar?.link ?? EMPTY_FORM.link,
      dismissible: bar?.dismissible ?? EMPTY_FORM.dismissible,
    };
    setForm(next);
    setMessagesText(next.messages.join("\n"));
  }, [settings]);

  function setField<K extends keyof AnnouncementBarInput>(key: K, value: AnnouncementBarInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const previewMessages = messagesText
    .split("\n")
    .map((m) => m.trim())
    .filter(Boolean);

  async function handleSave() {
    const parsed = announcementBarSchema.safeParse({ ...form, messages: previewMessages });
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const [field, issues] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (issues?.[0]) nextErrors[field] = issues[0];
      }
      setErrors(nextErrors);
      toast.error("Please fix the highlighted field(s).");
      return;
    }
    setErrors({});

    setSaving(true);
    try {
      await request("/settings/announcement_bar", { method: "PUT", body: JSON.stringify({ value: parsed.data }) });
      setForm(parsed.data);
      toast.success("Announcement bar saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full max-w-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <Heading level={2} className="admin-page-title">Announcement Bar</Heading>
      <p className="mt-2 max-w-2xl text-body-sm text-neutral-500">
        A thin scrolling bar shown above the site header on every public page. Turning it off hides it instantly
        without losing your saved colors or messages.
      </p>

      <div className="mt-6 grid items-start gap-5 xl:grid-cols-2">
        <section className="grid min-w-0 gap-4 rounded-[10px] border border-neutral-200 bg-neutral-50 p-5">
          <h3 className="font-heading font-extrabold tracking-tight text-heading">Behaviour</h3>
          <div className="flex items-center justify-between gap-4 rounded-[8px] border border-neutral-200 px-4 py-3 bg-neutral-50">
            <div>
              <Label className="mb-0">Show announcement bar</Label>
              <p className="mt-0.5 text-label text-neutral-500">Goes live on the site as soon as you save.</p>
            </div>
            <Switch checked={form.enabled} onCheckedChange={(v) => setField("enabled", v)} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-[8px] border border-neutral-200 px-4 py-3 bg-neutral-50">
            <div>
              <Label className="mb-0">Visitors can dismiss it</Label>
              <p className="mt-0.5 text-label text-neutral-500">Shows a close button; the choice is remembered in the browser.</p>
            </div>
            <Switch checked={form.dismissible} onCheckedChange={(v) => setField("dismissible", v)} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <Label>Link (optional)</Label>
              <InfoHint text="Makes the whole bar clickable. Leave empty for plain text." />
            </div>
            <Input value={form.link} onChange={(e) => setField("link", e.target.value)} placeholder="/contact or https://..." aria-invalid={!!errors.link} />
            <FieldError>{errors.link}</FieldError>
          </div>
        </section>

        <section className="grid min-w-0 gap-4 rounded-[10px] border border-neutral-200 bg-neutral-50 p-5">
          <h3 className="font-heading font-extrabold tracking-tight text-heading">Appearance</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <Label>Background color</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(form.backgroundColor) ? form.backgroundColor : "#111111"}
                  onChange={(e) => setField("backgroundColor", e.target.value)}
                  className="size-10 shrink-0 cursor-pointer rounded-lg border border-neutral-200 p-0.5 bg-neutral-50"
                  aria-label="Pick a background color"
                />
                <Input className="min-w-0 flex-1" value={form.backgroundColor} onChange={(e) => setField("backgroundColor", e.target.value)} placeholder="#111111" aria-invalid={!!errors.backgroundColor} />
              </div>
              <FieldError>{errors.backgroundColor}</FieldError>
            </div>
            <div className="min-w-0">
              <Label>Text color</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(form.textColor) ? form.textColor : "#ffffff"}
                  onChange={(e) => setField("textColor", e.target.value)}
                  className="size-10 shrink-0 cursor-pointer rounded-lg border border-neutral-200 p-0.5 bg-neutral-50"
                  aria-label="Pick a text color"
                />
                <Input className="min-w-0 flex-1" value={form.textColor} onChange={(e) => setField("textColor", e.target.value)} placeholder="#ffffff" aria-invalid={!!errors.textColor} />
              </div>
              <FieldError>{errors.textColor}</FieldError>
            </div>
          </div>
          <div className="min-w-0">
            <p className="mb-1.5 text-label font-semibold uppercase tracking-wider text-neutral-500">Preview</p>
            <div className="overflow-hidden rounded-[8px] border border-neutral-200" style={{ backgroundColor: form.backgroundColor, color: form.textColor }}>
              <div className="flex h-9 items-center overflow-hidden text-ellipsis whitespace-nowrap px-4 text-body-sm font-medium">
                {previewMessages.length > 0 ? previewMessages.join("   •   ") : "Preview — add a message below"}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[10px] border border-neutral-200 bg-neutral-50 p-5 xl:col-span-2">
          <div className="flex items-center gap-1.5">
            <h3 className="font-heading font-extrabold tracking-tight text-heading">Messages</h3>
            <InfoHint text="One message per line. Each line scrolls in the bar as its own message, looping continuously. Add as many as you like." />
          </div>
          <Textarea
            className="mt-3"
            value={messagesText}
            onChange={(e) => setMessagesText(e.target.value)}
            placeholder={"Free shipping on orders over $50\nNew: book influencers directly from the marketplace"}
            rows={4}
            aria-invalid={!!errors.messages}
          />
          <FieldError>{errors.messages}</FieldError>
        </section>

        <div className="xl:col-span-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save announcement bar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
