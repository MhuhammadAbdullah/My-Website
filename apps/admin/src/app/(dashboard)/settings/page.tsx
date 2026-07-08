"use client";

import * as React from "react";
import {
  Button,
  Combobox,
  FieldError,
  Heading,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SocialIcon,
  Skeleton,
  Textarea,
  toast,
  type SocialPlatformId,
} from "@agency/ui";
import {
  socialLinksSchema,
  brandingSchema,
  SOCIAL_PLATFORM_IDS,
  CURRENCY_OPTIONS,
  DEFAULT_CURRENCY,
  BRANDING_DISPLAY_MODES,
  type BrandingDisplayMode,
} from "@agency/types";
import { isGoogleMapsUrl, extractGoogleMapsEmbedSrc } from "@agency/utils";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { LogoField, type LogoValue } from "@/components/logo-field";
import type { SiteSettings } from "@/lib/types";

const DISPLAY_MODE_LABELS: Record<BrandingDisplayMode, string> = {
  LOGO: "Logo",
  TEXT: "Text",
};

const SOCIAL_PLATFORM_LABELS: Record<SocialPlatformId, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  x: "X (Twitter)",
  youtube: "YouTube",
  behance: "Behance",
  dribbble: "Dribbble",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  github: "GitHub",
  threads: "Threads",
  medium: "Medium",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
};

