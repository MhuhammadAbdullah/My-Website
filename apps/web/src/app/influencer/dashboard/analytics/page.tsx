"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Heading,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  SocialIcon,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@agency/ui";
import { INFLUENCER_SOCIAL_PLATFORMS, influencerSelfProfileSchema, type InfluencerPlatformInput, type InfluencerSelfProfileInput } from "@agency/types";
import { getInfluencerMe, updateInfluencerProfile } from "@/lib/influencer-api";
import { formatCompactNumber, formatEngagementRate, platformIconId, platformLabel } from "@/lib/influencer-format";
import { AGE_GROUP_ORDER } from "@/components/influencer/audience-insights";
import { AudienceGeoCard } from "@/components/influencer/audience-geo-card";
import type { InfluencerMeRead, InfluencerPlatformRead } from "@/lib/influencer-types";

const PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899", "#84cc16", "#94a3b8"];
const LOCATION_LEVELS = ["COUNTRY", "CITY"] as const;

type BaseFields = Omit<InfluencerSelfProfileInput, "platforms" | "portfolioItems" | "pricingItems" | "pricingCards">;

function baseFieldsFrom(me: InfluencerMeRead): BaseFields {
  const p = me.profile!;
  return {
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
}

const EMPTY_PLATFORM: InfluencerPlatformInput = {
  platform: "INSTAGRAM",
  handle: "",
  profileUrl: "",
  followers: 0,
  following: 0,
  posts: 0,
  accountReach: 0,
  avgReach: 0,
  avgViews: 0,
  avgLikes: 0,
  avgComments: 0,
  avgShares: 0,
  avgSaves: 0,
  isPrimary: false,
  audienceInsight: { genderMalePercent: 0, genderFemalePercent: 0, genderOtherPercent: 0, ageGroups: {} },
  audienceLocations: [],
};

function platformToInput(p: InfluencerPlatformRead): InfluencerPlatformInput {
  return {
    platform: p.platform as InfluencerPlatformInput["platform"],
    handle: p.handle ?? "",
    profileUrl: p.profileUrl ?? "",
    followers: p.followers,
    following: p.following,
    posts: p.posts,
    accountReach: p.accountReach,
    avgReach: p.avgReach,
    avgViews: p.avgViews,
    avgLikes: p.avgLikes,
    avgComments: p.avgComments,
    avgShares: p.avgShares,
    avgSaves: p.avgSaves,
    isPrimary: p.isPrimary,
    audienceInsight: p.audienceInsight
      ? {
          genderMalePercent: Number(p.audienceInsight.genderMalePercent),
          genderFemalePercent: Number(p.audienceInsight.genderFemalePercent),
          genderOtherPercent: Number(p.audienceInsight.genderOtherPercent),
          ageGroups: Object.fromEntries(Object.entries(p.audienceInsight.ageGroups).map(([k, v]) => [k, Number(v)])),
        }
      : { genderMalePercent: 0, genderFemalePercent: 0, genderOtherPercent: 0, ageGroups: {} },
    audienceLocations: p.audienceLocations.map((l) => ({ level: l.level, name: l.name, percentage: Number(l.percentage) })),
  };
}

// Client-side preview only, using the same formula the server always
// recomputes on save -- never sent as-is, just so the influencer sees a live
// number while typing instead of a stale one.
function previewEngagementRate(p: { followers: number; avgLikes: number; avgComments: number; avgShares: number }): number {
  if (p.followers <= 0) return 0;
  return ((p.avgLikes + p.avgComments + p.avgShares) / p.followers) * 100;
}

export default function InfluencerAnalyticsPage() {
  const [me, setMe] = React.useState<InfluencerMeRead | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<InfluencerPlatformInput>(EMPTY_PLATFORM);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    return getInfluencerMe().then(setMe);
  }, []);

  React.useEffect(() => {
    load()
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [load]);

  if (loading || !me?.profile) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const platforms = me.profile.platforms;

  function openCreate() {
    setDraft(EMPTY_PLATFORM);
    setEditingIndex(-1);
  }

  function openEdit(index: number) {
    setDraft(platformToInput(platforms[index]!));
    setEditingIndex(index);
  }

  async function persist(nextPlatforms: InfluencerPlatformInput[]) {
    const payload: InfluencerSelfProfileInput = { ...baseFieldsFrom(me!), platforms: nextPlatforms };
    const parsed = influencerSelfProfileSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form for errors.");
      return false;
    }
    setSaving(true);
    try {
      await updateInfluencerProfile(parsed.data);
      await load();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    const current = platforms.map(platformToInput);
    const next = editingIndex === -1 ? [...current, draft] : current.map((p, i) => (i === editingIndex ? draft : p));
    const ok = await persist(next);
    if (ok) {
      toast.success(editingIndex === -1 ? "Platform added" : "Platform updated");
      setEditingIndex(null);
    }
  }

  async function handleDelete(index: number) {
    const id = platforms[index]!.id;
    setDeletingId(id);
    const next = platforms.filter((_, i) => i !== index).map(platformToInput);
    const ok = await persist(next);
    if (ok) toast.success("Platform removed");
    setDeletingId(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Heading level={2}>Platform Analytics</Heading>
          <p className="mt-1 max-w-2xl text-body-sm text-neutral-500">
            Enter your stats from each platform's own Insights — engagement rate is calculated automatically. Not sure where to
            find these numbers? Check the{" "}
            <a href="/influencer/dashboard/insights-guide" className="text-accent-600 hover:underline">
              Platform Insights Guide
            </a>
            .
          </p>
        </div>
        <Button onClick={openCreate}>Add platform</Button>
      </div>

      {platforms.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-neutral-200 p-8 text-center text-body-sm text-neutral-500">
          No platforms yet — add one to start tracking your analytics.
        </div>
      ) : (
        <div className="mt-8">
          <Tabs defaultValue={platforms[0]!.id}>
            <TabsList>
              {platforms.map((p) => {
                const iconId = platformIconId(p.platform);
                return (
                  <TabsTrigger key={p.id} value={p.id} className="flex items-center gap-2">
                    {iconId ? <SocialIcon platform={iconId} className="size-4" /> : null}
                    {platformLabel(p.platform)}
                    {p.isPrimary && <Badge variant="accent">Primary</Badge>}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {platforms.map((p, i) => (
              <TabsContent key={p.id} value={p.id} className="mt-6">
                <div className="mb-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(i)}>
                    Edit stats
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(i)} disabled={deletingId === p.id}>
                    {deletingId === p.id ? "Removing…" : "Remove platform"}
                  </Button>
                </div>
                <PlatformPanel platform={p} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}

      <Dialog open={editingIndex !== null} onOpenChange={(open) => !open && setEditingIndex(null)}>
        <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col p-0">
          <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
            <DialogTitle>{editingIndex === -1 ? "Add a platform" : "Edit platform stats"}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <PlatformEditForm draft={draft} setDraft={setDraft} />
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-neutral-200 px-5 py-3">
            <Button variant="outline" onClick={() => setEditingIndex(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveDraft} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChartCard({ title, empty, children }: { title: string; empty?: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-h5">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {empty ? (
          <div className="flex h-64 items-center justify-center text-body-sm text-neutral-400">No data yet.</div>
        ) : (
          <div className="h-64 w-full">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

function PlatformPanel({ platform }: { platform: InfluencerPlatformRead }) {
  const insight = platform.audienceInsight;
  const ageEntries = insight
    ? Object.entries(insight.ageGroups)
        .filter(([, v]) => Number(v) > 0)
        .sort(([a], [b]) => AGE_GROUP_ORDER.indexOf(a) - AGE_GROUP_ORDER.indexOf(b))
    : [];
  const genderData = insight
    ? [
        { name: "Female", value: Number(insight.genderFemalePercent) },
        { name: "Male", value: Number(insight.genderMalePercent) },
        { name: "Other", value: Number(insight.genderOtherPercent) },
      ].filter((d) => d.value > 0)
    : [];
  const countries = platform.audienceLocations.filter((l) => l.level === "COUNTRY");
  const cities = platform.audienceLocations.filter((l) => l.level === "CITY");

  const engagementData = [
    { name: "Avg. likes", value: platform.avgLikes },
    { name: "Avg. comments", value: platform.avgComments },
    { name: "Avg. shares", value: platform.avgShares },
    { name: "Avg. views", value: platform.avgViews },
  ];
  const reachData = [
    { name: "Account reach", value: platform.accountReach },
    { name: "Avg. content reach", value: platform.avgReach },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 p-5">
          <p className="text-label uppercase text-neutral-400">Followers</p>
          <p className="mt-2 text-h4 font-semibold text-heading">{formatCompactNumber(platform.followers)}</p>
        </div>
        <ChartCard title="Engagement rate">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="70%"
              outerRadius="100%"
              data={[{ name: "Engagement", value: Math.min(100, Number(platform.engagementRate)) }]}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar dataKey="value" cornerRadius={8} fill={PALETTE[0]} background={{ fill: "#f1f5f9" }} />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-heading text-lg font-semibold">
                {formatEngagementRate(platform.engagementRate)}
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartCard>
        <div className="sm:col-span-2">
          <ChartCard title="Reach">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reachData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatCompactNumber} />
                <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={120} />
                <Tooltip formatter={(v: number) => formatCompactNumber(v)} />
                <Bar dataKey="value" fill={PALETTE[1]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      <ChartCard title="Engagement breakdown">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={engagementData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} tickFormatter={formatCompactNumber} />
            <Tooltip formatter={(v: number) => formatCompactNumber(v)} />
            <Bar dataKey="value" fill={PALETTE[2]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div>
        <h3 className="text-label uppercase tracking-wide text-neutral-400">Audience</h3>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard title="Audience by gender" empty={genderData.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {genderData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Audience by age" empty={ageEntries.length === 0}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageEntries.map(([group, value]) => ({ group, value: Number(value) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="group" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} width={36} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="value" fill={PALETTE[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <AudienceGeoCard
            countries={countries.map((l) => ({ name: l.name, value: Number(l.percentage) }))}
            cities={cities.map((l) => ({ name: l.name, value: Number(l.percentage) }))}
            color={PALETTE[4]!}
          />
        </div>
      </div>
    </div>
  );
}

function PlatformEditForm({
  draft,
  setDraft,
}: {
  draft: InfluencerPlatformInput;
  setDraft: React.Dispatch<React.SetStateAction<InfluencerPlatformInput>>;
}) {
  function set<K extends keyof InfluencerPlatformInput>(key: K, value: InfluencerPlatformInput[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function setInsight<K extends keyof NonNullable<InfluencerPlatformInput["audienceInsight"]>>(
    key: K,
    value: NonNullable<InfluencerPlatformInput["audienceInsight"]>[K],
  ) {
    setDraft((d) => ({
      ...d,
      audienceInsight: { genderMalePercent: 0, genderFemalePercent: 0, genderOtherPercent: 0, ageGroups: {}, ...d.audienceInsight, [key]: value },
    }));
  }

  function setAgeGroup(group: string, value: number) {
    setDraft((d) => {
      const base = { genderMalePercent: 0, genderFemalePercent: 0, genderOtherPercent: 0, ageGroups: {}, ...d.audienceInsight };
      return { ...d, audienceInsight: { ...base, ageGroups: { ...base.ageGroups, [group]: value } } };
    });
  }

  const locations = draft.audienceLocations ?? [];
  function setLocations(next: NonNullable<InfluencerPlatformInput["audienceLocations"]>) {
    set("audienceLocations", next);
  }

  const preview = previewEngagementRate(draft);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-body-sm font-semibold text-heading">Platform</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Platform</Label>
            <Select value={draft.platform} onValueChange={(v) => set("platform", v as InfluencerPlatformInput["platform"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INFLUENCER_SOCIAL_PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {platformLabel(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Handle</Label>
            <Input value={draft.handle ?? ""} onChange={(e) => set("handle", e.target.value)} placeholder="username" />
          </div>
          <div className="sm:col-span-2">
            <Label>Profile URL</Label>
            <Input value={draft.profileUrl ?? ""} onChange={(e) => set("profileUrl", e.target.value)} placeholder="https://" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Switch checked={draft.isPrimary} onCheckedChange={(v) => set("isPrimary", v)} />
          <Label className="font-normal">Primary platform</Label>
        </div>
      </div>

      <div>
        <h4 className="text-body-sm font-semibold text-heading">Stats</h4>
        <p className="mt-1 text-body-sm text-neutral-500">
          Engagement rate is calculated automatically from the numbers below — not entered directly.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Followers</Label>
            <Input type="number" min={0} value={draft.followers || ""} onChange={(e) => set("followers", Number(e.target.value))} />
          </div>
          <div>
            <Label>Following</Label>
            <Input type="number" min={0} value={draft.following || ""} onChange={(e) => set("following", Number(e.target.value))} />
          </div>
          <div>
            <Label>Posts</Label>
            <Input type="number" min={0} value={draft.posts || ""} onChange={(e) => set("posts", Number(e.target.value))} />
          </div>
          <div>
            <Label>Avg. likes</Label>
            <Input type="number" min={0} value={draft.avgLikes || ""} onChange={(e) => set("avgLikes", Number(e.target.value))} />
          </div>
          <div>
            <Label>Avg. comments</Label>
            <Input type="number" min={0} value={draft.avgComments || ""} onChange={(e) => set("avgComments", Number(e.target.value))} />
          </div>
          <div>
            <Label>Avg. shares</Label>
            <Input type="number" min={0} value={draft.avgShares || ""} onChange={(e) => set("avgShares", Number(e.target.value))} />
          </div>
          <div>
            <Label>Avg. views</Label>
            <Input type="number" min={0} value={draft.avgViews || ""} onChange={(e) => set("avgViews", Number(e.target.value))} />
          </div>
          <div>
            <Label>Avg. saves</Label>
            <Input type="number" min={0} value={draft.avgSaves || ""} onChange={(e) => set("avgSaves", Number(e.target.value))} />
          </div>
          <div>
            <Label>Account reach</Label>
            <Input type="number" min={0} value={draft.accountReach || ""} onChange={(e) => set("accountReach", Number(e.target.value))} />
          </div>
          <div>
            <Label>Avg. content reach</Label>
            <Input type="number" min={0} value={draft.avgReach || ""} onChange={(e) => set("avgReach", Number(e.target.value))} />
          </div>
        </div>
        <p className="mt-3 text-body-sm text-neutral-500">
          Engagement rate preview: <span className="font-medium text-heading">{formatEngagementRate(preview)}</span>
        </p>
      </div>

      <div>
        <h4 className="text-body-sm font-semibold text-heading">Audience by gender (%)</h4>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <Label>Female</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={draft.audienceInsight?.genderFemalePercent || ""}
              onChange={(e) => setInsight("genderFemalePercent", Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Male</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={draft.audienceInsight?.genderMalePercent || ""}
              onChange={(e) => setInsight("genderMalePercent", Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Other</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={draft.audienceInsight?.genderOtherPercent || ""}
              onChange={(e) => setInsight("genderOtherPercent", Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-body-sm font-semibold text-heading">Audience by age (%)</h4>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {AGE_GROUP_ORDER.map((group) => (
            <div key={group}>
              <Label>{group}</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={draft.audienceInsight?.ageGroups[group] || ""}
                onChange={(e) => setAgeGroup(group, Number(e.target.value))}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-body-sm font-semibold text-heading">Audience by country / city (%)</h4>
        <div className="mt-3 space-y-3">
          {locations.map((loc, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_1fr_auto] items-end gap-2">
              <div>
                <Label>Type</Label>
                <Select value={loc.level} onValueChange={(v) => setLocations(locations.map((l, idx) => (idx === i ? { ...l, level: v as (typeof LOCATION_LEVELS)[number] } : l)))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_LEVELS.map((lvl) => (
                      <SelectItem key={lvl} value={lvl}>
                        {lvl === "COUNTRY" ? "Country" : "City"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Name</Label>
                <Input value={loc.name} onChange={(e) => setLocations(locations.map((l, idx) => (idx === i ? { ...l, name: e.target.value } : l)))} />
              </div>
              <div>
                <Label>%</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={loc.percentage || ""}
                  onChange={(e) => setLocations(locations.map((l, idx) => (idx === i ? { ...l, percentage: Number(e.target.value) } : l)))}
                />
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setLocations(locations.filter((_, idx) => idx !== i))}>
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLocations([...locations, { level: "COUNTRY", name: "", percentage: 0 }])}
          >
            Add location
          </Button>
        </div>
      </div>
    </div>
  );
}
