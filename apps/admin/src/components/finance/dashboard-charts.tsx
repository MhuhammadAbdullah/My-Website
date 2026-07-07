"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@agency/ui";
import { formatMoney } from "@/lib/currency";

export interface ChartsResponse {
  monthlyRevenue: { label: string; revenue: number }[];
  revenueByProject: { label: string; revenue: number }[];
  revenueByClient: { label: string; revenue: number }[];
  invoiceStatusDistribution: { status: string; count: number }[];
  paymentMethodDistribution: { method: string; count: number; amount: number }[];
  conversionRate: { totalQuotations: number; convertedQuotations: number; rate: number };
  outstandingTrend: { label: string; outstanding: number }[];
}

const PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#ec4899", "#84cc16", "#94a3b8"];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

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
          <div className="flex h-64 items-center justify-center text-body-sm text-neutral-400">No data for this period.</div>
        ) : (
          <div className="h-64 w-full">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardCharts({ data, loading, currency }: { data: ChartsResponse | null; loading: boolean; currency: string }) {
  const tooltipFormatter = (value: number) => formatMoney(value, currency, { maximumFractionDigits: 0 });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Revenue over time" loading={loading} empty={data?.monthlyRevenue.every((d) => d.revenue === 0)}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.monthlyRevenue ?? []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} width={48} />
            <Tooltip formatter={tooltipFormatter} />
            <Bar dataKey="revenue" fill={PALETTE[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Outstanding payments trend" loading={loading} empty={data?.outstandingTrend.every((d) => d.outstanding === 0)}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data?.outstandingTrend ?? []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis fontSize={11} tickLine={false} axisLine={false} width={48} />
            <Tooltip formatter={tooltipFormatter} />
            <Line type="monotone" dataKey="outstanding" stroke={PALETTE[3]} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Revenue by project" loading={loading} empty={!data?.revenueByProject.length}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.revenueByProject ?? []} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="label" fontSize={10} tickLine={false} axisLine={false} width={110} />
            <Tooltip formatter={tooltipFormatter} />
            <Bar dataKey="revenue" fill={PALETTE[1]} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Revenue by client" loading={loading} empty={!data?.revenueByClient.length}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.revenueByClient ?? []} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="label" fontSize={10} tickLine={false} axisLine={false} width={110} />
            <Tooltip formatter={tooltipFormatter} />
            <Bar dataKey="revenue" fill={PALETTE[4]} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Invoice status distribution" loading={loading} empty={!data?.invoiceStatusDistribution.length}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={(data?.invoiceStatusDistribution ?? []).map((d) => ({ name: STATUS_LABELS[d.status] ?? d.status, value: d.count }))}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
            >
              {(data?.invoiceStatusDistribution ?? []).map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Payment method distribution" loading={loading} empty={!data?.paymentMethodDistribution.length}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={(data?.paymentMethodDistribution ?? []).map((d) => ({ name: d.method.replace("_", " "), value: d.amount }))}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
            >
              {(data?.paymentMethodDistribution ?? []).map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip formatter={tooltipFormatter} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-h5">Quotation → invoice conversion</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <p className="text-h1 font-semibold text-heading">{(data?.conversionRate.rate ?? 0).toFixed(1)}%</p>
              <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-accent-500"
                  style={{ width: `${Math.min(100, data?.conversionRate.rate ?? 0)}%` }}
                />
              </div>
              <p className="text-body-sm text-neutral-500">
                {data?.conversionRate.convertedQuotations ?? 0} of {data?.conversionRate.totalQuotations ?? 0} quotations converted
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
