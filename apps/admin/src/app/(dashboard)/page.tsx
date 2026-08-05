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
  UserCheck,
  Users,
  CalendarClock,
  Percent,
  Banknote,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Heading, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { formatMoney } from "@/lib/currency";
import { DEFAULT_CURRENCY } from "@agency/types";
import { DateRangeFilter, type DateRangeValue } from "@/components/finance/date-range-filter";
import { DashboardCharts, type ChartsResponse } from "@/components/finance/dashboard-charts";

interface InfluencerDashboardStats {
  pendingApplications: number;
  approvedInfluencers: number;
  totalBookings: number;
  bookingsThisMonth: number;
  totalRevenue: number;
  totalCommission: number;
  pendingPayouts: number;
  topInfluencers: { id: string; name: string; username: string | null; revenue: number }[];
  topCategories: { id: string; name: string; count: number }[];
  monthlyGrowth: { month: string; bookings: number; revenue: number }[];
  flags: { marketplaceEnabled: boolean; registrationEnabled: boolean; bookingsEnabled: boolean };
}

// Brief §29 asks for a 🟢/🟡/🔴 tri-state indicator, but each underlying
// flag is a plain boolean (no "limited" state the API actually tracks) --
// mapping straight to Enabled/Disabled rather than fabricating a third
// state with nothing real behind it.
function FlagStatus({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
      <span className="text-body-sm font-medium text-heading">{label}</span>
      <Badge variant={enabled ? "success" : "error"}>{enabled ? "🟢 Enabled" : "🔴 Disabled"}</Badge>
    </div>
  );
}

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
  defaultCurrency: string;
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
  const currency = finance?.defaultCurrency ?? DEFAULT_CURRENCY;

  const { data: influencerStats, loading: influencerStatsLoading } = useAsyncData<InfluencerDashboardStats>(
    () => request<InfluencerDashboardStats>("/influencer-dashboard/admin/stats"),
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
        <StatCard
          label="Total revenue"
          value={formatMoney(finance?.totalRevenue ?? 0, currency, { maximumFractionDigits: 0 })}
          icon={DollarSign}
          loading={financeLoading}
          tone="success"
        />
        <StatCard
          label="Pending revenue"
          value={formatMoney(finance?.pendingRevenue ?? 0, currency, { maximumFractionDigits: 0 })}
          icon={Clock}
          loading={financeLoading}
          tone="warning"
        />
        <StatCard
          label="Outstanding payments"
          value={formatMoney(finance?.outstandingPayments ?? 0, currency, { maximumFractionDigits: 0 })}
          icon={AlertTriangle}
          loading={financeLoading}
          tone="error"
        />
        <StatCard
          label="Payments received this month"
          value={formatMoney(finance?.paymentsThisMonth ?? 0, currency, { maximumFractionDigits: 0 })}
          icon={TrendingUp}
          loading={financeLoading}
          tone="success"
        />
        <StatCard label="Total quotations" value={finance?.totalQuotations ?? 0} icon={FileText} loading={financeLoading} />
        <StatCard label="Total invoices" value={finance?.totalInvoices ?? 0} icon={Receipt} loading={financeLoading} />
        <StatCard label="Paid invoices" value={finance?.paidInvoices ?? 0} icon={CheckCircle2} loading={financeLoading} tone="success" />
        <StatCard label="Overdue invoices" value={finance?.overdueInvoices ?? 0} icon={AlertTriangle} loading={financeLoading} tone="error" />
        <StatCard label="Number of clients" value={finance?.totalClients ?? 0} icon={Building2} loading={financeLoading} />
        <StatCard
          label="Average invoice value"
          value={formatMoney(finance?.averageInvoiceValue ?? 0, currency, { maximumFractionDigits: 0 })}
          icon={Wallet}
          loading={financeLoading}
        />
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
        <DashboardCharts data={charts} loading={chartsLoading} currency={currency} />
      </div>

      <Heading level={3} className="mt-10">
        Influencer Marketplace
      </Heading>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <FlagStatus label="Marketplace" enabled={influencerStats?.flags.marketplaceEnabled ?? true} />
        <FlagStatus label="Registrations" enabled={influencerStats?.flags.registrationEnabled ?? true} />
        <FlagStatus label="Client bookings" enabled={influencerStats?.flags.bookingsEnabled ?? true} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending applications" value={influencerStats?.pendingApplications ?? 0} icon={UserCheck} loading={influencerStatsLoading} tone="warning" />
        <StatCard label="Approved influencers" value={influencerStats?.approvedInfluencers ?? 0} icon={Users} loading={influencerStatsLoading} />
        <StatCard label="Bookings this month" value={influencerStats?.bookingsThisMonth ?? 0} icon={CalendarClock} loading={influencerStatsLoading} />
        <StatCard
          label="Marketplace revenue"
          value={formatMoney(influencerStats?.totalRevenue ?? 0, currency, { maximumFractionDigits: 0 })}
          icon={DollarSign}
          loading={influencerStatsLoading}
          tone="success"
        />
        <StatCard
          label="Commission earned"
          value={formatMoney(influencerStats?.totalCommission ?? 0, currency, { maximumFractionDigits: 0 })}
          icon={Percent}
          loading={influencerStatsLoading}
          tone="success"
        />
        <StatCard
          label="Pending payouts"
          value={formatMoney(influencerStats?.pendingPayouts ?? 0, currency, { maximumFractionDigits: 0 })}
          icon={Banknote}
          loading={influencerStatsLoading}
          tone="warning"
        />
        <StatCard label="Total bookings" value={influencerStats?.totalBookings ?? 0} icon={CalendarClock} loading={influencerStatsLoading} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-h5">Top influencers by revenue</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {influencerStatsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : !influencerStats || influencerStats.topInfluencers.length === 0 ? (
              <p className="py-8 text-center text-body-sm text-neutral-400">No completed bookings yet.</p>
            ) : (
              <div className="space-y-2">
                {influencerStats.topInfluencers.map((inf) => (
                  <div key={inf.id} className="flex items-center justify-between text-body-sm">
                    <span className="text-heading">{inf.username ? `@${inf.username}` : inf.name}</span>
                    <span className="font-medium text-heading">{formatMoney(inf.revenue, currency, { maximumFractionDigits: 0 })}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-h5">Top categories</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {influencerStatsLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : !influencerStats || influencerStats.topCategories.length === 0 ? (
              <p className="py-8 text-center text-body-sm text-neutral-400">No categories yet.</p>
            ) : (
              <div className="space-y-2">
                {influencerStats.topCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between text-body-sm">
                    <span className="text-heading">{cat.name}</span>
                    <span className="font-medium text-heading">{cat.count} influencer{cat.count === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-h5">Monthly growth</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {influencerStatsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={influencerStats?.monthlyGrowth ?? []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} width={40} />
                    <Tooltip />
                    <Bar dataKey="bookings" name="Completed bookings" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
