"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Eye, Search, X } from "lucide-react";
import { Button, Input, Label, Popover, PopoverContent, PopoverTrigger, Skeleton, Switch, Textarea, cn, toast } from "@agency/ui";
import { CountrySelect } from "@/components/country-select";
import { PasswordField } from "@/components/password-field";
import { influencerAuthClient } from "@/lib/influencer-auth-client";
import { influencerSelfProfileSchema, type InfluencerSelfProfileInput } from "@agency/types";
import { getInfluencerCategories, getInfluencerMe, signProfileMediaUpload, updateInfluencerProfile } from "@/lib/influencer-api";
import { ImageUploader } from "@/components/influencer/media-uploaders";
import type { InfluencerMeRead } from "@/lib/influencer-types";

type FormState = Omit<InfluencerSelfProfileInput, "platforms" | "portfolioItems" | "pricingItems" | "pricingCards">;

const card = "rounded-[var(--radius-xl)] border border-neutral-200 bg-neutral-50 p-5 sm:p-6";
const cardTitle = "font-heading text-[1.125rem] font-extrabold tracking-tight text-heading";

// Change the sign-in password without leaving the dashboard.
function ChangePasswordCard() {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [others, setOthers] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return toast.error("Enter your current password");
    if (next.length < 8) return toast.error("The new password must be at least 8 characters");
    if (next !== confirm) return toast.error("The two new passwords do not match");
    if (next === current) return toast.error("Choose a password you are not using right now");
    setBusy(true);
    try {
      const { error } = await influencerAuthClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: others });
      if (error) return toast.error(error.message ?? "Could not change the password. Check your current password.");
      toast.success("Password changed");
      setCurrent("");
      setNext("");
      setConfirm("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={cn(card, "xl:col-span-2")}>
      <h2 className={cardTitle}>Password</h2>
      <p className="mt-1 text-body-sm text-neutral-500">Change the password you use to sign in.</p>
      <form onSubmit={submit} noValidate className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="current-password">Current password</Label>
          <PasswordField id="current-password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-password">New password</Label>
          <PasswordField id="new-password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          <p className="mt-1.5 text-label text-neutral-500">At least 8 characters.</p>
        </div>
        <div>
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <PasswordField id="confirm-password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <label className="flex items-start gap-3 text-body-sm text-neutral-500 md:col-span-2">
          <input type="checkbox" checked={others} onChange={(e) => setOthers(e.target.checked)} className="mt-1 size-4 accent-[var(--accent)]" />
          <span>Sign me out of my other devices after changing the password.</span>
        </label>
        <div className="md:justify-self-end">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </Button>
        </div>
      </form>
    </section>
  );
}

