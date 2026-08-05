import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Button, Card, Heading, SocialIcon } from "@agency/ui";
import { getSettings } from "@/lib/api";
import type { InfluencerInsightsGuide } from "@/lib/types";

// Falls back to this until an admin customizes a platform from Admin →
// Influencer settings → Platform Insights Guide -- same "not customized yet"
// convention as the registration form's Video Guide default.
const DEFAULT_GUIDE: InfluencerInsightsGuide = {
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

const PLATFORMS: { key: keyof InfluencerInsightsGuide; label: string; icon: "instagram" | "tiktok" | "youtube" | "facebook" | "linkedin" | "x" }[] = [
  { key: "instagram", label: "Instagram Insights", icon: "instagram" },
  { key: "tiktok", label: "TikTok Analytics", icon: "tiktok" },
  { key: "youtube", label: "YouTube Studio", icon: "youtube" },
  { key: "facebook", label: "Facebook Insights", icon: "facebook" },
  { key: "linkedin", label: "LinkedIn Analytics", icon: "linkedin" },
  { key: "x", label: "X Analytics", icon: "x" },
];

export default async function InfluencerInsightsGuidePage() {
  const settings = await getSettings({ next: { revalidate: 0 } }).catch(() => null);
  const guide = { ...DEFAULT_GUIDE, ...settings?.influencer_insights_guide };

  return (
    <div>
      <Heading level={2}>Platform Insights Guide</Heading>
      <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
        Most influencers don't know exactly where to find these numbers on each platform — this guide walks you through it,
        step by step.
      </p>

      <div className="mt-8 max-w-3xl">
        <Accordion type="single" collapsible>
          {PLATFORMS.map(({ key, label, icon }) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger>
                <span className="flex items-center gap-2.5">
                  <SocialIcon platform={icon} className="size-5 text-heading" />
                  {label}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div
                  className="space-y-2 text-body-sm text-neutral-600 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{ __html: guide[key] || DEFAULT_GUIDE[key] }}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <Card className="mt-10 max-w-3xl p-6">
        <h3 className="text-body-sm font-semibold text-heading">How to update your statistics</h3>
        <ol className="mt-3 space-y-2">
          {[
            "Find the numbers you need using the guide above for each platform you're active on.",
            "Open the Analytics tab in this dashboard.",
            "Click \"Edit stats\" on a platform tab (or \"Add platform\" if it isn't listed yet) and enter the numbers.",
            "Save — engagement rate is calculated automatically from what you enter, so you don't need to work that out yourself.",
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-body-sm text-neutral-600">
              <span className="shrink-0 font-medium text-heading">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-body-sm text-neutral-500">
          We recommend updating your stats at least once a month. Fresh, accurate numbers make your profile more credible to
          brands and directly improve your chances of getting booked.
        </p>
        <Button asChild className="mt-4 w-fit">
          <Link href="/influencer/dashboard/analytics">Go to Platform Analytics</Link>
        </Button>
      </Card>

      <Card className="mt-6 max-w-3xl p-6">
        <h3 className="text-body-sm font-semibold text-heading">Need help?</h3>
        <p className="mt-2 text-body-sm text-neutral-600">
          Can't find your analytics on one of your platforms, or not sure what a number means? Reach out and our team will help
          you locate it.
        </p>
        <Button asChild variant="outline" className="mt-4 w-fit">
          <Link href="/contact">Contact support</Link>
        </Button>
      </Card>
    </div>
  );
}
