"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, FieldError, Heading, Input, Label, Skeleton, Switch, toast } from "@agency/ui";
import { influencersPageSchema, type InfluencersPageSettings } from "@agency/types";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import type { SiteSettings } from "@/lib/types";

function Group({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 p-5">
      <Heading level={3}>{title}</Heading>
      {help && <p className="mt-1 text-body-sm text-neutral-500">{help}</p>}
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

function Field({ label, value, onChange, placeholder, help }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; help?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {help && <p className="mt-1 text-label text-neutral-500">{help}</p>}
    </div>
  );
}

const LABELS: { key: keyof InfluencersPageSettings["labels"]; label: string; help?: string }[] = [
  { key: "searchPlaceholder", label: "Search box hint" },
  { key: "sort", label: "Sort label" },
  { key: "filters", label: "Filters button" },
  { key: "viewProfile", label: "View profile button" },
  { key: "shortlist", label: "Add to shortlist button" },
  { key: "shortlisted", label: "Saved button" },
  { key: "followers", label: "Followers label" },
  { key: "engagement", label: "Engagement label" },
  { key: "from", label: "Price label" },
  { key: "newCreator", label: "No rating yet" },
  { key: "loadMore", label: "Load more button" },
  { key: "shortlistBar", label: "Shortlist bar text", help: "{n} becomes the number of saved creators." },
  { key: "requestQuotes", label: "Request quotes button" },
  { key: "noResults", label: "Nothing found message" },
];

const PROFILE_FIELDS: { key: keyof InfluencersPageSettings["profile"]; label: string; help?: string }[] = [
  { key: "available", label: "Available chip", help: undefined },
  { key: "unavailable", label: "Not available chip", help: undefined },
  { key: "verified", label: "Verified pill", help: undefined },
  { key: "newCreator", label: "No reviews yet tag", help: undefined },
  { key: "reviewsCount", label: "Review count text", help: "{n}, {name} and {category} are replaced by numbers and names." },
  { key: "totalFollowers", label: "Stat: followers", help: undefined },
  { key: "avgEngagement", label: "Stat: engagement", help: undefined },
  { key: "avgReach", label: "Stat: content reach", help: undefined },
  { key: "languages", label: "Stat: languages", help: undefined },
  { key: "analytics", label: "Analytics heading", help: undefined },
  { key: "followersEngagement", label: "Card 1 title", help: undefined },
  { key: "engagementRate", label: "Engagement bar label", help: undefined },
  { key: "reach", label: "Card 2 title", help: undefined },
  { key: "accountReach", label: "Account reach label", help: undefined },
  { key: "contentReach", label: "Content reach label", help: undefined },
  { key: "gender", label: "Card 3 title", help: undefined },
  { key: "female", label: "Female label", help: undefined },
  { key: "male", label: "Male label", help: undefined },
  { key: "age", label: "Card 4 title", help: undefined },
  { key: "topLocations", label: "Locations title", help: undefined },
  { key: "country", label: "Country switch", help: undefined },
  { key: "city", label: "City switch", help: undefined },
  { key: "source", label: "Analytics footnote", help: undefined },
  { key: "rateCard", label: "Rate card heading", help: undefined },
  { key: "yourBooking", label: "Booking box label", help: undefined },
  { key: "items", label: "Selected count text", help: "{n}, {name} and {category} are replaced by numbers and names." },
  { key: "custom", label: "Custom price word", help: undefined },
  { key: "quoteNote", label: "Note under the count", help: undefined },
  { key: "bookButton", label: "Book button", help: "{n}, {name} and {category} are replaced by numbers and names." },
  { key: "brandWork", label: "Videos heading", help: undefined },
  { key: "collaborations", label: "Collaborations heading", help: undefined },
  { key: "reviews", label: "Reviews heading", help: undefined },
  { key: "noReviews", label: "No reviews text", help: undefined },
  { key: "moreCreators", label: "Related heading", help: "{n}, {name} and {category} are replaced by numbers and names." },
  { key: "writeReview", label: "Write a review button", help: undefined },
  { key: "reviewFormTitle", label: "Review form title", help: "{name} is replaced by the creator's name." },
  { key: "reviewFormIntro", label: "Review form intro", help: undefined },
  { key: "yourRating", label: "Rating label", help: undefined },
  { key: "yourName", label: "Name label", help: undefined },
  { key: "yourCompany", label: "Company label", help: undefined },
  { key: "yourReview", label: "Review text label", help: undefined },
  { key: "submitReview", label: "Submit button", help: undefined },
  { key: "reviewThanks", label: "After submitting", help: undefined },
  { key: "showMore", label: "Show more reviews button", help: undefined },
  { key: "viewAll", label: "View all link", help: undefined },
];

export function InfluencersPageSettingsForm() {
  const { data: settings, loading } = useAsyncData<SiteSettings>(() => request<{ settings: SiteSettings }>("/settings").then((r) => r.settings), []);
  const [f, setF] = React.useState<InfluencersPageSettings>(() => influencersPageSchema.parse({}));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (settings) setF(influencersPageSchema.parse(settings.influencers_page ?? {}));
  }, [settings]);

  async function save() {
    const parsed = influencersPageSchema.safeParse(f);
    if (!parsed.success) {
      const i = parsed.error.issues[0]!;
      return setError(`${i.path.join(" › ")}: ${i.message}`);
    }
    setError("");
    setSaving(true);
    try {
      await request("/settings/influencers_page", { method: "PUT", body: JSON.stringify({ value: parsed.data }) });
      toast.success("Saved — the Influencer page updates within about 30 seconds.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="grid gap-5">
      <Group title="Top switch and hero buttons">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Brand tab" value={f.toggle.brand} onChange={(v) => setF({ ...f, toggle: { ...f.toggle, brand: v } })} />
          <Field label="Creator tab (opens sign-up)" value={f.toggle.creator} onChange={(v) => setF({ ...f, toggle: { ...f.toggle, creator: v } })} />
          <Field label="Main button (scrolls to creators)" value={f.buttons.browse} onChange={(v) => setF({ ...f, buttons: { ...f.buttons, browse: v } })} />
          <Field label="Brief button" value={f.buttons.brief} onChange={(v) => setF({ ...f, buttons: { ...f.buttons, brief: v } })} />
          <Field label="Brief button link" value={f.buttons.briefHref} onChange={(v) => setF({ ...f, buttons: { ...f.buttons, briefHref: v } })} />
          <div>
            <Label>Creators shown at first (and per “Load more”)</Label>
            <Input type="number" min={4} max={24} value={f.pageSize} onChange={(e) => setF({ ...f, pageSize: Number(e.target.value) || 8 })} />
          </div>
        </div>
      </Group>

      <Group title="Three step cards (right of the heading)">
        {f.steps.map((st, i) => (
          <div key={i} className="grid grid-cols-[10rem_1fr_auto] items-end gap-3">
            <Field label="Title" value={st.title} onChange={(v) => setF({ ...f, steps: f.steps.map((x, j) => (j === i ? { ...x, title: v } : x)) })} />
            <Field label="Text" value={st.text} onChange={(v) => setF({ ...f, steps: f.steps.map((x, j) => (j === i ? { ...x, text: v } : x)) })} />
            <Button type="button" variant="outline" size="sm" aria-label="Remove" onClick={() => setF({ ...f, steps: f.steps.filter((_, j) => j !== i) })}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={f.steps.length >= 4} onClick={() => setF({ ...f, steps: [...f.steps, { title: "", text: "" }] })}>
          <Plus /> Add step
        </Button>
      </Group>

      <Group title="Small labels">
        <div className="grid gap-3 sm:grid-cols-3">
          {LABELS.map((l) => (
            <Field key={l.key} label={l.label} help={l.help} value={f.labels[l.key]} onChange={(v) => setF({ ...f, labels: { ...f.labels, [l.key]: v } })} />
          ))}
        </div>
      </Group>

      <Group title="Creator reviews slider" help="How the reviews are shown on each creator's page. Off = a normal grid with a “Show more” button.">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <label className="flex items-center gap-2 text-body-sm">
            <Switch checked={f.reviewsMarquee.enabled} onCheckedChange={(v) => setF({ ...f, reviewsMarquee: { ...f.reviewsMarquee, enabled: v } })} /> Slide reviews automatically (infinite slider)
          </label>
          <div className="w-44">
            <Label>Seconds per loop (higher = slower)</Label>
            <Input type="number" min={10} max={200} value={f.reviewsMarquee.speed} onChange={(e) => setF({ ...f, reviewsMarquee: { ...f.reviewsMarquee, speed: Number(e.target.value) || 50 } })} />
          </div>
          <label className="flex items-center gap-2 text-body-sm">
            <Switch checked={f.reviewsMarquee.pauseOnHover} onCheckedChange={(v) => setF({ ...f, reviewsMarquee: { ...f.reviewsMarquee, pauseOnHover: v } })} /> Pause when the mouse is over it
          </label>
        </div>
      </Group>

      <Group title="Creator profile page" help="The words on each creator's own page. Numbers and names come from the creator's profile.">
        <div className="grid gap-3 sm:grid-cols-3">
          {PROFILE_FIELDS.map((l) => (
            <Field key={l.key} label={l.label} help={l.help} value={f.profile[l.key]} onChange={(v) => setF({ ...f, profile: { ...f.profile, [l.key]: v } })} />
          ))}
        </div>
      </Group>

      <Group title="“For brands” card" help="Visitors who click its button go to the contact form with “Influencer campaign” already picked.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Small label" value={f.briefCard.tag} onChange={(v) => setF({ ...f, briefCard: { ...f.briefCard, tag: v } })} />
          <Field label="Heading" value={f.briefCard.heading} onChange={(v) => setF({ ...f, briefCard: { ...f.briefCard, heading: v } })} />
          <div className="sm:col-span-2">
            <Field label="Text" value={f.briefCard.text} onChange={(v) => setF({ ...f, briefCard: { ...f.briefCard, text: v } })} />
          </div>
          <Field label="Button label" value={f.briefCard.button.label} onChange={(v) => setF({ ...f, briefCard: { ...f.briefCard, button: { ...f.briefCard.button, label: v } } })} />
          <Field label="Button link" value={f.briefCard.button.href} onChange={(v) => setF({ ...f, briefCard: { ...f.briefCard, button: { ...f.briefCard.button, href: v } } })} />
        </div>
      </Group>

      <Group title="“For creators” card" help="Its button opens the creator sign-up (hidden while registrations are off).">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Small label" value={f.creatorCard.tag} onChange={(v) => setF({ ...f, creatorCard: { ...f.creatorCard, tag: v } })} />
          <Field label="Heading" value={f.creatorCard.heading} onChange={(v) => setF({ ...f, creatorCard: { ...f.creatorCard, heading: v } })} />
          <div className="sm:col-span-2">
            <Field label="Text" value={f.creatorCard.text} onChange={(v) => setF({ ...f, creatorCard: { ...f.creatorCard, text: v } })} />
          </div>
          <Field label="Button label" value={f.creatorCard.button} onChange={(v) => setF({ ...f, creatorCard: { ...f.creatorCard, button: v } })} />
        </div>
      </Group>

      <FieldError>{error}</FieldError>
      <Button type="button" onClick={save} disabled={saving} className="w-fit">
        {saving ? "Saving…" : "Save marketplace page sections"}
      </Button>
    </div>
  );
}
