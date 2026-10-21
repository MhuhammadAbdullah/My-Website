"use client";

import * as React from "react";
import { AnimatedNumber } from "@/components/influencer/animated-number";
import { AXIS_TICK, CHART_PALETTE, GRID, LEGEND_STYLE, TOOLTIP } from "@/lib/chart-theme";
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

const PALETTE = CHART_PALETTE;

function ChartCard({ title, empty, children, delay = 0 }: { title: string; empty?: boolean; children: React.ReactNode; delay?: number }) {
  return (
    <div className="fade-up h-full" style={{ ["--d" as string]: `${delay}s` }}>
    <Card className="h-full">
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
    </div>
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
        <ChartCard delay={0} title="Followers">
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="font-heading text-[clamp(3rem,2rem+3vw,4.5rem)] font-extrabold leading-none tracking-tight text-heading"><AnimatedNumber value={formatCompactNumber(platform.followers)} /></p>
            <p className="mt-2 text-body-sm text-neutral-500">on this platform</p>
          </div>
        </ChartCard>
        <ChartCard delay={0.08} title="Engagement rate">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              innerRadius="70%"
              outerRadius="100%"
              data={[{ name: "Engagement", value: Math.min(100, Number(platform.engagementRate)) }]}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar dataKey="value" cornerRadius={8} fill={PALETTE[0]} background={{ fill: "var(--color-neutral-100)" }} />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-heading text-lg font-semibold">
                <AnimatedNumber value={formatEngagementRate(platform.engagementRate)} />
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartCard>
        <div className="sm:col-span-2 lg:col-span-2">
          <ChartCard delay={0.16} title="Reach">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reachData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
                <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={formatCompactNumber} />
                <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={120} />
                <Tooltip {...TOOLTIP} formatter={(v) => formatCompactNumber(Number(v))} />
                <Bar dataKey="value" fill={PALETTE[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {hasAudienceData && (
        <div>
          <h3 className="text-label uppercase tracking-wide text-neutral-400">Audience</h3>
          <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard delay={0} title="Audience by gender" empty={genderData.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {genderData.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...TOOLTIP} formatter={(v) => `${v}%`} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard delay={0.08} title="Audience by age" empty={ageEntries.length === 0}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageEntries.map(([group, value]) => ({ group, value: Number(value) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
                  <XAxis dataKey="group" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={36} />
                  <Tooltip {...TOOLTIP} formatter={(v) => `${v}%`} />
                  <Bar dataKey="value" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <AudienceGeoCard
              countries={countries.map((l) => ({ name: l.name, value: Number(l.percentage) }))}
              cities={cities.map((l) => ({ name: l.name, value: Number(l.percentage) }))}
              color={PALETTE[0]!}
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
