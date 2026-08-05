"use client";

import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Heading,
  Input,
  Label,
  RichTextEditor,
  Skeleton,
  SocialIcon,
  Switch,
  Textarea,
  toast,
} from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import type { InfluencerFlagsSettings, InfluencerInsightsGuideSettings, InfluencerVideoGuideSettings, SiteSettings } from "@/lib/types";

const DEFAULT_FLAGS: InfluencerFlagsSettings = {
  marketplaceEnabled: true,
  registrationEnabled: true,
  bookingsEnabled: true,
  maintenanceNotice: "",
  registrationClosedMessage: "Influencer registrations are currently closed. Please check back later.",
  bookingsDisabledMessage: "Bookings are temporarily unavailable right now. Please check back later.",
};

// Falls back to the original spec'd script until an admin customizes it --
// matches DEFAULT_FLAGS' pattern of a sensible client-side default rather
// than requiring a seed-data change for a brand-new setting key.
const DEFAULT_VIDEO_GUIDE: InfluencerVideoGuideSettings = {
  content: `<ol>
<li>Mention your Name</li>
<li>Mention what you are known for</li>
<li>Mention that you have joined the StarBazaar Family</li>
<li>Mention that your fans can now order personalized video shoutouts on StarBazaar.pk to make every occasion special.</li>
<li>Mention that businesses can now order promotional video shoutouts on StarBazaar.pk.</li>
<li>Mention that you are excited to announce your collaboration with StarBazaar.pk.</li>
</ol>
<p><em>Your introduction video may be used for promotional purposes.</em></p>`,
};

// Falls back to the original spec'd copy until an admin customizes a given
// platform -- same "not customized yet" convention as DEFAULT_VIDEO_GUIDE.
// Each key is checked independently on the read side (apps/web's insights
// guide page), so an admin can customize just one or two platforms without
// having to fill in all six.
const DEFAULT_INSIGHTS_GUIDE: InfluencerInsightsGuideSettings = {
  instagram: `<ol>
<li>You need a Professional (Business or Creator) account — switch under Settings and privacy → Account type and tools if you haven't already.</li>
<li>Open your profile and tap the menu (☰) → Insights, or tap "Professional dashboard" on your profile.</li>
<li>Overview shows accounts reached, accounts engaged, and total followers for the period you select.</li>
<li>Tap into an individual post/reel to see its likes, comments, shares, and reach — use several recent posts to work out your averages.</li>
<li>Scroll to "Your audience" on the Insights home for follower breakdown by age, gender, and top locations (cities/countries).</li>
</ol>`,
  tiktok: `<ol>
<li>Switch to a TikTok Pro/Business account under Settings and privacy → Account → Switch to Business Account (free).</li>
<li>Go to your profile → menu (☰) → Creator tools / Business Suite → Analytics.</li>
<li>The Overview tab shows follower count and total video views/likes/comments/shares for the period.</li>
<li>The Content tab lists your recent videos with per-video views, likes, comments, and shares — use these to work out your averages.</li>
<li>The Followers tab shows gender split and top territories (countries) for your audience.</li>
</ol>`,
  youtube: `<ol>
<li>Go to studio.youtube.com (or the YouTube Studio app) and sign in with your channel's account.</li>
<li>Open the Analytics tab in the left sidebar.</li>
<li>The Overview tab shows subscriber count, views, and watch time for the period you select.</li>
<li>The Engagement tab shows average views per video — a good source for your average views figure.</li>
<li>The Audience tab shows viewer demographics — age, gender, and top geographies (countries/cities).</li>
</ol>`,
  facebook: `<ol>
<li>You need a Facebook Page (not a personal profile) — Insights are only available for Pages.</li>
<li>Open Meta Business Suite (business.facebook.com) or your Page → Insights.</li>
<li>The Overview shows Page followers, reach, and engagement for the period.</li>
<li>The Content tab breaks down reach/engagement per post — use recent posts to estimate your averages.</li>
<li>The Audience tab shows follower demographics by age, gender, and top cities/countries.</li>
</ol>`,
  linkedin: `<ol>
<li>For a personal profile: turn on Creator Mode (Profile → "Resources" → Creator mode) to unlock analytics on your posts and followers.</li>
<li>For a Company Page: go to your Page → Analytics from the admin view.</li>
<li>The Analytics tab shows follower count and growth, plus impressions/engagement on recent posts.</li>
<li>The Followers section shows a demographic breakdown (seniority, industry, location) — location percentages map to your Country/City figures here.</li>
</ol>`,
  x: `<ol>
<li>Go to your profile → the "⋯" menu (or analytics.twitter.com if still available in your account) → Analytics / Creator dashboard.</li>
<li>The Home tab shows impressions, engagements, and profile visits for the period.</li>
<li>The Posts tab lists individual post performance (likes, reposts, replies, views) — use recent posts to estimate your averages.</li>
<li>X's audience demographic breakdown is more limited than the other platforms — enter whatever your dashboard shows, or leave those fields blank if it isn't available to you.</li>
</ol>`,
};

