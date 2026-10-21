"use client";

import * as React from "react";
import { FieldHint } from "@/components/field-hint";
import {
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
import { HomeSectionsEditor } from "@/components/home/home-sections-editor";
import { HomeHeader, PageTabs } from "@/components/home/home-header";

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
  storyHeading: string | null;
  storyButtonLabel: string | null;
  storyMissionLabel: string | null;
  servicesHeading: string | null;
  servicesDescription: string | null;
  servicesButtonLabel: string | null;
  portfolioHeading: string | null;
  portfolioDescription: string | null;
  portfolioButtonLabel: string | null;
  processHeading: string | null;
  technologiesHeading: string | null;
  whyHeading: string | null;
  testimonialsHeading: string | null;
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
  storyHeading: null,
  storyButtonLabel: null,
  storyMissionLabel: null,
  servicesHeading: null,
  servicesDescription: null,
  servicesButtonLabel: null,
  portfolioHeading: null,
  portfolioDescription: null,
  portfolioButtonLabel: null,
  processHeading: null,
  technologiesHeading: null,
  whyHeading: null,
  testimonialsHeading: null,
  seo: null,
};

const ROBOTS_OPTIONS = ["index, follow", "noindex, follow", "index, nofollow", "noindex, nofollow"];

// Shown next to every heading field's label -- the site renders `**word**`
// in italic serif and everything else in the regular sans font (see the
// Heading component in packages/ui). Admins can mark which words get that
// treatment; they can't change fonts directly.
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        {hint && <FieldHint hint={hint} />}
      </div>
      {children}
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-6 bg-neutral-50">
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
  const [tab, setTab] = React.useState<"sections" | "seo">("sections");

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

  const tabs = (
    <PageTabs
      tabs={[
        { value: "sections", label: "Page sections" },
        { value: "seo", label: "SEO" },
      ]}
      value={tab}
      onChange={setTab}
    />
  );

  if (tab === "sections") return <HomeSectionsEditor tabs={tabs} />;

  return (
    <div>
      <HomeHeader
        title="Home page"
        description="Build your homepage from sections and set how it appears in search results."
        tabs={tabs}
        actions={
          <button type="button" onClick={handleSave} disabled={saving} className="inline-flex h-10 items-center rounded-full bg-accent-500 px-5 text-[13px] font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        }
      />

      <div className="mt-8">
        <div>
          <div className="grid max-w-none items-start gap-6 xl:grid-cols-2">
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
        </div>
      </div>
    </div>
  );
}
