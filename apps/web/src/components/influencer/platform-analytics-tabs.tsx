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
import { Card, CardContent, CardHeader, CardTitle, SocialIcon, Tabs, TabsContent, TabsList, TabsTrigger } from "@agency/ui";
import type { InfluencerPlatformRead } from "@/lib/influencer-types";
import { formatCompactNumber, formatEngagementRate, platformIconId, platformLabel } from "@/lib/influencer-format";
import { AGE_GROUP_ORDER } from "./audience-insights";
import { AudienceGeoCard } from "./audience-geo-card";

const PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899", "#84cc16", "#94a3b8"];

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-5">
      <p className="text-label uppercase text-neutral-400">{label}</p>
      <p className="mt-2 text-h4 font-semibold text-heading">{value}</p>
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

  const reachData = [
    { name: "Account reach", value: platform.accountReach },
    { name: "Avg. content reach", value: platform.avgReach },
  ];

  const hasAudienceData = genderData.length > 0 || ageEntries.length > 0 || countries.length > 0 || cities.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Followers" value={formatCompactNumber(platform.followers)} />
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
        <div className="sm:col-span-2 lg:col-span-2">
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

      {hasAudienceData && (
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
                  <Bar dataKey="value" fill={PALETTE[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <AudienceGeoCard
              countries={countries.map((l) => ({ name: l.name, value: Number(l.percentage) }))}
              cities={cities.map((l) => ({ name: l.name, value: Number(l.percentage) }))}
              color={PALETTE[3]!}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function PlatformAnalyticsTabs({ platforms }: { platforms: InfluencerPlatformRead[] }) {
  if (platforms.length === 0) return null;

  return (
    <Tabs defaultValue={platforms[0]!.id}>
      <TabsList>
        {platforms.map((p) => {
          const iconId = platformIconId(p.platform);
          return (
            <TabsTrigger key={p.id} value={p.id} className="flex items-center gap-2">
              {iconId ? <SocialIcon platform={iconId} className="size-4" /> : null}
              {platformLabel(p.platform)}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {platforms.map((p) => (
        <TabsContent key={p.id} value={p.id} className="mt-6">
          <PlatformPanel platform={p} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
