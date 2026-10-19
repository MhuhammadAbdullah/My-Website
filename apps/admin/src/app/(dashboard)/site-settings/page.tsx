"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  Button,
  FieldError,
  Heading,
  Input,
  Label,
  Skeleton,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@agency/ui";
import {
  ACCENT_HEX,
  ACCENT_OPTIONS,
  CUSTOM_ACCENT_MIN_CONTRAST,
  accentContrast,
  footerColumnsSchema,
  headerSettingsSchema,
  legalLinksSchema,
  notificationsSchema,
  organizationSchema,
  seoDefaultsSchema,
  themeSchema,
  type AccentId,
} from "@agency/types";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { usePermissions } from "@/lib/use-permissions";
import type { SiteSettings } from "@/lib/types";

type Link = { label: string; href: string; newTab: boolean };
type Column = { title: string; links: Link[] };

async function saveSetting(key: string, value: unknown) {
  await request(`/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) });
}

function zodMessage(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const i = error.issues[0]!;
  return `${i.path.map(String).join(" › ") || "Value"}: ${i.message}`;
}

function SaveBar({ saving, onSave, disabled }: { saving: boolean; onSave: () => void; disabled?: boolean }) {
  return (
    <Button type="button" onClick={onSave} disabled={saving || disabled} className="mt-6 w-fit">
      {saving ? "Saving…" : "Save changes"}
    </Button>
  );
}

// ------------------------------------------------------------------- Theme

const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

function ThemeTab({ settings }: { settings: SiteSettings }) {
  const [accent, setAccent] = React.useState<AccentId | "custom">(settings.theme?.accent ?? "lime");
  const [customColor, setCustomColor] = React.useState<string>(settings.theme?.customColor ?? "#8be9c0");
  const [mode, setMode] = React.useState<"dark" | "light">(settings.theme?.mode ?? "dark");
  const [installPrompt, setInstallPrompt] = React.useState<boolean>(settings.theme?.installPrompt ?? true);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    const parsed = themeSchema.safeParse({ accent, mode, installPrompt, ...(accent === "custom" ? { customColor } : {}) });
    if (!parsed.success) return toast.error(zodMessage(parsed.error));
    setSaving(true);
    try {
      await saveSetting("theme", parsed.data);
      toast.success("Theme saved — the whole site updates within a few minutes");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <p className="text-body-sm text-neutral-500">One accent colour is used for buttons, highlighted words, bands and links across every page.</p>
      <div role="radiogroup" aria-label="Accent colour" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ACCENT_OPTIONS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={accent === id}
            onClick={() => setAccent(id)}
            className={`flex flex-col items-center gap-2 rounded-2xl border p-4 capitalize ${accent === id ? "border-heading ring-2 ring-heading/20" : "border-neutral-200 hover:border-neutral-400"}`}
          >
            <span className="size-12 rounded-full border border-black/10" style={{ backgroundColor: ACCENT_HEX[id] }} />
            <span className="text-body-sm font-medium text-heading">{id}</span>
            <span className="font-mono text-label text-neutral-500">{ACCENT_HEX[id]}</span>
          </button>
        ))}
      </div>

      <div className={`mt-4 rounded-2xl border p-4 ${accent === "custom" ? "border-heading ring-2 ring-heading/20" : "border-neutral-200"}`}>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" role="radio" aria-checked={accent === "custom"} onClick={() => setAccent("custom")} className="flex items-center gap-3 text-left">
            <span className="size-12 rounded-full border border-black/10" style={{ backgroundColor: isHex(customColor) ? customColor : "#ffffff" }} />
            <span>
              <span className="block text-body-sm font-medium text-heading">Custom colour</span>
              <span className="block text-label text-neutral-500">Pick any colour you like</span>
            </span>
          </button>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Pick a custom colour"
              value={isHex(customColor) ? customColor : "#8be9c0"}
              onChange={(e) => {
                setCustomColor(e.target.value);
                setAccent("custom");
              }}
              className="h-11 w-14 cursor-pointer rounded-lg border border-neutral-200 bg-background p-1"
            />
            <input
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value.trim());
                setAccent("custom");
              }}
              placeholder="#RRGGBB"
              maxLength={7}
              aria-label="Custom colour hex code"
              className="h-11 w-28 rounded-xl border border-neutral-200 bg-background px-3 font-mono text-body-sm text-heading"
            />
          </div>
        </div>
        {accent === "custom" && isHex(customColor) && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full px-5 py-2 text-body-sm font-bold" style={{ backgroundColor: customColor, color: "#0b0b0c" }}>
              Button preview
            </span>
            {accentContrast(customColor) < CUSTOM_ACCENT_MIN_CONTRAST ? (
              <span className="text-body-sm text-error-500">Too dark: the dark text on buttons would be hard to read. Pick a lighter shade.</span>
            ) : (
              <span className="text-body-sm text-success-700">Readable — dark text on this colour has good contrast.</span>
            )}
          </div>
        )}
      </div>
      <p className="mt-4 text-body-sm text-neutral-500">Text on the accent colour is always near-black for contrast, so custom colours must be light or medium (dark colours are rejected).</p>
      <p className="mt-8 text-body-sm font-medium text-heading">Default look</p>
      <p className="text-body-sm text-neutral-500">What first-time visitors see. Everyone can switch with the sun/moon button in the site header, and their choice is remembered.</p>
      <div role="radiogroup" aria-label="Default look" className="mt-3 grid max-w-xs grid-cols-2 gap-3">
        {(["dark", "light"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-2xl border p-4 text-body-sm font-medium capitalize text-heading ${mode === m ? "border-heading ring-2 ring-heading/20" : "border-neutral-200 hover:border-neutral-400"}`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-neutral-200 p-4">
        <Switch checked={installPrompt} onCheckedChange={setInstallPrompt} aria-label="Show the install app prompt" />
        <div>
          <p className="text-body-sm font-medium text-heading">“Install app” prompt</p>
          <p className="text-body-sm text-neutral-500">
            The website works as an installable app (Android, iPhone/iPad, Windows/Mac). When on, visitors see a small banner offering to install it. The app itself stays installable from the browser menu even when this is off.
          </p>
        </div>
      </div>
      <SaveBar saving={saving} onSave={save} />
    </div>
  );
}

