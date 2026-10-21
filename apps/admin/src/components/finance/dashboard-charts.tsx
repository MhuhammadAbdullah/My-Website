"use client";

import * as React from "react";
import Link from "next/link";
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
import { Skeleton } from "@agency/ui";
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

const ACCENT = "var(--accent)";
// Series colours: the site accent (e.g. orange) first, then black/white text colour, then greys and orange shades.
const tint = (accentPercent: number, other: string) => `color-mix(in oklab, var(--accent) ${accentPercent}%, ${other})`;
const PALETTE = [
  "var(--accent)",
  "var(--color-heading)",
  "var(--color-neutral-500)",
  tint(65, "white"),
  "var(--color-neutral-400)",
  tint(75, "black"),
  "var(--color-neutral-300)",
  "var(--color-neutral-700)",
  tint(40, "white"),
];
const GRID = "var(--color-neutral-200)";
const TICK = { fill: "var(--color-neutral-400)", fontSize: 11 };

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
};

const tooltipProps = {
  contentStyle: { background: "var(--color-neutral-100)", border: "1px solid var(--color-neutral-300)", borderRadius: 12, fontSize: 12, color: "var(--color-heading)" },
  labelStyle: { color: "var(--color-heading)", fontWeight: 700 },
  itemStyle: { color: "var(--color-heading)" },
  cursor: { fill: "rgb(255 255 255 / 0.04)" },
} as const;

// Empty charts keep their footprint: faint ghost bars, a one-line reason and a shortcut to fix it.
const GHOST = [28, 58, 40, 74, 52, 84];

function GhostBars() {
  return (
    <div className="flex h-full items-end gap-3 border-b border-neutral-200 px-1" aria-hidden>
      {GHOST.map((h, i) => (
        <span key={i} className="flex-1 rounded-t-sm bg-neutral-100" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

function ChartCard({
  title,
  loading,
  empty,
  emptyText,
  cta,
  children,
}: {
  title: string;
  loading: boolean;
  empty?: boolean;
  emptyText: string;
  cta: { label: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[8px] border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
      <h3 className="font-heading text-[1.0625rem] font-extrabold tracking-tight text-heading">{title}</h3>
      <div className="mt-5 h-44">
        {loading ? <Skeleton className="h-full w-full" /> : empty ? <GhostBars /> : children}
      </div>
      {!loading && empty && (
        <div className="mt-4 flex items-center justify-between gap-3 text-[13px]">
          <span className="text-neutral-400">{emptyText}</span>
          <Link href={cta.href} className="shrink-0 font-bold text-accent-500 hover:underline">
            {cta.label} →
          </Link>
        </div>
      )}
    </section>
  );
}

export function DashboardCharts({ data, loading, currency }: { data: ChartsResponse | null; loading: boolean; currency: string }) {
  const money = (value: unknown) => formatMoney(Number(value), currency, { maximumFractionDigits: 0 });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Revenue over time"
        loading={loading}
        empty={!data || data.monthlyRevenue.every((d) => d.revenue === 0)}
        emptyText="No revenue in this period."
        cta={{ label: "Create invoice", href: "/finance/invoices/new" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.monthlyRevenue ?? []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} width={48} />
            <Tooltip {...tooltipProps} formatter={money} />
            <Bar dataKey="revenue" fill={ACCENT} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Outstanding payments trend"
        loading={loading}
        empty={!data || data.outstandingTrend.every((d) => d.outstanding === 0)}
        emptyText="Nothing outstanding."
        cta={{ label: "View invoices", href: "/finance/invoices" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data?.outstandingTrend ?? []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} />
            <YAxis tick={TICK} tickLine={false} axisLine={false} width={48} />
            <Tooltip {...tooltipProps} formatter={money} />
            <Line type="monotone" dataKey="outstanding" stroke={PALETTE[1]} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Revenue by project"
        loading={loading}
        empty={!data?.revenueByProject.length}
        emptyText="Link invoices to projects to see this."
        cta={{ label: "Add project", href: "/portfolio?new=1" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.revenueByProject ?? []} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
            <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="label" tick={{ ...TICK, fontSize: 10 }} tickLine={false} axisLine={false} width={110} />
            <Tooltip {...tooltipProps} formatter={money} />
            <Bar dataKey="revenue" fill={PALETTE[0]} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Revenue by client"
        loading={loading}
        empty={!data?.revenueByClient.length}
        emptyText="No paid invoices yet."
        cta={{ label: "View clients", href: "/finance/clients" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.revenueByClient ?? []} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={GRID} />
            <XAxis type="number" tick={TICK} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="label" tick={{ ...TICK, fontSize: 10 }} tickLine={false} axisLine={false} width={110} />
            <Tooltip {...tooltipProps} formatter={money} />
            <Bar dataKey="revenue" fill={PALETTE[0]} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Invoice status distribution"
        loading={loading}
        empty={!data?.invoiceStatusDistribution.length}
        emptyText="No invoices in this period."
        cta={{ label: "New invoice", href: "/finance/invoices/new" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={(data?.invoiceStatusDistribution ?? []).map((d) => ({ name: STATUS_LABELS[d.status] ?? d.status, value: d.count }))}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={2}
              stroke="none"
            >
              {(data?.invoiceStatusDistribution ?? []).map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipProps} />
            <Legend wrapperStyle={{ fontSize: 11, color: "var(--color-neutral-500)" }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Payment method distribution"
        loading={loading}
        empty={!data?.paymentMethodDistribution.length}
        emptyText="No payments recorded."
        cta={{ label: "Record payment", href: "/finance/payments" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={(data?.paymentMethodDistribution ?? []).map((d) => ({ name: d.method.replace("_", " "), value: d.amount }))}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={2}
              stroke="none"
            >
              {(data?.paymentMethodDistribution ?? []).map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipProps} formatter={money} />
            <Legend wrapperStyle={{ fontSize: 11, color: "var(--color-neutral-500)" }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
