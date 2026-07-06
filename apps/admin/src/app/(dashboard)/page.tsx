"use client";

import * as React from "react";
import {
  Briefcase,
  FolderKanban,
  Mail,
  Quote,
  DollarSign,
  Clock,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Wallet,
  Building2,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Heading, Card, CardContent, Skeleton } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { DateRangeFilter, type DateRangeValue } from "@/components/finance/date-range-filter";
import { DashboardCharts, type ChartsResponse } from "@/components/finance/dashboard-charts";

interface DashboardCounts {
  services: number;
  projects: number;
  testimonials: number;
  submissions: number;
}

interface FinanceStats {
  totalRevenue: number;
  pendingRevenue: number;
  outstandingPayments: number;
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalQuotations: number;
  totalClients: number;
  paymentsThisMonth: number;
  averageInvoiceValue: number;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  tone = "accent",
}: {
  label: string;
  value: string | number;
  icon: typeof Briefcase;
  loading: boolean;
  tone?: "accent" | "success" | "warning" | "error";
}) {
  const toneClasses = {
    accent: "bg-accent-50 text-accent-600",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    error: "bg-error-50 text-error-600",
  }[tone];

  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <p className="text-body-sm text-neutral-500">{label}</p>
          {loading ? <Skeleton className="mt-2 h-8 w-16" /> : <p className="mt-1 text-h4 font-semibold text-heading">{value}</p>}
        </div>
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${toneClasses}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, loading } = useAsyncData<DashboardCounts>(async () => {
    // All four endpoints are paginated now — `total` is the accurate count of
    // every row regardless of page size, unlike `items.length` (page-sized).
    const [services, projects, testimonials, submissions] = await Promise.all([
      request<{ total: number }>("/services/admin?limit=1"),
      request<{ total: number }>("/projects/admin?limit=1"),
      request<{ total: number }>("/testimonials/admin?limit=1"),
      request<{ total: number }>("/contact?limit=1"),
    ]);
    return {
      services: services.total,
      projects: projects.total,
      testimonials: testimonials.total,
      submissions: submissions.total,
    };
  }, []);

  const { data: finance, loading: financeLoading } = useAsyncData<FinanceStats>(
    () => request<FinanceStats>("/finance/dashboard"),
    [],
  );

  const [range, setRange] = React.useState<DateRangeValue>({ preset: "month", from: "", to: "" });

  const { data: charts, loading: chartsLoading } = useAsyncData<ChartsResponse>(() => {
    const params = new URLSearchParams({ range: range.preset });
    if (range.preset === "custom") {
      if (range.from) params.set("from", range.from);
      if (range.to) params.set("to", range.to);
    }
    return request<ChartsResponse>(`/finance/dashboard/charts?${params.toString()}`);
  }, [range.preset, range.from, range.to]);

  return (
    <div>
      <Heading level={2}>Dashboard</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">A complete overview of the business — content and finance.</p>

      <Heading level={3} className="mt-8">
        Content
      </Heading>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Services" value={data?.services ?? 0} icon={Briefcase} loading={loading} />
        <StatCard label="Portfolio projects" value={data?.projects ?? 0} icon={FolderKanban} loading={loading} />
        <StatCard label="Testimonials" value={data?.testimonials ?? 0} icon={Quote} loading={loading} />
        <StatCard label="New contact submissions" value={data?.submissions ?? 0} icon={Mail} loading={loading} />
      </div>

      <Heading level={3} className="mt-10">
        Finance overview
      </Heading>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total revenue" value={formatMoney(finance?.totalRevenue ?? 0)} icon={DollarSign} loading={financeLoading} tone="success" />
        <StatCard label="Pending revenue" value={formatMoney(finance?.pendingRevenue ?? 0)} icon={Clock} loading={financeLoading} tone="warning" />
        <StatCard label="Outstanding payments" value={formatMoney(finance?.outstandingPayments ?? 0)} icon={AlertTriangle} loading={financeLoading} tone="error" />
        <StatCard label="Payments received this month" value={formatMoney(finance?.paymentsThisMonth ?? 0)} icon={TrendingUp} loading={financeLoading} tone="success" />
        <StatCard label="Total quotations" value={finance?.totalQuotations ?? 0} icon={FileText} loading={financeLoading} />
        <StatCard label="Total invoices" value={finance?.totalInvoices ?? 0} icon={Receipt} loading={financeLoading} />
        <StatCard label="Paid invoices" value={finance?.paidInvoices ?? 0} icon={CheckCircle2} loading={financeLoading} tone="success" />
        <StatCard label="Overdue invoices" value={finance?.overdueInvoices ?? 0} icon={AlertTriangle} loading={financeLoading} tone="error" />
        <StatCard label="Number of clients" value={finance?.totalClients ?? 0} icon={Building2} loading={financeLoading} />
        <StatCard label="Average invoice value" value={formatMoney(finance?.averageInvoiceValue ?? 0)} icon={Wallet} loading={financeLoading} />
      </div>

      <div className="mt-10 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <Heading level={3}>
          <span className="flex items-center gap-2">
            <BarChart3 className="size-5 text-neutral-400" /> Finance analytics
          </span>
        </Heading>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>
      <div className="mt-4">
        <DashboardCharts data={charts} loading={chartsLoading} />
      </div>
    </div>
  );
}