// ------------------------------------------------------------ Header & CTA

function HeaderTab({ settings }: { settings: SiteSettings }) {
  const [form, setForm] = React.useState({
    ctaVisible: settings.header?.ctaVisible ?? true,
    ctaLabel: settings.header?.ctaLabel ?? "",
    ctaHref: settings.header?.ctaHref ?? "/contact",
    ctaNewTab: settings.header?.ctaNewTab ?? false,
  });
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    const parsed = headerSettingsSchema.safeParse(form);
    if (!parsed.success) return setError(zodMessage(parsed.error));
    setError("");
    setSaving(true);
    try {
      await saveSetting("header", parsed.data);
      toast.success("Header saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid max-w-xl gap-5">
      <p className="text-body-sm text-neutral-500">
        Menu links are managed under <a className="underline" href="/navigation">Navigation</a> (order, show/hide, new tab). The announcement bar has its own screen under <a className="underline" href="/announcement-bar">Announcement Bar</a>.
      </p>
      <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
        <Label htmlFor="cta-visible" className="mb-0">Show the header button</Label>
        <Switch id="cta-visible" checked={form.ctaVisible} onCheckedChange={(v) => setForm({ ...form, ctaVisible: v })} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="cta-label">Button label</Label>
          <Input id="cta-label" value={form.ctaLabel} maxLength={40} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="cta-href">Button link</Label>
          <Input id="cta-href" value={form.ctaHref} onChange={(e) => setForm({ ...form, ctaHref: e.target.value })} placeholder="/contact" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="cta-tab" checked={form.ctaNewTab} onCheckedChange={(v) => setForm({ ...form, ctaNewTab: v })} />
        <Label htmlFor="cta-tab" className="mb-0">Open in a new tab</Label>
      </div>
      <FieldError>{error}</FieldError>
      <SaveBar saving={saving} onSave={save} />
    </div>
  );
}

// ------------------------------------------------------------------ Footer

function LinkRows({ links, onChange }: { links: Link[]; onChange: (next: Link[]) => void }) {
  const move = (i: number, dir: -1 | 1) => {
    const next = [...links];
    [next[i], next[i + dir]] = [next[i + dir]!, next[i]!];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {links.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
          <Input aria-label="Link label" placeholder="Label" value={l.label} onChange={(e) => onChange(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <Input aria-label="Link URL" placeholder="/path or https://…" value={l.href} onChange={(e) => onChange(links.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))} />
          <label className="hidden items-center gap-1.5 text-body-sm sm:flex">
            <Switch checked={l.newTab} onCheckedChange={(v) => onChange(links.map((x, j) => (j === i ? { ...x, newTab: v } : x)))} aria-label="Open in new tab" /> New tab
          </label>
          <div className="flex">
            <button type="button" className="rounded p-1 text-neutral-400 hover:text-heading disabled:opacity-30" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></button>
            <button type="button" className="rounded p-1 text-neutral-400 hover:text-heading disabled:opacity-30" aria-label="Move down" disabled={i === links.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></button>
            <button type="button" className="rounded p-1 text-neutral-400 hover:text-error-500" aria-label="Remove link" onClick={() => onChange(links.filter((_, j) => j !== i))}><Trash2 className="size-4" /></button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...links, { label: "", href: "", newTab: false }])}>
        <Plus /> Add link
      </Button>
    </div>
  );
}

function FooterTab({ settings }: { settings: SiteSettings }) {
  const [columns, setColumns] = React.useState<Column[]>(settings.footer_columns ?? []);
  const [legal, setLegal] = React.useState<Link[]>(settings.legal_links ?? []);
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    const c = footerColumnsSchema.safeParse(columns);
    const l = legalLinksSchema.safeParse(legal);
    if (!c.success) return setError(`Footer columns — ${zodMessage(c.error)}`);
    if (!l.success) return setError(`Legal links — ${zodMessage(l.error)}`);
    setError("");
    setSaving(true);
    try {
      await Promise.all([saveSetting("footer_columns", c.data), saveSetting("legal_links", l.data)]);
      toast.success("Footer saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid max-w-3xl gap-8">
      <p className="text-body-sm text-neutral-500">
        Brand name, logo, tagline and copyright come from <a className="underline" href="/settings">Settings → Branding</a>; social links from <a className="underline" href="/settings">Settings → Social Media</a>.
      </p>
      <section>
        <Heading level={3}>Link columns</Heading>
        <div className="mt-4 space-y-5">
          {columns.map((col, ci) => (
            <div key={ci} className="rounded-2xl border border-neutral-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Input aria-label="Column title" placeholder="Column title" value={col.title} onChange={(e) => setColumns(columns.map((x, j) => (j === ci ? { ...x, title: e.target.value } : x)))} />
                <button type="button" className="rounded p-1 text-neutral-400 hover:text-error-500" aria-label="Remove column" onClick={() => setColumns(columns.filter((_, j) => j !== ci))}><Trash2 className="size-4" /></button>
              </div>
              <LinkRows links={col.links} onChange={(links) => setColumns(columns.map((x, j) => (j === ci ? { ...x, links } : x)))} />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={columns.length >= 6} onClick={() => setColumns([...columns, { title: "", links: [] }])}>
            <Plus /> Add column
          </Button>
        </div>
      </section>
      <section>
        <Heading level={3}>Legal links</Heading>
        <p className="mt-1 text-body-sm text-neutral-500">Shown in the bottom bar next to the copyright line.</p>
        <div className="mt-4">
          <LinkRows links={legal} onChange={setLegal} />
        </div>
      </section>
      <FieldError>{error}</FieldError>
      <SaveBar saving={saving} onSave={save} />
    </div>
  );
}

// --------------------------------------------------------------------- SEO

function SeoTab({ settings }: { settings: SiteSettings }) {
  const [seo, setSeo] = React.useState({
    titleTemplate: settings.seo_defaults?.titleTemplate ?? "%s | {brand}",
    defaultTitle: settings.seo_defaults?.defaultTitle ?? "{brand}",
    description: settings.seo_defaults?.description ?? "",
    ogImageUrl: settings.seo_defaults?.ogImageUrl ?? "",
    twitterHandle: settings.seo_defaults?.twitterHandle ?? "",
  });
  const [org, setOrg] = React.useState({
    legalName: settings.organization?.legalName ?? "",
    description: settings.organization?.description ?? "",
    foundingDate: settings.organization?.foundingDate ?? "",
    areaServed: settings.organization?.areaServed ?? "",
  });
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    const s = seoDefaultsSchema.safeParse(seo);
    const o = organizationSchema.safeParse(org);
    if (!s.success) return setError(zodMessage(s.error));
    if (!o.success) return setError(zodMessage(o.error));
    if (!s.data.titleTemplate.includes("%s")) return setError("Title template must contain %s (the page title).");
    setError("");
    setSaving(true);
    try {
      await Promise.all([saveSetting("seo_defaults", s.data), saveSetting("organization", o.data)]);
      toast.success("SEO defaults saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const f = (id: string, label: string, value: string, set: (v: string) => void, props: { placeholder?: string; help?: string } = {}) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => set(e.target.value)} placeholder={props.placeholder} />
      {props.help && <p className="mt-1 text-body-sm text-neutral-500">{props.help}</p>}
    </div>
  );

  return (
    <div className="grid max-w-2xl gap-5">
      <p className="text-body-sm text-neutral-500">Used by any page that does not set its own SEO. <code>{"{brand}"}</code> is replaced with the brand name from Branding.</p>
      {f("seo-template", "Title template", seo.titleTemplate, (v) => setSeo({ ...seo, titleTemplate: v }), { help: "%s = the page title. Example: %s | {brand}" })}
      {f("seo-title", "Default title (home / pages without a title)", seo.defaultTitle, (v) => setSeo({ ...seo, defaultTitle: v }))}
      <div>
        <Label htmlFor="seo-desc">Default description</Label>
        <Textarea id="seo-desc" rows={3} maxLength={300} value={seo.description} onChange={(e) => setSeo({ ...seo, description: e.target.value })} />
      </div>
      {f("seo-og", "Default social share image URL", seo.ogImageUrl, (v) => setSeo({ ...seo, ogImageUrl: v }), { placeholder: "https://…", help: "1200×630 works best. Copy the URL from the Media Library." })}
      {f("seo-tw", "Twitter / X handle", seo.twitterHandle, (v) => setSeo({ ...seo, twitterHandle: v }), { placeholder: "@yourbrand" })}

      <div className="mt-4 border-t border-neutral-200 pt-6">
        <Heading level={3}>Organization (structured data)</Heading>
        <p className="mt-1 text-body-sm text-neutral-500">Feeds the Organization JSON-LD. Name, email, phone, address and social links are taken from Settings.</p>
        <div className="mt-4 grid gap-5">
          {f("org-name", "Legal name", org.legalName, (v) => setOrg({ ...org, legalName: v }))}
          <div>
            <Label htmlFor="org-desc">Description</Label>
            <Textarea id="org-desc" rows={3} maxLength={500} value={org.description} onChange={(e) => setOrg({ ...org, description: e.target.value })} />
          </div>
          {f("org-founded", "Founding date", org.foundingDate, (v) => setOrg({ ...org, foundingDate: v }), { placeholder: "2019 or 2019-06-01" })}
          {f("org-area", "Area served", org.areaServed, (v) => setOrg({ ...org, areaServed: v }), { placeholder: "Worldwide" })}
        </div>
      </div>
      <FieldError>{error}</FieldError>
      <SaveBar saving={saving} onSave={save} />
    </div>
  );
}

// ----------------------------------------------------------- Notifications

function NotificationsTab() {
  const { data, loading, error: loadError } = useAsyncData<{ emails: string[] }>(
    () => request<{ settings: { notifications?: { emails: string[] } } }>("/settings/private").then((r) => r.settings.notifications ?? { emails: [] }),
    [],
  );
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (data) setText(data.emails.join("\n"));
  }, [data]);

  async function save() {
    const emails = text.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean);
    const parsed = notificationsSchema.safeParse({ emails });
    if (!parsed.success) return setError("One of the addresses is not a valid email.");
    setError("");
    setSaving(true);
    try {
      await saveSetting("notifications", parsed.data);
      toast.success("Notification addresses saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-32 max-w-xl" />;
  return (
    <div className="grid max-w-xl gap-3">
      <p className="text-body-sm text-neutral-500">
        These addresses get an email for every new form enquiry. They are private — never shown on the public site. Tracking IDs and the spam-protection site key live under <a className="underline" href="/integrations">Integrations</a>.
      </p>
      {loadError && <FieldError>{loadError}</FieldError>}
      <Label htmlFor="notify">Email addresses (one per line)</Label>
      <Textarea id="notify" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="you@example.com" />
      <FieldError>{error}</FieldError>
      <SaveBar saving={saving} onSave={save} />
    </div>
  );
}

// -------------------------------------------------------------------- page

export default function SiteSettingsPage() {
  const { can } = usePermissions();
  const { data: settings, loading } = useAsyncData<SiteSettings>(() => request<{ settings: SiteSettings }>("/settings").then((r) => r.settings), []);

  if (loading || !settings) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full max-w-xl" />
      </div>
    );
  }
  if (!can("settings", "update")) return <p className="text-body-sm text-neutral-500">You don’t have permission to change Site Settings.</p>;

  return (
    <div>
      <Heading level={2}>Site Settings</Heading>
      <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
        Sitewide options. Brand, logo and contact details are on the <a className="underline" href="/settings">Settings</a> screen.
      </p>
      <Tabs defaultValue="theme" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="header">Header</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="seo">SEO &amp; Organization</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="theme" className="mt-6"><ThemeTab settings={settings} /></TabsContent>
        <TabsContent value="header" className="mt-6"><HeaderTab settings={settings} /></TabsContent>
        <TabsContent value="footer" className="mt-6"><FooterTab settings={settings} /></TabsContent>
        <TabsContent value="seo" className="mt-6"><SeoTab settings={settings} /></TabsContent>
        <TabsContent value="notifications" className="mt-6"><NotificationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
