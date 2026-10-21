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
  Switch,
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
  BUSINESS_DAYS,
  DEFAULT_TIMEZONE,
  buildWhatsAppLink,
  businessHoursSchema,
  timezoneSchema,
  whatsappNumberSchema,
  type BrandingDisplayMode,
  type BusinessDay,
  type BusinessHoursInput,
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

const DAY_LABELS: Record<BusinessDay, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const DEFAULT_SCHEDULE: BusinessHoursInput = Object.fromEntries(
  BUSINESS_DAYS.map((d) => [d, { closed: d === "sat" || d === "sun", open: "09:00", close: "18:00" }]),
) as BusinessHoursInput;

const dayText = (d: BusinessHoursInput[BusinessDay]) => (d.closed ? "Closed" : `${d.open} – ${d.close}`);

// The legacy two-line `business_hours` record is still what the public contact
// page renders; keep it in sync with the structured schedule so there is only
// one place to edit.
function legacyHours(schedule: BusinessHoursInput): Record<string, string> {
  const weekdays = BUSINESS_DAYS.slice(0, 5).map((d) => dayText(schedule[d]));
  const mon_fri = weekdays.every((t) => t === weekdays[0]) ? weekdays[0]! : weekdays.map((t, i) => `${DAY_LABELS[BUSINESS_DAYS[i]!].slice(0, 3)}: ${t}`).join(" · ");
  const sat_sun = dayText(schedule.sat) === dayText(schedule.sun) ? dayText(schedule.sat) : `Sat: ${dayText(schedule.sat)} · Sun: ${dayText(schedule.sun)}`;
  return { mon_fri, sat_sun };
}

