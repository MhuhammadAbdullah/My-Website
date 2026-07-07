"use client";

import * as React from "react";
import {
  Button,
  Checkbox,
  Heading,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { LogoField, type LogoValue } from "@/components/logo-field";
import { HomeStatsManager } from "@/components/home/home-stats-manager";
import { HomeProcessManager } from "@/components/home/home-process-manager";
import { HomeWhyReasonsManager } from "@/components/home/home-why-reasons-manager";

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

interface HomeContent {
  heroBadgeText: string | null;
  heroHeadline: string;
  heroSubheadline: string;
  heroDescription: string | null;
  heroBackgroundImageId: string | null;
  heroBackgroundImage: MediaRef | null;
  heroCtaLabel: string;
  heroCtaHref: string;
  heroCtaNewTab: boolean;
  heroSecondaryCtaEnabled: boolean;
  heroSecondaryCtaLabel: string | null;
  heroSecondaryCtaHref: string | null;
  heroSecondaryCtaNewTab: boolean;
  contactCtaHeading: string | null;
  contactCtaDescription: string | null;
  contactCtaButtonText: string | null;
  contactCtaButtonHref: string | null;
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

const EMPTY_FORM: HomeContent = {
  heroBadgeText: null,
  heroHeadline: "",
  heroSubheadline: "",
  heroDescription: null,
  heroBackgroundImageId: null,
  heroBackgroundImage: null,
  heroCtaLabel: "",
  heroCtaHref: "",
  heroCtaNewTab: false,
  heroSecondaryCtaEnabled: true,
  heroSecondaryCtaLabel: null,
  heroSecondaryCtaHref: null,
  heroSecondaryCtaNewTab: false,
  contactCtaHeading: null,
  contactCtaDescription: null,
  contactCtaButtonText: null,
  contactCtaButtonHref: null,
  seo: null,
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

export default function HomeContentPage() {
  const { data: content, loading } = useAsyncData<HomeContent | null>(
    () => request<{ item: HomeContent | null }>("/pages/home").then((r) => r.item),
    [],
  );
  const [form, setForm] = React.useState<HomeContent>(EMPTY_FORM);
  const [keywordsInput, setKeywordsInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [tab, setTab] = React.useState("content");

  React.useEffect(() => {
    if (!content) return;
    setForm({ ...EMPTY_FORM, ...content, seo: content.seo ?? null });
    setKeywordsInput((content.seo?.keywords ?? []).join(", "));
  }, [content]);

  function set<K extends keyof HomeContent>(key: K, value: HomeContent[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setSeo<K extends keyof SeoContent>(key: K, value: SeoContent[K]) {
    setForm((f) => ({ ...f, seo: { ...(f.seo ?? EMPTY_SEO), [key]: value } }));
  }

  function handleHeroBackgroundChange(next: LogoValue) {
    set("heroBackgroundImageId", next.mediaId);
    set("heroBackgroundImage", next.mediaId && next.url ? { id: next.mediaId, url: next.url } : null);
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
    if (!form.heroHeadline.trim() || !form.heroSubheadline.trim()) {
      toast.error("Hero headline and subheadline are required");
      return;
    }
    if (!form.heroCtaLabel.trim() || !form.heroCtaHref.trim()) {
      toast.error("Primary CTA text and link are required");
      return;
    }

    setSaving(true);
    try {
      const seoKeywords = keywordsInput
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      const {
        heroBackgroundImage: _heroBg,
        seo: seoState,
        ...contentFields
      } = form;

      const body: Record<string, unknown> = { ...contentFields };
      if (seoState && seoState.metaTitle.trim() && seoState.metaDescription.trim()) {
        body.seo = { ...seoState, keywords: seoKeywords, ogImage: undefined, twitterImage: undefined };
      }

      await request("/pages/home", { method: "PUT", body: JSON.stringify(body) });
      toast.success("Home page updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full max-w-2xl" />;

  const seo = form.seo ?? EMPTY_SEO;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Home Page</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">Everything shown on the public home page — fully editable, no code changes needed.</p>
        </div>
        {!["statistics", "process", "why"].includes(tab) && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="process">How We Work</TabsTrigger>
          <TabsTrigger value="why">Why Work With Us</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <div className="grid max-w-3xl gap-6">
            <SectionCard title="Hero section" description="The first thing visitors see.">
              <Field label="Badge text (optional)">
                <Input value={form.heroBadgeText ?? ""} onChange={(e) => set("heroBadgeText", e.target.value || null)} placeholder="Now booking Q3 projects" />
              </Field>
              <Field label="Heading">
                <Input value={form.heroHeadline} onChange={(e) => set("heroHeadline", e.target.value)} />
              </Field>
              <Field label="Subheading">
                <Textarea value={form.heroSubheadline} onChange={(e) => set("heroSubheadline", e.target.value)} />
              </Field>
              <Field label="Description (optional)">
                <Textarea value={form.heroDescription ?? ""} onChange={(e) => set("heroDescription", e.target.value || null)} />
              </Field>
              <LogoField
                label="Background image (optional)"
                value={{ mediaId: form.heroBackgroundImageId, url: form.heroBackgroundImage?.url ?? null }}
                folder="agency-website/home"
                onChange={handleHeroBackgroundChange}
              />
            </SectionCard>

            <SectionCard title="Primary CTA">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Button text">
                  <Input value={form.heroCtaLabel} onChange={(e) => set("heroCtaLabel", e.target.value)} placeholder="Get Started" />
                </Field>
                <Field label="Button URL">
                  <Input value={form.heroCtaHref} onChange={(e) => set("heroCtaHref", e.target.value)} placeholder="/contact" />
                </Field>
              </div>
              <div className="flex items-center gap-2.5">
                <Checkbox checked={form.heroCtaNewTab} onCheckedChange={(c) => set("heroCtaNewTab", c === true)} />
                <Label className="mb-0">Open in new tab</Label>
              </div>
            </SectionCard>

            <SectionCard title="Secondary CTA" description={'The "View Our Work" button next to the primary CTA.'}>
              <div className="flex items-center gap-2.5">
                <Checkbox checked={form.heroSecondaryCtaEnabled} onCheckedChange={(c) => set("heroSecondaryCtaEnabled", c === true)} />
                <Label className="mb-0">Enable this button</Label>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Button text">
                  <Input
                    value={form.heroSecondaryCtaLabel ?? ""}
                    onChange={(e) => set("heroSecondaryCtaLabel", e.target.value || null)}
                    placeholder="View Our Work"
                    disabled={!form.heroSecondaryCtaEnabled}
                  />
                </Field>
                <Field label="Button URL">
                  <Input
                    value={form.heroSecondaryCtaHref ?? ""}
                    onChange={(e) => set("heroSecondaryCtaHref", e.target.value || null)}
                    placeholder="/portfolio"
                    disabled={!form.heroSecondaryCtaEnabled}
                  />
                </Field>
              </div>
              <div className="flex items-center gap-2.5">
                <Checkbox
                  checked={form.heroSecondaryCtaNewTab}
                  onCheckedChange={(c) => set("heroSecondaryCtaNewTab", c === true)}
                  disabled={!form.heroSecondaryCtaEnabled}
                />
                <Label className="mb-0">Open in new tab</Label>
              </div>
            </SectionCard>

            <SectionCard title="Contact CTA" description="The call-to-action block near the bottom of the home page.">
              <Field label="Heading (optional — falls back to default copy)">
                <Input value={form.contactCtaHeading ?? ""} onChange={(e) => set("contactCtaHeading", e.target.value || null)} placeholder="Ready to build something inevitable?" />
              </Field>
              <Field label="Description (optional)">
                <Textarea value={form.contactCtaDescription ?? ""} onChange={(e) => set("contactCtaDescription", e.target.value || null)} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Button text (optional)">
                  <Input value={form.contactCtaButtonText ?? ""} onChange={(e) => set("contactCtaButtonText", e.target.value || null)} placeholder="Start a project" />
                </Field>
                <Field label="Button URL (optional)">
                  <Input value={form.contactCtaButtonHref ?? ""} onChange={(e) => set("contactCtaButtonHref", e.target.value || null)} placeholder="/contact" />
                </Field>
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        <TabsContent value="statistics">
          <HomeStatsManager />
        </TabsContent>

        <TabsContent value="process">
          <HomeProcessManager />
        </TabsContent>

        <TabsContent value="why">
          <HomeWhyReasonsManager />
        </TabsContent>

        <TabsContent value="seo">
          <div className="grid max-w-3xl gap-6">
            <SectionCard title="Search engine listing">
              <Field label="Meta title" hint={`${seo.metaTitle.length} / 60`}>
                <Input value={seo.metaTitle} onChange={(e) => setSeo("metaTitle", e.target.value.slice(0, 60))} maxLength={60} />
              </Field>
              <Field label="Meta description" hint={`${seo.metaDescription.length} / 160`}>
                <Textarea value={seo.metaDescription} onChange={(e) => setSeo("metaDescription", e.target.value.slice(0, 160))} maxLength={160} />
              </Field>
              <Field label="Meta keywords (optional, comma-separated)">
                <Input value={keywordsInput} onChange={(e) => setKeywordsInput(e.target.value)} placeholder="web design, next.js, agency" />
              </Field>
              <Field label="Canonical URL (optional)">
                <Input value={seo.canonicalUrl ?? ""} onChange={(e) => setSeo("canonicalUrl", e.target.value || null)} placeholder="https://example.com" />
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