export default function InfluencerProfilePage() {
  const [me, setMe] = React.useState<InfluencerMeRead | null>(null);
  const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [baseline, setBaseline] = React.useState("");
  const [form, setForm] = React.useState<FormState>({
    tagline: "",
    bio: "",
    countryCode: "",
    city: "",
    languages: [],
    categoryIds: [],
    availableForBooking: true,
    profilePhoto: null,
    coverImage: null,
  });

  React.useEffect(() => {
    Promise.all([getInfluencerMe(), getInfluencerCategories()])
      .then(([meData, cats]) => {
        setMe(meData);
        setCategories(cats);
        const p = meData.profile;
        if (p) {
          const next: FormState = {
            tagline: p.tagline ?? "",
            bio: p.bio ?? "",
            countryCode: p.countryCode ?? "",
            city: p.city ?? "",
            languages: p.languages,
            categoryIds: p.categories.map((c) => c.id),
            availableForBooking: p.availableForBooking,
            profilePhoto: null,
            coverImage: null,
          };
          setForm(next);
          setBaseline(JSON.stringify(next));
        }
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const dirty = baseline !== "" && JSON.stringify(form) !== baseline;

  async function handleSave() {
    if (!me?.profile) return;
    // Platforms/portfolio/pricing editing isn't on this page -- those keys
    // stay omitted, which the API treats as "leave untouched."
    const payload: InfluencerSelfProfileInput = { ...form };

    const parsed = influencerSelfProfileSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form for errors.");
      return;
    }

    setSaving(true);
    try {
      await updateInfluencerProfile(parsed.data);
      setBaseline(JSON.stringify(form));
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1180px] space-y-4">
        <Skeleton className="h-16 w-72" />
        <div className="grid gap-5 xl:grid-cols-2">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const q = filter.trim().toLowerCase();
  const shownCategories = categories.filter((c) => !q || c.name.toLowerCase().includes(q));
  const selectedCategories = categories.filter((c) => form.categoryIds.includes(c.id));
  const toggleCategory = (id: string) => set("categoryIds", form.categoryIds.includes(id) ? form.categoryIds.filter((x) => x !== id) : [...form.categoryIds, id]);

  return (
    <div className="mx-auto max-w-[1180px] pb-24">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="font-heading font-extrabold tracking-tight text-heading" style={{ fontSize: "clamp(2rem, 1rem + 3vw, 3.25rem)", lineHeight: 0.98 }}>
            Profile<span className="text-accent-500">.</span>
          </h1>
          <p className="mt-3 text-body-sm text-neutral-500">This is what brands see on your public profile.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty && <span className="rounded-full bg-warning-500/15 px-3 py-1.5 text-label font-bold uppercase tracking-wider text-warning-700">Unsaved changes</span>}
          {me?.profile && (
            <Link href={`/influencers/${me.profile.username}`} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-neutral-300 px-4 text-body-sm font-bold text-heading hover:border-accent-500 hover:text-accent-500">
              <Eye className="size-4" aria-hidden /> View public profile
            </Link>
          )}
          <Button onClick={handleSave} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </div>

      <div className="mt-8 grid items-start gap-5 xl:grid-cols-2">
        {/* ------------------------------------------------------------ about */}
        <section className={cn(card, "grid gap-5")}>
          <h2 className={cardTitle}>About you</h2>
          <div>
            <div className="flex items-baseline justify-between">
              <Label>Tagline</Label>
              <span className="text-label text-neutral-500">{(form.tagline ?? "").length} / 160</span>
            </div>
            <Input value={form.tagline ?? ""} maxLength={160} onChange={(e) => set("tagline", e.target.value)} placeholder="One line that describes you" />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <Label>Bio</Label>
              <span className="text-label text-neutral-500">{(form.bio ?? "").length} / 2000</span>
            </div>
            <Textarea value={form.bio ?? ""} maxLength={2000} onChange={(e) => set("bio", e.target.value)} rows={5} placeholder="Tell brands who you are and what you create" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label>Country</Label>
              <CountrySelect value={form.countryCode ?? ""} onChange={(v) => set("countryCode", v)} placeholder="Select country" />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Languages</Label>
            <Input
              value={form.languages.join(", ")}
              onChange={(e) => set("languages", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="e.g. English, Urdu"
            />
            <p className="mt-1.5 text-label text-neutral-500">Separate languages with commas.</p>
          </div>
        </section>

        {/* ------------------------------------------------------------ photos + availability */}
        <div className="grid gap-5">
          <section className={cn(card, "grid gap-5")}>
            <h2 className={cardTitle}>Photos</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <ImageUploader
                label="Profile image"
                helpText="JPG, PNG or WEBP, up to 10MB."
                sign={signProfileMediaUpload}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                acceptedExtensions={["jpg", "jpeg", "png", "webp"]}
                maxSizeMB={10}
                value={form.profilePhoto ?? me?.profile?.profilePhoto}
                onChange={(media) => set("profilePhoto", media)}
              />
              <ImageUploader
                label="Cover image"
                helpText="Shown as the banner. JPG, PNG or WEBP, up to 10MB."
                sign={signProfileMediaUpload}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                acceptedExtensions={["jpg", "jpeg", "png", "webp"]}
                maxSizeMB={10}
                value={form.coverImage ?? me?.profile?.coverImage}
                onChange={(media) => set("coverImage", media)}
              />
            </div>
          </section>

          <section className={card}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className={cardTitle}>Taking bookings</h2>
                <p className="mt-1 text-body-sm text-neutral-500">{form.availableForBooking ? "Brands can send you booking requests." : "Your profile shows as not available."}</p>
              </div>
              <Switch checked={form.availableForBooking} onCheckedChange={(v) => set("availableForBooking", v)} aria-label="Available for booking" />
            </div>
          </section>
        </div>

        {/* ------------------------------------------------------------ categories */}
        <section className={cn(card, "xl:col-span-2")}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={cardTitle}>Categories</h2>
              <p className="mt-1 text-body-sm text-neutral-500">Pick the topics you create content about. Brands filter creators by these.</p>
            </div>
            <span className={cn("rounded-full px-3 py-1.5 text-label font-bold uppercase tracking-wider", form.categoryIds.length ? "bg-accent-500/15 text-accent-500" : "bg-error-500/15 text-error-700")}>
              {form.categoryIds.length ? `${form.categoryIds.length} selected` : "Pick at least one"}
            </span>
          </div>

          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                className="mt-4 flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-neutral-200 bg-background px-3 py-2 text-left transition-colors hover:border-accent-500"
              >
                <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                  {selectedCategories.length === 0 ? (
                    <span className="px-1 text-body text-neutral-400">Select categories…</span>
                  ) : (
                    selectedCategories.map((c) => (
                      <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-accent-500 px-3 py-1 text-body-sm font-bold text-on-accent">
                        {c.name}
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Remove ${c.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategory(c.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleCategory(c.id);
                            }
                          }}
                          className="flex size-4 items-center justify-center rounded-full hover:bg-black/15"
                        >
                          <X className="size-3" aria-hidden />
                        </span>
                      </span>
                    ))
                  )}
                </span>
                <ChevronDown className={cn("size-4 shrink-0 text-neutral-500 transition-transform", pickerOpen && "rotate-180")} aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
                <Input aria-label="Search categories" placeholder="Search categories…" className="h-10 pl-9" value={filter} onChange={(e) => setFilter(e.target.value)} />
              </div>
              <ul role="listbox" aria-multiselectable className="mt-2 max-h-64 overflow-y-auto">
                {shownCategories.map((c) => {
                  const active = form.categoryIds.includes(c.id);
                  return (
                    <li key={c.id} role="option" aria-selected={active}>
                      <button type="button" onClick={() => toggleCategory(c.id)} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left text-body-sm font-semibold text-heading hover:bg-neutral-100">
                        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-[5px] border", active ? "border-accent-500 bg-accent-500 text-on-accent" : "border-neutral-300")}>
                          {active && <Check className="size-3.5" aria-hidden />}
                        </span>
                        {c.name}
                      </button>
                    </li>
                  );
                })}
                {shownCategories.length === 0 && <li className="px-3 py-4 text-body-sm text-neutral-500">No category matches “{filter}”.</li>}
              </ul>
            </PopoverContent>
          </Popover>
        </section>

        <ChangePasswordCard />

        {/* ------------------------------------------------------------ other places to edit */}
        <section className={cn("grid gap-3 sm:grid-cols-2 xl:col-span-2")}>
          {[
            { label: "Portfolio", note: "Your showcase videos", href: "/influencer/dashboard/portfolio" },
            { label: "Pricing", note: "Your prices and packages", href: "/influencer/dashboard/pricing" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="group flex items-center justify-between rounded-[var(--radius-xl)] border border-neutral-200 bg-neutral-50 px-5 py-4 transition-colors hover:border-accent-500">
              <span>
                <span className="block font-heading text-body font-extrabold tracking-tight text-heading">{l.label}</span>
                <span className="block text-body-sm text-neutral-500">{l.note}</span>
              </span>
              <ArrowRight className="size-5 text-neutral-400 transition-colors group-hover:text-accent-500" aria-hidden />
            </Link>
          ))}
        </section>
      </div>

      {dirty && (
        <div role="status" className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-200 bg-background/95 px-4 py-3 backdrop-blur md:left-[16rem] max-md:bottom-14">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3">
            <p className="text-body-sm text-heading">You have unsaved changes.</p>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
