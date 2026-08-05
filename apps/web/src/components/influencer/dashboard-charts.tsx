"use client";

import * as React from "react";
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

const PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899", "#84cc16", "#94a3b8"];

function ChartCard({ title, loading, empty, children }: { title: string; loading: boolean; empty?: boolean; children: React.ReactNode }) {
  return (
    <Card>
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
      <ChartCard title="Earnings trend" loading={loading} empty={data?.monthlyEarnings.every((d) => d.amount === 0)}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.monthlyEarnings ?? []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} width={48} />
            <Tooltip />
            <Bar dataKey="amount" name="Earnings" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Monthly bookings" loading={loading} empty={data?.monthlyBookings.every((d) => d.count === 0)}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.monthlyBookings ?? []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
            <Tooltip />
            <Bar dataKey="count" name="Bookings" fill={PALETTE[1]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Bookings by status" loading={loading} empty={!data?.bookingsByStatus.length}>
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
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Platform audience distribution" loading={loading} empty={platforms.length === 0}>
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
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
