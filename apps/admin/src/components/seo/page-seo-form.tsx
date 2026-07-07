"use client";

import * as React from "react";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  Button,
  Heading,
  toast,
} from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { LogoField, type LogoValue } from "@/components/logo-field";

interface MediaRef {
  id: string;
  url: string;
}

interface PageSeo {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  socialImageId: string | null;
  socialImage: MediaRef | null;
  canonicalUrl: string | null;
  robots: string;
}

const EMPTY: PageSeo = {
  metaTitle: "",
  metaDescription: "",
  keywords: [],
  socialImageId: null,
  socialImage: null,
  canonicalUrl: null,
  robots: "index, follow",
};

const ROBOTS_OPTIONS = ["index, follow", "noindex, follow", "index, nofollow", "noindex, nofollow"];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        {hint && <span className="text-body-sm text-neutral-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-6">
      <Heading level={3}>{title}</Heading>
      {description && <p className="mt-1 text-body-sm text-neutral-500">{description}</p>}
      <div className="mt-5 grid gap-5">{children}</div>
    </div>
  );
}

// One reusable form for every page-level SEO record (Services, Portfolio,
// Affiliate Tools, Contact, and any future page added to SEO_PAGE_KEYS) --
// rendered once per pageKey rather than duplicated per page.
export function PageSeoForm({ pageKey, label }: { pageKey: string; label: string }) {
  const { data: content, loading } = useAsyncData<PageSeo | null>(
    () => request<{ item: PageSeo | null }>(`/page-seo/${pageKey}`).then((r) => r.item),
    [pageKey],
  );
  const [form, setForm] = React.useState<PageSeo>(EMPTY);
  const [keywordsInput, setKeywordsInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setForm(content ?? EMPTY);
    setKeywordsInput((content?.keywords ?? []).join(", "));
  }, [content]);

  function set<K extends keyof PageSeo>(key: K, value: PageSeo[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleImageChange(next: LogoValue) {
    set("socialImageId", next.mediaId);
    set("socialImage", next.mediaId && next.url ? { id: next.mediaId, url: next.url } : null);
  }

  async function handleSave() {
    if (!form.metaTitle.trim() || !form.metaDescription.trim()) {
      toast.error("Meta title and meta description are required");
      return;
    }
    setSaving(true);
    try {
      const keywords = keywordsInput
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      await request(`/page-seo/${pageKey}`, {
        method: "PUT",
        body: JSON.stringify({
          metaTitle: form.metaTitle,
          metaDescription: form.metaDescription,
          keywords,
          socialImageId: form.socialImageId,
          canonicalUrl: form.canonicalUrl,
          robots: form.robots,
        }),
      });
      toast.success(`${label} SEO updated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full max-w-3xl" />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-neutral-500">How the {label} page appears in search results and when shared.</p>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="mt-6 grid max-w-3xl gap-6">
        <SectionCard title="Basic SEO">
          <Field label="Meta title" hint={`${form.metaTitle.length} / 60`}>
            <Input value={form.metaTitle} onChange={(e) => set("metaTitle", e.target.value.slice(0, 60))} maxLength={60} />
          </Field>
          <Field label="Meta description" hint={`${form.metaDescription.length} / 160`}>
            <Textarea value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value.slice(0, 160))} maxLength={160} />
          </Field>
          <Field label="Meta keywords (optional, comma-separated)">
            <Input value={keywordsInput} onChange={(e) => setKeywordsInput(e.target.value)} placeholder="keyword one, keyword two" />
          </Field>
        </SectionCard>

        <SectionCard
          title="Social sharing"
          description="Used for both Open Graph (Facebook, LinkedIn) and Twitter Card previews -- the meta title and description above are reused automatically."
        >
          <LogoField label="Social share image (optional)" value={{ mediaId: form.socialImageId, url: form.socialImage?.url ?? null }} folder="agency-website/seo" onChange={handleImageChange} />
        </SectionCard>

        <SectionCard title="Advanced SEO">
          <Field label="Canonical URL (optional)">
            <Input value={form.canonicalUrl ?? ""} onChange={(e) => set("canonicalUrl", e.target.value || null)} placeholder="https://example.com/services" />
          </Field>
          <Field label="Robots">
            <Select value={form.robots} onValueChange={(v) => set("robots", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROBOTS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </SectionCard>
      </div>
    </div>
  );
}