export default function SettingsPage() {
  const { data: settings, loading } = useAsyncData<SiteSettings>(
    () => request<{ settings: SiteSettings }>("/settings").then((r) => r.settings),
    [],
  );
  const [form, setForm] = React.useState<Record<string, string>>({});
  const [socialErrors, setSocialErrors] = React.useState<Record<string, string>>({});
  const [mapErrors, setMapErrors] = React.useState<Record<string, string>>({});
  const [logo, setLogo] = React.useState<LogoValue>({ mediaId: null, url: null });
  const [footerLogo, setFooterLogo] = React.useState<LogoValue>({ mediaId: null, url: null });
  const [displayMode, setDisplayMode] = React.useState<BrandingDisplayMode>("TEXT");
  const [logoDark, setLogoDark] = React.useState<LogoValue>({ mediaId: null, url: null });
  const [favicon, setFavicon] = React.useState<LogoValue>({ mediaId: null, url: null });
  const [schedule, setSchedule] = React.useState<BusinessHoursInput>(DEFAULT_SCHEDULE);
  const [contactErrors, setContactErrors] = React.useState<Record<string, string>>({});
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
      timezone: settings.timezone ?? DEFAULT_TIMEZONE,
      whatsapp_message: settings.whatsapp_message ?? "",
      footer_tagline: settings.branding?.footerTagline ?? "",
      copyright_text: settings.branding?.copyrightText ?? "",
      email_sender_name: settings.branding?.emailSenderName ?? "",
      currency: settings.currency ?? DEFAULT_CURRENCY,
      brand_name: settings.branding?.brandName ?? settings.company_name ?? "",
      default_cta_headline: settings.default_cta?.headline ?? "",
      default_cta_subheadline: settings.default_cta?.subheadline ?? "",
      default_cta_label: settings.default_cta?.ctaLabel ?? "",
      default_cta_href: settings.default_cta?.ctaHref ?? "",
      faq_section_heading: settings.faq_section_heading ?? "",
      ...Object.fromEntries(SOCIAL_PLATFORM_IDS.map((id) => [`social_${id}`, settings.socials?.[id] ?? ""])),
    });
    setLogo({ mediaId: settings.branding?.logoMediaId ?? null, url: settings.branding?.logoUrl ?? null });
    setFooterLogo({ mediaId: settings.branding?.footerLogoMediaId ?? null, url: settings.branding?.footerLogoUrl ?? null });
    setDisplayMode(settings.branding?.displayMode ?? "TEXT");
    setLogoDark({ mediaId: settings.branding?.logoDarkMediaId ?? null, url: settings.branding?.logoDarkUrl ?? null });
    setFavicon({ mediaId: settings.branding?.faviconMediaId ?? null, url: settings.branding?.faviconUrl ?? null });
    const parsedSchedule = businessHoursSchema.safeParse(settings.business_schedule);
    setSchedule(parsedSchedule.success ? parsedSchedule.data : DEFAULT_SCHEDULE);
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
      footerLogoMediaId: footerLogo.mediaId,
      footerLogoUrl: footerLogo.url,
      logoDarkMediaId: logoDark.mediaId,
      logoDarkUrl: logoDark.url,
      faviconMediaId: favicon.mediaId,
      faviconUrl: favicon.url,
      footerTagline: form.footer_tagline ?? "",
      copyrightText: form.copyright_text ?? "",
      emailSenderName: form.email_sender_name ?? "",
    };
    const brandingParsed = brandingSchema.safeParse(brandingValue);
    if (!brandingParsed.success) {
      toast.error("Brand name is required.");
      return;
    }

    const contactIssues: Record<string, string> = {};
    const waParsed = whatsappNumberSchema.safeParse(form.whatsapp_number ?? "");
    if (!waParsed.success) contactIssues.whatsapp_number = waParsed.error.issues[0]!.message;
    const tzParsed = timezoneSchema.safeParse(form.timezone || DEFAULT_TIMEZONE);
    if (!tzParsed.success) contactIssues.timezone = tzParsed.error.issues[0]!.message;
    const scheduleParsed = businessHoursSchema.safeParse(schedule);
    if (!scheduleParsed.success) contactIssues.schedule = "Use HH:MM times for every open day.";
    if (Object.keys(contactIssues).length > 0) {
      setContactErrors(contactIssues);
      toast.error("Please fix the highlighted contact fields.");
      return;
    }
    setContactErrors({});

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
        request("/settings/business_schedule", { method: "PUT", body: JSON.stringify({ value: schedule }) }),
        request("/settings/business_hours", { method: "PUT", body: JSON.stringify({ value: legacyHours(schedule) }) }),
        request("/settings/timezone", { method: "PUT", body: JSON.stringify({ value: form.timezone || DEFAULT_TIMEZONE }) }),
        request("/settings/whatsapp_message", { method: "PUT", body: JSON.stringify({ value: form.whatsapp_message ?? "" }) }),
        request("/settings/socials", { method: "PUT", body: JSON.stringify({ value: parsed.data }) }),
        request("/settings/branding", { method: "PUT", body: JSON.stringify({ value: brandingParsed.data }) }),
        request("/settings/default_cta", {
          method: "PUT",
          body: JSON.stringify({
            value: {
              headline: form.default_cta_headline,
              subheadline: form.default_cta_subheadline,
              ctaLabel: form.default_cta_label,
              ctaHref: form.default_cta_href,
            },
          }),
        }),
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
      <Heading level={2} className="admin-page-title">Settings</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">Global company info shown across the site.</p>

      <div className="mt-8 grid max-w-none items-start gap-5 xl:grid-cols-2">
        <section className="rounded-[10px] border border-neutral-200 bg-neutral-50 p-5">
          <h3 className="font-heading font-extrabold tracking-tight text-heading">Company &amp; contact</h3>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
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
            <div>
              {field("whatsapp_number", "WhatsApp number")}
              <FieldError>{contactErrors.whatsapp_number}</FieldError>
              <p className="mt-1.5 text-body-sm text-neutral-500">International format, e.g. +923001234567.</p>
            </div>
            <div>
              <Label>WhatsApp prefilled message</Label>
              <Input
                value={form.whatsapp_message ?? ""}
                maxLength={300}
                onChange={(e) => setForm({ ...form, whatsapp_message: e.target.value })}
                placeholder="Hi! I'd like to talk about a project."
              />
              {buildWhatsAppLink(form.whatsapp_number, form.whatsapp_message) ? (
                <p className="mt-1.5 break-all text-body-sm text-neutral-500">
                  Link: <a className="underline" href={buildWhatsAppLink(form.whatsapp_number, form.whatsapp_message)} target="_blank" rel="noopener noreferrer">{buildWhatsAppLink(form.whatsapp_number, form.whatsapp_message)}</a>
                </p>
              ) : (
                <p className="mt-1.5 text-body-sm text-neutral-500">Enter a WhatsApp number to generate the wa.me link.</p>
              )}
            </div>
            {field("address", "Address")}
            {field("calendly_url", "Calendly URL")}
          </div>
        </section>
        <section className="rounded-[10px] border border-neutral-200 bg-neutral-50 p-5">
          <h3 className="font-heading font-extrabold tracking-tight text-heading">Business hours</h3>
          <div className="mt-4">
        <div>
          
          <div className="grid gap-2">
            {BUSINESS_DAYS.map((d) => (
              <div key={d} className="grid grid-cols-[6rem_1fr_1fr_auto] items-center gap-2">
                <span className="text-body-sm text-heading">{DAY_LABELS[d]}</span>
                <Input
                  type="time"
                  aria-label={`${DAY_LABELS[d]} opens`}
                  disabled={schedule[d].closed}
                  value={schedule[d].open}
                  onChange={(e) => setSchedule({ ...schedule, [d]: { ...schedule[d], open: e.target.value } })}
                />
                <Input
                  type="time"
                  aria-label={`${DAY_LABELS[d]} closes`}
                  disabled={schedule[d].closed}
                  value={schedule[d].close}
                  onChange={(e) => setSchedule({ ...schedule, [d]: { ...schedule[d], close: e.target.value } })}
                />
                <div className="flex items-center gap-2">
                  <Switch
                    id={`closed-${d}`}
                    checked={schedule[d].closed}
                    onCheckedChange={(v) => setSchedule({ ...schedule, [d]: { ...schedule[d], closed: v } })}
                  />
                  <Label htmlFor={`closed-${d}`} className="mb-0 text-body-sm">
                    Closed
                  </Label>
                </div>
              </div>
            ))}
          </div>
          <FieldError>{contactErrors.schedule}</FieldError>
          <div className="mt-4">
            <Label>Timezone</Label>
            <Input value={form.timezone ?? ""} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder={DEFAULT_TIMEZONE} aria-invalid={!!contactErrors.timezone} />
            <FieldError>{contactErrors.timezone}</FieldError>
          </div>
        </div>
          </div>
        </section>
        <section className="rounded-[10px] border border-neutral-200 bg-neutral-50 p-5 self-stretch">
          <h3 className="font-heading font-extrabold tracking-tight text-heading">Google Maps</h3>
          <div className="mt-4 grid gap-5">
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
          </div>
        </section>

        <div className="rounded-[10px] border border-neutral-200 bg-neutral-50 p-5 self-stretch">
          <Heading level={3}>Default Call-to-Action</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">
            Fallback CTA banner text shown on pages that don't set their own (About, Services, and project/service
            detail pages). The Home page has its own CTA, set on the Home Page → Content tab.
          </p>

          <div className="mt-5 grid gap-5">
            <div>
              <div className="flex items-baseline justify-between">
                <Label>Headline</Label>
                <span className="text-body-sm text-neutral-400">wrap words in **bold** to italicize them</span>
              </div>
              <Input
                value={form.default_cta_headline ?? ""}
                onChange={(e) => setForm({ ...form, default_cta_headline: e.target.value })}
                placeholder="Ready to build something **inevitable**?"
              />
            </div>
            <div>
              <Label>Subheadline</Label>
              <Textarea
                value={form.default_cta_subheadline ?? ""}
                onChange={(e) => setForm({ ...form, default_cta_subheadline: e.target.value })}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label>Button text</Label>
                <Input
                  value={form.default_cta_label ?? ""}
                  onChange={(e) => setForm({ ...form, default_cta_label: e.target.value })}
                  placeholder="Start a project"
                />
              </div>
              <div>
                <Label>Button URL</Label>
                <Input
                  value={form.default_cta_href ?? ""}
                  onChange={(e) => setForm({ ...form, default_cta_href: e.target.value })}
                  placeholder="/contact"
                />
              </div>
            </div>
          </div>
        </div>


        <div className="rounded-[10px] border border-neutral-200 bg-neutral-50 p-5 xl:col-span-2">
          <Heading level={3}>Website Branding</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">
            Controls what's shown in the header and footer — the uploaded logo or the brand name.
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <LogoField variant="tile" label="Header logo" hint="Shown in the site header." value={logo} folder="branding" onChange={setLogo} />
            <LogoField variant="tile" label="Footer logo" hint="Leave empty to reuse the header logo." value={footerLogo} folder="branding" onChange={setFooterLogo} />
            <LogoField variant="tile" label="Dark-background logo" hint="Used by the dark theme, so it should be light-coloured." value={logoDark} folder="branding" onChange={setLogoDark} />
            <LogoField variant="tile" label="Favicon" hint="The small icon in the browser tab." value={favicon} folder="branding" onChange={setFavicon} />
          </div>
          {displayMode === "LOGO" && !logoDark.url && (
            <p className="mt-3 rounded-[8px] bg-warning-50 px-3 py-2 text-body-sm text-warning-700">
              No dark-background logo yet — the header falls back to the standard logo, which may be hard to see on dark.
            </p>
          )}

          <div className="mt-6 grid gap-5 border-t border-neutral-200 pt-6 md:grid-cols-2">
            {field("brand_name", "Brand name")}
            {field("footer_tagline", "Footer tagline")}
            <div>
              {field("copyright_text", "Copyright text")}
              <p className="mt-1.5 text-body-sm text-neutral-500">
                Use <code>{"{year}"}</code> and <code>{"{brand}"}</code>. Empty shows “© year brand. All rights reserved.”
              </p>
            </div>
            <div>
              {field("email_sender_name", "Email sender name")}
              <p className="mt-1.5 text-body-sm text-neutral-500">Shown as the “From” name on emails the site sends. Empty uses the brand name.</p>
            </div>
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

        <div className="rounded-[10px] border border-neutral-200 bg-neutral-50 p-5 xl:col-span-2">
          <Heading level={3}>Social Media Settings</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">
            Add a profile URL to show that platform's icon on the site. Leave a field blank to hide it.
          </p>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
