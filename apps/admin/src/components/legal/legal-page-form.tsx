"use client";

import * as React from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Heading,
  Input,
  Label,
  RichText,
  RichTextEditor,
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
import { uploadImageToCloudinary } from "@/lib/cloudinary-upload";
import { LogoField, type LogoValue } from "@/components/logo-field";

// Privacy Policy and Terms & Conditions are identical in shape, so both
// admin screens share this one implementation parametrized by pageKey --
// only the API path and default title differ (see legal.routes.ts on the
// API side for the matching factory).
export type LegalPageKey = "privacy-policy" | "terms";

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

interface LegalPageRecord {
  title: string;
  content: string;
  draftContent: string | null;
  lastUpdatedAt: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
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

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

// Formats a "YYYY-MM-DD" input value from its parts rather than via
// `new Date(dateString)` -- the latter parses as UTC midnight, which can
// display as the previous day in timezones behind UTC.
function formatDateInput(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function LegalContentForm({ pageKey, defaultTitle }: { pageKey: LegalPageKey; defaultTitle: string }) {
  const {
    data: record,
    loading,
    reload,
  } = useAsyncData<LegalPageRecord | null>(
    () => request<{ item: LegalPageRecord | null }>(`/pages/${pageKey}/admin`).then((r) => r.item),
    [pageKey],
  );

  const [title, setTitle] = React.useState(defaultTitle);
  const [content, setContent] = React.useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState("");
  const [saving, setSaving] = React.useState<"draft" | "publish" | null>(null);
  const [previewOpen, setPreviewOpen] = React.useState(false);

  React.useEffect(() => {
    if (!record) return;
    setTitle(record.title || defaultTitle);
    // Resume from the last saved draft if there is one, otherwise the
    // published content -- same reasoning either way, whichever was saved
    // more recently is what an editor expects to see when they come back.
    setContent(record.draftContent ?? record.content);
    setLastUpdatedAt(toDateInputValue(record.lastUpdatedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  async function handleImageUpload(file: File) {
    const media = await uploadImageToCloudinary(file, "agency-website/legal");
    return media.url;
  }

  async function saveDraft() {
    if (!title.trim() || !content.trim()) {
      toast.error("Page title and rich text content are required");
      return;
    }
    setSaving("draft");
    try {
      await request(`/pages/${pageKey}`, {
        method: "PATCH",
        body: JSON.stringify({ title, content, lastUpdatedAt: lastUpdatedAt || null }),
      });
      toast.success("Draft saved");
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(null);
    }
  }

  async function publish() {
    if (!title.trim() || !content.trim()) {
      toast.error("Page title and rich text content are required to publish");
      return;
    }
    setSaving("publish");
    try {
      await request(`/pages/${pageKey}/publish`, {
        method: "POST",
        body: JSON.stringify({ title, content, lastUpdatedAt: lastUpdatedAt || null }),
      });
      toast.success("Published");
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full max-w-3xl" />;

  const hasPendingDraft = !!record?.draftContent && record.draftContent !== record.content;
  const isPublished = record?.status === "PUBLISHED";

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Badge variant={isPublished ? "success" : "warning"}>{isPublished ? "Published" : "Draft"}</Badge>
          {hasPendingDraft && <span className="text-body-sm text-neutral-400">Unpublished changes</span>}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
            Preview
          </Button>
          <Button type="button" variant="secondary" onClick={saveDraft} disabled={saving !== null}>
            {saving === "draft" ? "Saving…" : "Save Draft"}
          </Button>
          <Button type="button" onClick={publish} disabled={saving !== null}>
            {saving === "publish" ? "Publishing…" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        <div>
          <Label>Page title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Last updated date (optional)</Label>
          <Input type="date" value={lastUpdatedAt} onChange={(e) => setLastUpdatedAt(e.target.value)} className="max-w-xs" />
          <p className="mt-1.5 text-body-sm text-neutral-400">Leave blank to auto-set to today when publishing.</p>
        </div>
        <div>
          <Label>Content</Label>
          <RichTextEditor
            value={content}
            onChange={setContent}
            onImageUpload={handleImageUpload}
            placeholder="Write the page content…"
          />
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{title || defaultTitle}</DialogTitle>
            <DialogDescription>
              {lastUpdatedAt ? `Last updated: ${formatDateInput(lastUpdatedAt)}` : "Preview of unsaved changes"}
            </DialogDescription>
          </DialogHeader>
          <RichText html={content} className="mt-2 max-h-[65vh] overflow-y-auto" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

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

export function LegalSeoForm({ pageKey }: { pageKey: LegalPageKey }) {
  const { data: record, loading } = useAsyncData<LegalPageRecord | null>(
    () => request<{ item: LegalPageRecord | null }>(`/pages/${pageKey}/admin`).then((r) => r.item),
    [pageKey],
  );
  const [contentFields, setContentFields] = React.useState<{ title: string; content: string; lastUpdatedAt: string | null }>({
    title: "",
    content: "",
    lastUpdatedAt: null,
  });
  const [seo, setSeoState] = React.useState<SeoContent>(EMPTY_SEO);
  const [keywordsInput, setKeywordsInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!record) return;
    // content/title aren't edited here, but PATCH /pages/{pageKey} requires
    // them -- fetched alongside seo and sent back unchanged, same reasoning
    // as about-seo-form.tsx, so this tab can save independently of the
    // Content tab without clobbering it.
    setContentFields({ title: record.title, content: record.draftContent ?? record.content, lastUpdatedAt: record.lastUpdatedAt });
    setSeoState(record.seo ?? EMPTY_SEO);
    setKeywordsInput((record.seo?.keywords ?? []).join(", "));
  }, [record]);

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
      await request(`/pages/${pageKey}`, {
        method: "PATCH",
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
        <p className="text-body-sm text-neutral-500">How this page appears in search results and when shared.</p>
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
            <Textarea
              value={seo.metaDescription}
              onChange={(e) => setSeo("metaDescription", e.target.value.slice(0, 160))}
              maxLength={160}
            />
          </Field>
          <Field label="Meta keywords (optional, comma-separated)">
            <Input value={keywordsInput} onChange={(e) => setKeywordsInput(e.target.value)} placeholder="privacy, data, cookies" />
          </Field>
          <Field label="Canonical URL (optional)">
            <Input
              value={seo.canonicalUrl ?? ""}
              onChange={(e) => setSeo("canonicalUrl", e.target.value || null)}
              placeholder={`https://example.com/${pageKey}`}
            />
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
            <Textarea
              value={seo.ogDescription ?? ""}
              onChange={(e) => setSeo("ogDescription", e.target.value || null)}
              placeholder={seo.metaDescription}
            />
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
            <Input
              value={seo.twitterTitle ?? ""}
              onChange={(e) => setSeo("twitterTitle", e.target.value || null)}
              placeholder={seo.ogTitle ?? seo.metaTitle}
            />
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
