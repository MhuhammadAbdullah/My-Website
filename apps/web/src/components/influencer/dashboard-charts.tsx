"use client";

import * as React from "react";
import { AXIS_TICK, CHART_PALETTE, GRID, LEGEND_STYLE, TOOLTIP } from "@/lib/chart-theme";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@agency/ui";
import { BOOKING_STATUS_LABELS, type BookingStatusId } from "@agency/types";
import type { InfluencerPlatformRead } from "@/lib/influencer-types";
import { platformLabel } from "@/lib/influencer-format";

export interface DashboardChartsData {
  monthlyEarnings: { month: string; amount: number }[];
  monthlyBookings: { month: string; count: number }[];
  bookingsByStatus: { status: string; count: number }[];
}

const PALETTE = CHART_PALETTE;

function ChartCard({ title, loading, empty, children, delay = 0 }: { title: string; loading: boolean; empty?: boolean; children: React.ReactNode; delay?: number }) {
  return (
    <div className="fade-up h-full" style={{ ["--d" as string]: `${delay}s` }}>
    <Card className="h-full">
      <CardHeader className="pb-0">
        <CardTitle className="text-h5">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : empty ? (
          <div className="flex h-64 items-center justify-center text-body-sm text-neutral-400">No data yet.</div>
        ) : (
          <div className="h-64 w-full">{children}</div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

export function DashboardCharts({
  data,
  loading,
  platforms,
}: {
  data: DashboardChartsData | null;
  loading: boolean;
  platforms: InfluencerPlatformRead[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard delay={0.25} title="Earnings trend" loading={loading} empty={data?.monthlyEarnings.every((d) => d.amount === 0)}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.monthlyEarnings ?? []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
            <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
            <Tooltip {...TOOLTIP} />
            <Bar dataKey="amount" name="Earnings" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard delay={0.33} title="Monthly bookings" loading={loading} empty={data?.monthlyBookings.every((d) => d.count === 0)}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.monthlyBookings ?? []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
            <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
            <Tooltip {...TOOLTIP} />
            <Bar dataKey="count" name="Bookings" fill={PALETTE[1]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard delay={0.41} title="Bookings by status" loading={loading} empty={!data?.bookingsByStatus.length}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={(data?.bookingsByStatus ?? []).map((d) => ({
                name: BOOKING_STATUS_LABELS[d.status as BookingStatusId] ?? d.status,
                value: d.count,
              }))}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
            >
              {(data?.bookingsByStatus ?? []).map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP} />
            <Legend wrapperStyle={LEGEND_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard delay={0.49} title="Platform audience distribution" loading={loading} empty={platforms.length === 0}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={platforms.map((p) => ({ name: platformLabel(p.platform), value: p.followers }))}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
            >
              {platforms.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP} />
            <Legend wrapperStyle={LEGEND_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
