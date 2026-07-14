"use client";

import * as React from "react";
import { Button, Input, Label, Skeleton, Textarea, toast } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";

// Shown next to a heading field's label -- the site renders `**word**` in
// italic serif and everything else in the regular sans font (see the Heading
// component in packages/ui). Admins can mark which words get that treatment;
// they can't change fonts directly.
const HEADING_HINT = "wrap words in **bold** to italicize them";

interface FieldConfig {
  key: string;
  label: string;
  type?: "input" | "textarea";
  placeholder?: string;
  isHeading?: boolean;
}

// Generic single-record hero-content form (heading + paragraph, optionally a
// few extra fields) shared by the Services/Portfolio/Affiliate Tools/Contact
// "Page Content" tabs -- same GET-then-PUT singleton shape as /pages/home and
// /pages/about, just without SEO (that stays on the dedicated SEO page).
export function PageHeroContentForm({
  endpoint,
  fields,
  emptyValues,
  successMessage = "Page content updated",
}: {
  endpoint: string;
  fields: FieldConfig[];
  emptyValues: Record<string, string>;
  successMessage?: string;
}) {
  const { data: content, loading } = useAsyncData<Record<string, string> | null>(
    () => request<{ item: Record<string, string> | null }>(endpoint).then((r) => r.item),
    [],
  );
  const [form, setForm] = React.useState<Record<string, string>>(emptyValues);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (content) setForm({ ...emptyValues, ...content });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  async function handleSave() {
    setSaving(true);
    try {
      await request(endpoint, { method: "PUT", body: JSON.stringify(form) });
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-64 w-full max-w-2xl" />;

  return (
    <div className="grid max-w-2xl gap-5">
      {fields.map((field) => (
        <div key={field.key}>
          <div className="flex items-baseline justify-between">
            <Label>{field.label}</Label>
            {field.isHeading && <span className="text-body-sm text-neutral-400">{HEADING_HINT}</span>}
          </div>
          {field.type === "textarea" ? (
            <Textarea
              value={form[field.key] ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
            />
          ) : (
            <Input
              value={form[field.key] ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
            />
          )}
        </div>
      ))}
      <Button onClick={handleSave} disabled={saving} className="w-fit">
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
