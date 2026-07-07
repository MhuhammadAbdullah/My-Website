"use client";

import * as React from "react";
import {
  Button,
  Heading,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  toast,
} from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { LogoField, type LogoValue } from "@/components/logo-field";

interface MediaRef {
  id: string;
  url: string;
}

interface SeoContent {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  canonicalUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageId: string | null;
  ogImage: MediaRef | null;
  twitterCard: string;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImageId: string | null;
  twitterImage: MediaRef | null;
  robots: string;
}

// story/mission/vision/philosophy aren't edited here, but PUT /pages/about
// requires them (they're the schema's required fields) -- fetched alongside
// seo and sent back unchanged so this tab can save independently of the
// Story tab without clobbering it.
interface AboutContent {
  story: string;
  mission: string;
  vision: string;
  philosophy: string;
  seo: SeoContent | null;
}

const EMPTY_SEO: SeoContent = {
  metaTitle: "",
  metaDescription: "",
  keywords: [],
  canonicalUrl: null,
  ogTitle: null,
  ogDescription: null,
  ogImageId: null,
  ogImage: null,
  twitterCard: "summary_large_image",
  twitterTitle: null,
  twitterDescription: null,
  twitterImageId: null,
  twitterImage: null,
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

export function AboutSeoForm() {
  const { data: content, loading } = useAsyncData<AboutContent | null>(
    () => request<{ item: AboutContent | null }>("/pages/about").then((r) => r.item),
    [],
  );
  const [contentFields, setContentFields] = React.useState<Omit<AboutContent, "seo">>({
    story: "",
    mission: "",
    vision: "",
    philosophy: "",
  });
  const [seo, setSeoState] = React.useState<SeoContent>(EMPTY_SEO);
  const [keywordsInput, setKeywordsInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!content) return;
    setContentFields({ story: content.story, mission: content.mission, vision: content.vision, philosophy: content.philosophy });
    setSeoState(content.seo ?? EMPTY_SEO);
    setKeywordsInput((content.seo?.keywords ?? []).join(", "));
  }, [content]);

  function setSeo<K extends keyof SeoContent>(key: K, value: SeoContent[K]) {
    setSeoState((s) => ({ ...s, [key]: value }));
  }

  function handleOgImageChange(next: LogoValue) {
    setSeo("ogImageId", next.mediaId);
    setSeo("ogImage", next.mediaId && next.url ? { id: next.mediaId, url: next.url } : null);
  }

  function handleTwitterImageChange(next: LogoValue) {
    setSeo("twitterImageId", next.mediaId);
    setSeo("twitterImage", next.mediaId && next.url ? { id: next.mediaId, url: next.url } : null);
  }

  async function handleSave() {
    if (!seo.metaTitle.trim() || !seo.metaDescription.trim()) {
      toast.error("Meta title and meta description are required to save SEO settings");
      return;
    }
    setSaving(true);
    try {
      const keywords = keywordsInput
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      await request("/pages/about", {
        method: "PUT",
        body: JSON.stringify({
          ...contentFields,
          seo: { ...seo, keywords, ogImage: undefined, twitterImage: undefined },
        }),
      });
      toast.success("SEO settings updated");
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
        <p className="text-body-sm text-neutral-500">How the About page appears in search results and when shared.</p>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="mt-6 grid max-w-3xl gap-6">
        <SectionCard title="Search engine listing">
          <Field label="Meta title" hint={`${seo.metaTitle.length} / 60`}>
            <Input value={seo.metaTitle} onChange={(e) => setSeo("metaTitle", e.target.value.slice(0, 60))} maxLength={60} />
          </Field>
          <Field label="Meta description" hint={`${seo.metaDescription.length} / 160`}>
            <Textarea value={seo.metaDescription} onChange={(e) => setSeo("metaDescription", e.target.value.slice(0, 160))} maxLength={160} />
          </Field>
          <Field label="Meta keywords (optional, comma-separated)">
            <Input value={keywordsInput} onChange={(e) => setKeywordsInput(e.target.value)} placeholder="team, agency, design engineering" />
          </Field>
          <Field label="Canonical URL (optional)">
            <Input value={seo.canonicalUrl ?? ""} onChange={(e) => setSeo("canonicalUrl", e.target.value || null)} placeholder="https://example.com/about" />
          </Field>
          <Field label="Robots">
            <Select value={seo.robots} onValueChange={(v) => setSeo("robots", v)}>
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
          <p className="text-body-sm text-neutral-400">Fill in at least the meta title and description to save SEO settings.</p>
        </SectionCard>

        <SectionCard title="Open Graph" description="Controls how this page looks when shared on Facebook, LinkedIn, etc.">
          <Field label="Open Graph title (optional)">
            <Input value={seo.ogTitle ?? ""} onChange={(e) => setSeo("ogTitle", e.target.value || null)} placeholder={seo.metaTitle} />
          </Field>
          <Field label="Open Graph description (optional)">
            <Textarea value={seo.ogDescription ?? ""} onChange={(e) => setSeo("ogDescription", e.target.value || null)} placeholder={seo.metaDescription} />
          </Field>
          <LogoField
            label="Open Graph image (optional)"
            value={{ mediaId: seo.ogImageId, url: seo.ogImage?.url ?? null }}
            folder="agency-website/seo"
            onChange={handleOgImageChange}
          />
        </SectionCard>

        <SectionCard title="Twitter Card">
          <Field label="Twitter card title (optional)">
            <Input value={seo.twitterTitle ?? ""} onChange={(e) => setSeo("twitterTitle", e.target.value || null)} placeholder={seo.ogTitle ?? seo.metaTitle} />
          </Field>
          <Field label="Twitter card description (optional)">
            <Textarea
              value={seo.twitterDescription ?? ""}
              onChange={(e) => setSeo("twitterDescription", e.target.value || null)}
              placeholder={seo.ogDescription ?? seo.metaDescription}
            />
          </Field>
          <LogoField
            label="Twitter card image (optional)"
            value={{ mediaId: seo.twitterImageId, url: seo.twitterImage?.url ?? null }}
            folder="agency-website/seo"
            onChange={handleTwitterImageChange}
          />
        </SectionCard>
      </div>
    </div>
  );
}
