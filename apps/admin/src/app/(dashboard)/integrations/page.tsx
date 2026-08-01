"use client";

import * as React from "react";
import { Badge, Button, FieldError, Heading, Input, Label, Skeleton, Textarea, toast } from "@agency/ui";
import { integrationsSchema, type IntegrationsInput } from "@agency/types";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import type { IntegrationsSettings, SiteSettings } from "@/lib/types";

const EMPTY_FORM: IntegrationsInput = {
  gtmId: "",
  ga4Id: "",
  metaPixelId: "",
  googleAdsId: "",
  googleAdsConversionLabel: "",
  clarityId: "",
  googleSiteVerification: "",
  headScript: "",
  bodyScript: "",
  footerScript: "",
};

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "neutral"}>{active ? "Active" : "Not configured"}</Badge>
  );
}

export default function IntegrationsPage() {
  const { data: settings, loading } = useAsyncData<SiteSettings>(
    () => request<{ settings: SiteSettings }>("/settings").then((r) => r.settings),
    [],
  );
  const [saved, setSaved] = React.useState<IntegrationsSettings>({});
  const [form, setForm] = React.useState<IntegrationsInput>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!settings) return;
    const integrations = settings.integrations ?? {};
    setSaved(integrations);
    setForm({
      gtmId: integrations.gtmId ?? "",
      ga4Id: integrations.ga4Id ?? "",
      metaPixelId: integrations.metaPixelId ?? "",
      googleAdsId: integrations.googleAdsId ?? "",
      googleAdsConversionLabel: integrations.googleAdsConversionLabel ?? "",
      clarityId: integrations.clarityId ?? "",
      googleSiteVerification: integrations.googleSiteVerification ?? "",
      headScript: integrations.headScript ?? "",
      bodyScript: integrations.bodyScript ?? "",
      footerScript: integrations.footerScript ?? "",
    });
  }, [settings]);

  function setField<K extends keyof IntegrationsInput>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    const parsed = integrationsSchema.safeParse(form);
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
      await request("/settings/integrations", { method: "PUT", body: JSON.stringify({ value: parsed.data }) });
      setSaved(parsed.data);
      toast.success("Integrations saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full max-w-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <Heading level={2}>Integrations</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">
        Connect tracking, analytics, and marketing pixels. Each integration only loads on the live site once its ID
        is set below — leave a field blank to keep it disabled.
      </p>

      <div className="mt-8 grid max-w-2xl gap-8">
        <section>
          <div className="flex items-center justify-between">
            <Heading level={3}>Google Tag Manager</Heading>
            <StatusBadge active={!!saved.gtmId} />
          </div>
          <p className="mt-1 text-body-sm text-neutral-500">
            Manage all your marketing/analytics tags from one GTM container.
          </p>
          <div className="mt-4">
            <Label>Container ID</Label>
            <Input
              value={form.gtmId}
              onChange={(e) => setField("gtmId", e.target.value)}
              placeholder="GTM-XXXXXXX"
              aria-invalid={!!errors.gtmId}
            />
            <FieldError>{errors.gtmId}</FieldError>
          </div>
        </section>

        <section className="border-t border-neutral-200 pt-6">
          <div className="flex items-center justify-between">
            <Heading level={3}>Google Analytics 4</Heading>
            <StatusBadge active={!!saved.ga4Id} />
          </div>
          <p className="mt-1 text-body-sm text-neutral-500">
            If GA4 is already configured inside your GTM container, avoid setting this too — it loads GA4
            independently and will double-count pageviews alongside a GTM-managed GA4 tag.
          </p>
          <div className="mt-4">
            <Label>Measurement ID</Label>
            <Input
              value={form.ga4Id}
              onChange={(e) => setField("ga4Id", e.target.value)}
              placeholder="G-XXXXXXXXXX"
              aria-invalid={!!errors.ga4Id}
            />
            <FieldError>{errors.ga4Id}</FieldError>
          </div>
        </section>

        <section className="border-t border-neutral-200 pt-6">
          <div className="flex items-center justify-between">
            <Heading level={3}>Meta Pixel</Heading>
            <StatusBadge active={!!saved.metaPixelId} />
          </div>
          <p className="mt-1 text-body-sm text-neutral-500">Tracks visits and conversions for Facebook/Instagram ads.</p>
          <div className="mt-4">
            <Label>Pixel ID</Label>
            <Input
              value={form.metaPixelId}
              onChange={(e) => setField("metaPixelId", e.target.value)}
              placeholder="123456789123456"
              aria-invalid={!!errors.metaPixelId}
            />
            <FieldError>{errors.metaPixelId}</FieldError>
          </div>
        </section>

        <section className="border-t border-neutral-200 pt-6">
          <div className="flex items-center justify-between">
            <Heading level={3}>Google Ads</Heading>
            <StatusBadge active={!!saved.googleAdsId} />
          </div>
          <p className="mt-1 text-body-sm text-neutral-500">
            Enables the Google Ads remarketing tag sitewide, and fires a conversion event on contact form
            submissions when both fields below are set.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Conversion ID</Label>
              <Input
                value={form.googleAdsId}
                onChange={(e) => setField("googleAdsId", e.target.value)}
                placeholder="AW-123456789"
                aria-invalid={!!errors.googleAdsId}
              />
              <FieldError>{errors.googleAdsId}</FieldError>
            </div>
            <div>
              <Label>Conversion Label</Label>
              <Input
                value={form.googleAdsConversionLabel}
                onChange={(e) => setField("googleAdsConversionLabel", e.target.value)}
                placeholder="AbCdEfGhIj12345"
                aria-invalid={!!errors.googleAdsConversionLabel}
              />
              <FieldError>{errors.googleAdsConversionLabel}</FieldError>
            </div>
          </div>
        </section>

        <section className="border-t border-neutral-200 pt-6">
          <div className="flex items-center justify-between">
            <Heading level={3}>Microsoft Clarity</Heading>
            <StatusBadge active={!!saved.clarityId} />
          </div>
          <p className="mt-1 text-body-sm text-neutral-500">Free session recordings and heatmaps.</p>
          <div className="mt-4">
            <Label>Project ID</Label>
            <Input
              value={form.clarityId}
              onChange={(e) => setField("clarityId", e.target.value)}
              placeholder="abcd1234ef"
              aria-invalid={!!errors.clarityId}
            />
            <FieldError>{errors.clarityId}</FieldError>
          </div>
        </section>

        <section className="border-t border-neutral-200 pt-6">
          <div className="flex items-center justify-between">
            <Heading level={3}>Google Search Console</Heading>
            <StatusBadge active={!!saved.googleSiteVerification} />
          </div>
          <p className="mt-1 text-body-sm text-neutral-500">
            Proves site ownership so Search Console can show indexing/search performance data. Paste the value
            Google gives you for the "HTML tag" verification method here — the full <code>&lt;meta&gt;</code> tag, or
            just the code, both work. Use this field, not Custom Scripts below — it's what actually renders the tag
            for Google to find.
          </p>
          <div className="mt-4">
            <Label>Site Verification Code</Label>
            <Input
              value={form.googleSiteVerification}
              onChange={(e) => setField("googleSiteVerification", e.target.value)}
              placeholder="google-site-verification=xxxxxxxxxxxxxxxx"
              aria-invalid={!!errors.googleSiteVerification}
            />
            <FieldError>{errors.googleSiteVerification}</FieldError>
          </div>
        </section>

        <section className="border-t border-neutral-200 pt-6">
          <Heading level={3}>Custom Scripts</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">
            Advanced: paste raw HTML/JavaScript snippets (verification tags, extra pixels, chat widgets). Only
            Super Admins can edit this — snippets run on every page of the live site, so only paste code from
            sources you trust.
          </p>
          <div className="mt-4 grid gap-4">
            <div>
              <Label>Head Script</Label>
              <p className="mb-1.5 text-body-sm text-neutral-500">Injected into the page &lt;head&gt;.</p>
              <Textarea
                value={form.headScript}
                onChange={(e) => setField("headScript", e.target.value)}
                placeholder="<meta name=&quot;...&quot; content=&quot;...&quot; />"
                rows={4}
                aria-invalid={!!errors.headScript}
              />
              <FieldError>{errors.headScript}</FieldError>
            </div>
            <div>
              <Label>Body Script</Label>
              <p className="mb-1.5 text-body-sm text-neutral-500">Injected at the top of &lt;body&gt;.</p>
              <Textarea
                value={form.bodyScript}
                onChange={(e) => setField("bodyScript", e.target.value)}
                placeholder="<script>...</script>"
                rows={4}
                aria-invalid={!!errors.bodyScript}
              />
              <FieldError>{errors.bodyScript}</FieldError>
            </div>
            <div>
              <Label>Footer Script</Label>
              <p className="mb-1.5 text-body-sm text-neutral-500">Injected just before &lt;/body&gt;.</p>
              <Textarea
                value={form.footerScript}
                onChange={(e) => setField("footerScript", e.target.value)}
                placeholder="<script>...</script>"
                rows={4}
                aria-invalid={!!errors.footerScript}
              />
              <FieldError>{errors.footerScript}</FieldError>
            </div>
          </div>
        </section>

        <Button onClick={handleSave} disabled={saving} className="mt-2 w-fit">
          {saving ? "Saving…" : "Save integrations"}
        </Button>
      </div>
    </div>
  );
}