const INSIGHTS_GUIDE_PLATFORMS: { key: keyof InfluencerInsightsGuideSettings; label: string; icon: "instagram" | "tiktok" | "youtube" | "facebook" | "linkedin" | "x" }[] = [
  { key: "instagram", label: "Instagram Insights", icon: "instagram" },
  { key: "tiktok", label: "TikTok Analytics", icon: "tiktok" },
  { key: "youtube", label: "YouTube Studio", icon: "youtube" },
  { key: "facebook", label: "Facebook Insights", icon: "facebook" },
  { key: "linkedin", label: "LinkedIn Analytics", icon: "linkedin" },
  { key: "x", label: "X Analytics", icon: "x" },
];

interface InfluencerAutomationSettings {
  autoApproveApplications: boolean;
  badgeAutoApprovalEnabled: boolean;
  maxPricingCards: number;
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return <Badge variant={enabled ? "success" : "error"}>{enabled ? "🟢 Enabled" : "🔴 Disabled"}</Badge>;
}

export default function InfluencerSettingsPage() {
  const { data: settings, loading: loadingSettings } = useAsyncData<SiteSettings>(
    () => request<{ settings: SiteSettings }>("/settings").then((r) => r.settings),
    [],
  );
  const { data: automation, loading: loadingAutomation } = useAsyncData<InfluencerAutomationSettings>(
    () => request<{ item: InfluencerAutomationSettings }>("/influencer-settings").then((r) => r.item),
    [],
  );

  const [flags, setFlags] = React.useState<InfluencerFlagsSettings>(DEFAULT_FLAGS);
  const [videoGuide, setVideoGuide] = React.useState<InfluencerVideoGuideSettings>(DEFAULT_VIDEO_GUIDE);
  const [insightsGuide, setInsightsGuide] = React.useState<InfluencerInsightsGuideSettings>(DEFAULT_INSIGHTS_GUIDE);
  const [auto, setAuto] = React.useState<InfluencerAutomationSettings>({
    autoApproveApplications: false,
    badgeAutoApprovalEnabled: false,
    maxPricingCards: 10,
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (settings?.influencer_flags) setFlags({ ...DEFAULT_FLAGS, ...settings.influencer_flags });
    if (settings?.influencer_video_guide?.content) setVideoGuide(settings.influencer_video_guide);
    // Merge, not replace -- a saved row missing a not-yet-customized
    // platform key should still fall back to that one platform's default
    // rather than losing all six defaults.
    if (settings?.influencer_insights_guide) setInsightsGuide({ ...DEFAULT_INSIGHTS_GUIDE, ...settings.influencer_insights_guide });
  }, [settings]);

  React.useEffect(() => {
    if (automation) setAuto(automation);
  }, [automation]);

  function setFlag<K extends keyof InfluencerFlagsSettings>(key: K, value: InfluencerFlagsSettings[K]) {
    setFlags((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all([
        request("/settings/influencer_flags", { method: "PUT", body: JSON.stringify({ value: flags }) }),
        request("/settings/influencer_video_guide", { method: "PUT", body: JSON.stringify({ value: videoGuide }) }),
        request("/settings/influencer_insights_guide", { method: "PUT", body: JSON.stringify({ value: insightsGuide }) }),
        request("/influencer-settings", { method: "PATCH", body: JSON.stringify(auto) }),
      ]);
      toast.success("Influencer settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const loading = loadingSettings || loadingAutomation;

  return (
    <div>
      <Heading level={2}>Influencer marketplace settings</Heading>
      <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
        Master kill-switches for the marketplace, registrations, and bookings — changes take effect immediately across the website, no
        redeploy required.
      </p>

      {loading ? (
        <Skeleton className="mt-6 h-96 w-full" />
      ) : (
        <div className="mt-6 max-w-2xl space-y-8">
          <section className="space-y-4 rounded-2xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-heading">Influencer Marketplace</p>
                <p className="text-body-sm text-neutral-500">Master toggle. When off, all public influencer pages 404.</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge enabled={flags.marketplaceEnabled} />
                <Switch checked={flags.marketplaceEnabled} onCheckedChange={(v) => setFlag("marketplaceEnabled", v)} />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
              <div>
                <p className="font-medium text-heading">Influencer Registration</p>
                <p className="text-body-sm text-neutral-500">Hides "Become an Influencer" and blocks new applications.</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge enabled={flags.registrationEnabled} />
                <Switch checked={flags.registrationEnabled} onCheckedChange={(v) => setFlag("registrationEnabled", v)} />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
              <div>
                <p className="font-medium text-heading">Client Bookings</p>
                <p className="text-body-sm text-neutral-500">Blocks new booking submissions. Existing bookings stay accessible.</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge enabled={flags.bookingsEnabled} />
                <Switch checked={flags.bookingsEnabled} onCheckedChange={(v) => setFlag("bookingsEnabled", v)} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="font-medium text-heading">Registration closed message</p>
              <Textarea value={flags.registrationClosedMessage} onChange={(e) => setFlag("registrationClosedMessage", e.target.value)} rows={2} />
            </div>
            <div>
              <p className="font-medium text-heading">Bookings disabled message</p>
              <Textarea value={flags.bookingsDisabledMessage} onChange={(e) => setFlag("bookingsDisabledMessage", e.target.value)} rows={2} />
            </div>
            <div>
              <p className="font-medium text-heading">Maintenance notice</p>
              <p className="mb-2 text-body-sm text-neutral-500">Shown in place of the marketplace whenever it's disabled.</p>
              <RichTextEditor value={flags.maintenanceNotice} onChange={(v) => setFlag("maintenanceNotice", v)} placeholder="Write a maintenance notice…" />
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="font-medium text-heading">Video Guide</p>
              <p className="mb-2 text-body-sm text-neutral-500">
                Shown to applicants in the "Video Guide" popup next to the Introduction Video upload on the registration form.
              </p>
              <RichTextEditor
                value={videoGuide.content}
                onChange={(v) => setVideoGuide({ content: v })}
                placeholder="Write the introduction video guide…"
              />
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="font-medium text-heading">Platform Insights Guide</p>
              <p className="mb-2 text-body-sm text-neutral-500">
                Shown on the influencer dashboard's "Platform Insights Guide" page — where to find analytics on each platform.
                Leave a platform's default text as-is, or rewrite it below.
              </p>
            </div>
            <Accordion type="single" collapsible className="rounded-2xl border border-neutral-200 px-5">
              {INSIGHTS_GUIDE_PLATFORMS.map(({ key, label, icon }) => (
                <AccordionItem key={key} value={key}>
                  <AccordionTrigger>
                    <span className="flex items-center gap-2.5 text-body font-medium">
                      <SocialIcon platform={icon} className="size-4 text-heading" />
                      {label}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <RichTextEditor
                      value={insightsGuide[key]}
                      onChange={(v) => setInsightsGuide((g) => ({ ...g, [key]: v }))}
                      placeholder={`Write where to find ${label}…`}
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          <section className="space-y-4 rounded-2xl border border-neutral-200 p-5">
            <p className="font-medium text-heading">Automation</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-body-sm font-medium text-heading">Auto-approve applications</p>
                <p className="text-label text-neutral-400">Skip manual review — new applications go live immediately.</p>
              </div>
              <Switch
                checked={auto.autoApproveApplications}
                onCheckedChange={(v) => setAuto((a) => ({ ...a, autoApproveApplications: v }))}
              />
            </div>
            <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
              <div>
                <p className="text-body-sm font-medium text-heading">Auto-approve badge recommendations</p>
                <p className="text-label text-neutral-400">Skip the review queue — scoring-pass recommendations go live immediately.</p>
              </div>
              <Switch
                checked={auto.badgeAutoApprovalEnabled}
                onCheckedChange={(v) => setAuto((a) => ({ ...a, badgeAutoApprovalEnabled: v }))}
              />
            </div>
            <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
              <div>
                <p className="text-body-sm font-medium text-heading">Maximum pricing cards</p>
                <p className="text-label text-neutral-400">Caps how many showcase pricing cards each influencer can create.</p>
              </div>
              <div className="w-24">
                <Label className="sr-only">Maximum pricing cards</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={auto.maxPricingCards}
                  onChange={(e) => setAuto((a) => ({ ...a, maxPricingCards: Number(e.target.value) }))}
                />
              </div>
            </div>
          </section>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </div>
      )}
    </div>
  );
}
