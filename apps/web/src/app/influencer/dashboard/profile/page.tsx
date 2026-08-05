"use client";

import * as React from "react";
import { Badge, Button, Heading, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Textarea, toast } from "@agency/ui";
import { COUNTRIES } from "@agency/utils";
import { influencerSelfProfileSchema, type InfluencerSelfProfileInput } from "@agency/types";
import { getInfluencerCategories, getInfluencerMe, signProfileMediaUpload, updateInfluencerProfile } from "@/lib/influencer-api";
import { ImageUploader } from "@/components/influencer/media-uploaders";
import type { InfluencerMeRead } from "@/lib/influencer-types";

export default function InfluencerProfilePage() {
  const [me, setMe] = React.useState<InfluencerMeRead | null>(null);
  const [categories, setCategories] = React.useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<Omit<InfluencerSelfProfileInput, "platforms" | "portfolioItems" | "pricingItems" | "pricingCards">>({
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
          setForm({
            tagline: p.tagline ?? "",
            bio: p.bio ?? "",
            countryCode: p.countryCode ?? "",
            city: p.city ?? "",
            languages: p.languages,
            categoryIds: p.categories.map((c) => c.id),
            availableForBooking: p.availableForBooking,
            profilePhoto: null,
            coverImage: null,
          });
        }
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

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
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full max-w-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <Heading level={2}>Profile</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">
        This is what clients see on your public profile at /influencers/{me?.profile?.username}.
      </p>

      <div className="mt-8 grid max-w-2xl gap-5">
        <div>
          <Label>Tagline</Label>
          <Input value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} />
        </div>
        <div>
          <Label>Bio</Label>
          <Textarea value={form.bio ?? ""} onChange={(e) => set("bio", e.target.value)} rows={4} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Country</Label>
            <Select value={form.countryCode ?? ""} onValueChange={(v) => set("countryCode", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>City</Label>
            <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Languages (comma separated)</Label>
          <Input
            value={form.languages.join(", ")}
            onChange={(e) => set("languages", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          />
        </div>
        <div>
          <Label>Categories</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {categories.map((c) => {
              const active = form.categoryIds.includes(c.id);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => set("categoryIds", active ? form.categoryIds.filter((id) => id !== c.id) : [...form.categoryIds, c.id])}
                >
                  <Badge variant={active ? "accent" : "neutral"}>{c.name}</Badge>
                </button>
              );
            })}
          </div>
        </div>
        <ImageUploader
          label="Profile image"
          helpText="JPG, PNG, or WEBP — up to 10MB."
          sign={signProfileMediaUpload}
          accept="image/jpeg,image/jpg,image/png,image/webp"
          acceptedExtensions={["jpg", "jpeg", "png", "webp"]}
          maxSizeMB={10}
          value={form.profilePhoto ?? me?.profile?.profilePhoto}
          onChange={(media) => set("profilePhoto", media)}
        />

        <ImageUploader
          label="Cover image"
          helpText="JPG, PNG, or WEBP — up to 10MB. Shown as the banner on your public profile."
          sign={signProfileMediaUpload}
          accept="image/jpeg,image/jpg,image/png,image/webp"
          acceptedExtensions={["jpg", "jpeg", "png", "webp"]}
          maxSizeMB={10}
          value={form.coverImage ?? me?.profile?.coverImage}
          onChange={(media) => set("coverImage", media)}
        />

        <div className="flex items-center gap-3">
          <button type="button" onClick={() => set("availableForBooking", !form.availableForBooking)} className="cursor-pointer">
            <Badge variant={form.availableForBooking ? "success" : "neutral"}>
              {form.availableForBooking ? "Available for booking" : "Not available for booking"}
            </Badge>
          </button>
        </div>

        <p className="text-body-sm text-neutral-500">
          Platform stats editing is coming to this page in a future update. Manage your portfolio from the{" "}
          <a href="/influencer/dashboard/portfolio" className="text-accent-600 hover:underline">
            Portfolio
          </a>{" "}
          tab and your pricing from the{" "}
          <a href="/influencer/dashboard/pricing" className="text-accent-600 hover:underline">
            Pricing
          </a>{" "}
          tab.
        </p>

        <Button onClick={handleSave} disabled={saving} className="mt-2 w-fit">
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </div>
  );
}