export default function SettingsPage() {
  const { data: settings, loading } = useAsyncData<SiteSettings>(
    () => request<{ settings: SiteSettings }>("/settings").then((r) => r.settings),
    [],
  );
  const [form, setForm] = React.useState<Record<string, string>>({});
  const [socialErrors, setSocialErrors] = React.useState<Record<string, string>>({});
  const [mapErrors, setMapErrors] = React.useState<Record<string, string>>({});
  const [logo, setLogo] = React.useState<LogoValue>({ mediaId: null, url: null });
  const [displayMode, setDisplayMode] = React.useState<BrandingDisplayMode>("TEXT");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!settings) return;
    setForm({
      company_name: settings.company_name ?? "",
      contact_email: settings.contact_email ?? "",
      contact_phone: settings.contact_phone ?? "",
      whatsapp_number: settings.whatsapp_number ?? "",
      address: settings.address ?? "",
      calendly_url: settings.calendly_url ?? "",
      google_maps_embed: settings.google_maps_embed ?? "",
      google_maps_embed_code: settings.google_maps_embed_code ?? "",
      business_hours_weekday: settings.business_hours?.mon_fri ?? "",
      business_hours_weekend: settings.business_hours?.sat_sun ?? "",
      currency: settings.currency ?? DEFAULT_CURRENCY,
      brand_name: settings.branding?.brandName ?? settings.company_name ?? "",
      ...Object.fromEntries(SOCIAL_PLATFORM_IDS.map((id) => [`social_${id}`, settings.socials?.[id] ?? ""])),
    });
    setLogo({ mediaId: settings.branding?.logoMediaId ?? null, url: settings.branding?.logoUrl ?? null });
    setDisplayMode(settings.branding?.displayMode ?? "TEXT");
  }, [settings]);

  async function handleSave() {
    const socialValues = Object.fromEntries(
      SOCIAL_PLATFORM_IDS.map((id) => [id, form[`social_${id}`] ?? ""]),
    );
    const parsed = socialLinksSchema.safeParse(socialValues);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const [field, issues] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (issues?.[0]) nextErrors[field] = "Enter a valid URL (e.g. https://example.com/yourprofile).";
      }
      setSocialErrors(nextErrors);
      toast.error("Please fix the invalid social media URLs.");
      return;
    }
    setSocialErrors({});

    const nextMapErrors: Record<string, string> = {};
    if (form.google_maps_embed && !isGoogleMapsUrl(form.google_maps_embed)) {
      nextMapErrors.google_maps_embed = "Enter a valid Google Maps URL (e.g. https://www.google.com/maps/place/...).";
    }
    if (form.google_maps_embed_code && !extractGoogleMapsEmbedSrc(form.google_maps_embed_code)) {
      nextMapErrors.google_maps_embed_code = "Paste a valid Google Maps <iframe> embed code.";
    }
    if (Object.keys(nextMapErrors).length > 0) {
      setMapErrors(nextMapErrors);
      toast.error("Please fix the Google Maps field(s).");
      return;
    }
    setMapErrors({});

    const brandingValue = {
      brandName: form.brand_name ?? "",
      logoMediaId: logo.mediaId,
      logoUrl: logo.url,
      displayMode,
    };
    const brandingParsed = brandingSchema.safeParse(brandingValue);
    if (!brandingParsed.success) {
      toast.error("Brand name is required.");
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        request("/settings/company_name", { method: "PUT", body: JSON.stringify({ value: form.company_name }) }),
        request("/settings/contact_email", { method: "PUT", body: JSON.stringify({ value: form.contact_email }) }),
        request("/settings/contact_phone", { method: "PUT", body: JSON.stringify({ value: form.contact_phone }) }),
        request("/settings/whatsapp_number", { method: "PUT", body: JSON.stringify({ value: form.whatsapp_number }) }),
        request("/settings/address", { method: "PUT", body: JSON.stringify({ value: form.address }) }),
        request("/settings/calendly_url", { method: "PUT", body: JSON.stringify({ value: form.calendly_url }) }),
        request("/settings/google_maps_embed", { method: "PUT", body: JSON.stringify({ value: form.google_maps_embed }) }),
        request("/settings/google_maps_embed_code", {
          method: "PUT",
          body: JSON.stringify({ value: form.google_maps_embed_code }),
        }),
        request("/settings/currency", { method: "PUT", body: JSON.stringify({ value: form.currency }) }),
        request("/settings/business_hours", {
          method: "PUT",
          body: JSON.stringify({ value: { mon_fri: form.business_hours_weekday, sat_sun: form.business_hours_weekend } }),
        }),
        request("/settings/socials", { method: "PUT", body: JSON.stringify({ value: parsed.data }) }),
        request("/settings/branding", { method: "PUT", body: JSON.stringify({ value: brandingParsed.data }) }),
      ]);
      toast.success("Settings saved");
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

  const field = (key: string, label: string) => (
    <div key={key}>
      <Label>{label}</Label>
      <Input value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <div>
      <Heading level={2}>Settings</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">Global company info shown across the site.</p>

      <div className="mt-8 grid max-w-2xl gap-5">
        {field("company_name", "Company name")}
        <div className="grid gap-5 sm:grid-cols-2">
          {field("contact_email", "Contact email")}
          {field("contact_phone", "Contact phone")}
        </div>
        <div>
          <Label>Global currency</Label>
          <Combobox
            value={form.currency || DEFAULT_CURRENCY}
            onValueChange={(v) => setForm({ ...form, currency: v })}
            searchPlaceholder="Search currencies…"
            options={CURRENCY_OPTIONS.map((c) => ({
              value: c.code,
              label: c.label,
              secondary: `${c.code} · ${c.symbol}`,
              keywords: [c.code, c.symbol],
            }))}
          />
          <p className="mt-1.5 text-body-sm text-neutral-500">
            Used for any service that doesn't set its own currency override.
          </p>
        </div>
        {field("whatsapp_number", "WhatsApp number")}
        {field("address", "Address")}
        <div className="grid gap-5 sm:grid-cols-2">
          {field("business_hours_weekday", "Hours (Mon–Fri)")}
          {field("business_hours_weekend", "Hours (Sat–Sun)")}
        </div>
        {field("calendly_url", "Calendly URL")}

        <div>
          <Label>Google Maps URL</Label>
          <Input
            value={form.google_maps_embed ?? ""}
            onChange={(e) => setForm({ ...form, google_maps_embed: e.target.value })}
            placeholder="https://www.google.com/maps/place/..."
            aria-invalid={!!mapErrors.google_maps_embed}
          />
          <p className="mt-1.5 text-body-sm text-neutral-500">Paste a standard Google Maps link.</p>
          <FieldError>{mapErrors.google_maps_embed}</FieldError>
        </div>

        <div>
          <Label>Google Maps Embed Code</Label>
          <Textarea
            value={form.google_maps_embed_code ?? ""}
            onChange={(e) => setForm({ ...form, google_maps_embed_code: e.target.value })}
            placeholder='<iframe src="https://www.google.com/maps/embed?pb=..." width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"></iframe>'
            rows={4}
            aria-invalid={!!mapErrors.google_maps_embed_code}
          />
          <p className="mt-1.5 text-body-sm text-neutral-500">
            Paste the iframe embed code generated by Google Maps (recommended for maximum compatibility). Takes
            priority over the URL above when both are set.
          </p>
          <FieldError>{mapErrors.google_maps_embed_code}</FieldError>
        </div>

        <div className="mt-4 border-t border-neutral-200 pt-6">
          <Heading level={3}>Website Branding</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">
            Controls what's shown in the header and footer — the uploaded logo or the brand name.
          </p>

          <div className="mt-5 grid gap-5">
            <LogoField label="Website logo" value={logo} folder="branding" onChange={setLogo} />
            {field("brand_name", "Brand name")}
            <div>
              <Label>Branding display mode</Label>
              <Select value={displayMode} onValueChange={(v) => setDisplayMode(v as BrandingDisplayMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANDING_DISPLAY_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {DISPLAY_MODE_LABELS[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {displayMode === "LOGO" && !logo.url && (
                <p className="mt-1.5 text-body-sm text-neutral-500">
                  No logo uploaded — the brand name will be shown instead until you add one.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-neutral-200 pt-6">
          <Heading level={3}>Social Media Settings</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">
            Add a profile URL to show that platform's icon on the site. Leave a field blank to hide it.
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {SOCIAL_PLATFORM_IDS.map((id) => {
              const key = `social_${id}`;
              return (
                <div key={id}>
                  <Label className="flex items-center gap-2">
                    <SocialIcon platform={id} className="size-4 text-neutral-500" />
                    {SOCIAL_PLATFORM_LABELS[id]}
                  </Label>
                  <Input
                    value={form[key] ?? ""}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={`https://${id}.com/your-profile`}
                    aria-invalid={!!socialErrors[id]}
                  />
                  <FieldError>{socialErrors[id]}</FieldError>
                </div>
              );
            })}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="mt-2 w-fit">
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
