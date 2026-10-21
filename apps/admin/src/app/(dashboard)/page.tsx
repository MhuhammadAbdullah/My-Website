"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Plus } from "lucide-react";
import { Bar, BarChart, LabelList, ResponsiveContainer, XAxis } from "recharts";
import { Skeleton, cn } from "@agency/ui";
import { DEFAULT_CURRENCY } from "@agency/types";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { formatMoney } from "@/lib/currency";
import { authClient } from "@/lib/auth-client";
import { DashboardCharts, type ChartsResponse } from "@/components/finance/dashboard-charts";
import type { DateRangeValue, RangePreset } from "@/components/finance/date-range-filter";

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

interface DashboardCounts {
  services: number;
  projects: number;
  testimonials: number;
  newSubmissions: number;
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

const RANGES: { value: RangePreset; label: string; long: string }[] = [
  { value: "today", label: "Today", long: "Today" },
  { value: "7days", label: "7 days", long: "Last 7 days" },
  { value: "month", label: "This month", long: "This month" },
  { value: "3months", label: "3 months", long: "Last 3 months" },
  { value: "year", label: "Year", long: "This year" },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good day" : "Good evening";
}

function SectionHead({ title, href, linkLabel, right }: { title: string; href?: string; linkLabel?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="font-heading font-extrabold tracking-tight text-heading" style={{ fontSize: "clamp(1.75rem, 1.2rem + 1.6vw, 2.5rem)", lineHeight: 1 }}>
        {title}
      </h2>
      {right ??
        (href && (
          <Link href={href} className="shrink-0 pb-1 text-[13px] font-bold text-accent-500 hover:underline">
            {linkLabel} →
          </Link>
        ))}
    </div>
  );
}

function Num({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("font-heading font-extrabold leading-none tracking-tight", className)}>{children}</p>;
}

function Tile({
  label,
  value,
  loading,
  href,
  mark,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  loading: boolean;
  href?: string;
  mark?: React.ReactNode;
  accent?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-[12px] font-medium", accent ? "text-on-accent/70" : "text-neutral-500")}>{label}</p>
        {mark}
      </div>
      {loading ? <Skeleton className="mt-6 h-8 w-20" /> : <Num className="mt-6 text-[clamp(1.5rem,1.1rem+1.2vw,2.25rem)]">{value}</Num>}
    </>
  );
  const cls = cn(
    "block rounded-[8px] border p-5 transition-colors",
    accent ? "border-transparent bg-accent-500 text-on-accent" : "border-neutral-200 bg-neutral-50 text-heading",
    href && !accent && "hover:border-accent-500",
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function Mark({ tone }: { tone: "blue" | "lime" | "red" | "green" | "muted" | "arrow" | "approx" }) {
  if (tone === "arrow") return <ArrowUpRight className="size-3.5 text-neutral-400" aria-hidden />;
  if (tone === "green") return <Check className="size-3.5 text-success-500" aria-hidden />;
  if (tone === "red") return <span className="text-[12px] font-extrabold text-error-500">!</span>;
  if (tone === "approx") return <span className="text-[12px] text-neutral-400">≈</span>;
  return <span className={cn("size-2.5 rounded-[3px]", tone === "blue" ? "bg-[#7aa2ff]" : tone === "lime" ? "bg-accent-500" : "bg-neutral-300")} aria-hidden />;
}

function Switch({ on }: { on: boolean }) {
  return (
    <span className={cn("relative inline-block h-6 w-10 shrink-0 rounded-full transition-colors", on ? "bg-accent-500" : "bg-neutral-300")} aria-hidden>
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-background transition-all", on ? "left-[18px]" : "left-0.5")} />
    </span>
  );
}

function FlagCard({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <Link href="/influencers/settings" className="flex items-center justify-between gap-3 rounded-[8px] border border-neutral-200 bg-neutral-50 px-5 py-4 transition-colors hover:border-accent-500">
      <span className="text-[14px] font-bold text-heading">{label}</span>
      <span className="flex items-center gap-3">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-accent-500">{enabled ? "Enabled" : "Disabled"}</span>
        <Switch on={enabled} />
      </span>
    </Link>
  );
}

function AttentionCard({ count, title, note, href, loading, lead, clear }: { count: number; title: string; note: string; href: string; loading: boolean; lead: boolean; clear?: string }) {
  const idle = !loading && count === 0;
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-4 rounded-[8px] border px-5 py-4 transition-colors",
        lead ? "border-transparent bg-accent-500 text-on-accent" : "border-neutral-200 bg-neutral-50 text-heading hover:border-accent-500",
      )}
    >
      {loading ? (
        <Skeleton className="h-9 w-8" />
      ) : (
        <Num className={cn("text-[2.25rem]", idle && "text-neutral-400")}>{count}</Num>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-bold">{title}</span>
        <span className={cn("block truncate text-[12px]", lead ? "text-on-accent/70" : "text-neutral-500")}>{idle ? (clear ?? "All clear") : note}</span>
      </span>
      {idle ? <Check className="size-4 shrink-0 text-neutral-400" aria-hidden /> : <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />}
    </Link>
  );
}

const QUICK_ACTIONS = [
  { label: "New quotation", href: "/finance/quotations/new" },
  { label: "New invoice", href: "/finance/invoices/new" },
  { label: "Add project", href: "/portfolio?new=1" },
  { label: "Add service", href: "/services?new=1" },
  { label: "Invite client", href: "/finance/clients?new=1" },
];

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const firstName = (mounted ? session?.user?.name : undefined)?.split(" ")[0] ?? "";

  const { data, loading } = useAsyncData<DashboardCounts>(async () => {
    // Paginated endpoints: `total` is the row count regardless of page size.
    const [services, projects, testimonials, submissions] = await Promise.all([
      request<{ total: number }>("/services/admin?limit=1"),
      request<{ total: number }>("/projects/admin?limit=1"),
      request<{ total: number }>("/testimonials/admin?limit=1"),
      request<{ total: number }>("/contact?status=NEW&limit=1"),
    ]);
    return { services: services.total, projects: projects.total, testimonials: testimonials.total, newSubmissions: submissions.total };
  }, []);

  const { data: finance, loading: financeLoading } = useAsyncData<FinanceStats>(() => request<FinanceStats>("/finance/dashboard"), []);
  const currency = finance?.defaultCurrency ?? DEFAULT_CURRENCY;
  const money = (n: number) => formatMoney(n, currency, { maximumFractionDigits: 0 });

  const { data: inf, loading: infLoading } = useAsyncData<InfluencerDashboardStats>(() => request<InfluencerDashboardStats>("/influencer-dashboard/admin/stats"), []);

  const [range, setRange] = React.useState<DateRangeValue>({ preset: "month", from: "", to: "" });
  const rangeLabel = RANGES.find((r) => r.value === range.preset)?.long ?? "This month";

  const { data: charts, loading: chartsLoading } = useAsyncData<ChartsResponse>(() => {
    const params = new URLSearchParams({ range: range.preset });
    return request<ChartsResponse>(`/finance/dashboard/charts?${params.toString()}`);
  }, [range.preset]);

  const attention = [
    { count: inf?.pendingApplications ?? 0, title: "Influencer applications", note: "Waiting for your review", href: "/influencers/applications", loading: infLoading, clear: "Nothing waiting" },
    { count: data?.newSubmissions ?? 0, title: "New contact submission", note: "Reply within 1 business day", href: "/analytics", loading: loading, clear: "Inbox is clear" },
    { count: finance?.overdueInvoices ?? 0, title: "Overdue invoices", note: "Follow up on payment", href: "/finance/invoices?status=OVERDUE", loading: financeLoading, clear: "All clear" },
  ];
  const leadIndex = attention.findIndex((a) => !a.loading && a.count > 0);

  const conversion = charts?.conversionRate;
  const maxCategory = Math.max(1, ...(inf?.topCategories ?? []).map((c) => c.count));

  return (
    <div className="mx-auto max-w-[1180px] space-y-14 pb-10">
      {/* ------------------------------------------------------------ hero */}
      <section>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Overview · {rangeLabel}</p>
        <h1 className="mt-3 font-heading font-extrabold tracking-tight text-heading" style={{ fontSize: "clamp(2.25rem, 1rem + 4vw, 4.25rem)", lineHeight: 0.95 }}>
          {greeting()}
          {firstName && (
            <>
              , <span className="text-accent-500">{firstName}.</span>
            </>
          )}
        </h1>
        <p className="mt-4 text-[14px] text-neutral-500">Content, finance and marketplace in one place.</p>

        <div role="group" aria-label="Date range" className="mt-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-neutral-200 bg-neutral-50 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={range.preset === r.value}
              onClick={() => setRange({ preset: r.value, from: "", to: "" })}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors",
                range.preset === r.value ? "bg-accent-500 text-on-accent" : "text-neutral-500 hover:text-heading",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <p className="mt-10 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Needs your attention</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {attention.map((a, i) => (
            <AttentionCard key={a.title} {...a} lead={i === leadIndex} />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((q) => (
            <Link key={q.label} href={q.href} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-[12px] font-bold text-heading transition-colors hover:border-accent-500 hover:text-accent-500">
              <Plus className="size-3" aria-hidden /> {q.label}
            </Link>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- finance */}
      <section className="space-y-4">
        <SectionHead title="Finance" href="/finance/invoices" linkLabel="Open finance" />

        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <div className="rounded-[12px] bg-accent-500 p-6 text-on-accent sm:p-8">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] opacity-70">Total revenue</p>
            {financeLoading ? (
              <Skeleton className="mt-4 h-16 w-64" />
            ) : (
              <Num className="mt-4 break-words text-[clamp(2.5rem,1.2rem+4.6vw,5rem)]">{money(finance?.totalRevenue ?? 0)}</Num>
            )}
            <p className="mt-3 text-[13px] opacity-80">
              {(finance?.totalRevenue ?? 0) > 0 ? "Payments received across all invoices." : "Create your first invoice to start tracking revenue."}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Pending revenue", v: finance?.pendingRevenue ?? 0 },
                { label: "Outstanding", v: finance?.outstandingPayments ?? 0 },
                { label: "Received this month", v: finance?.paymentsThisMonth ?? 0 },
              ].map((s) => (
                <div key={s.label} className="rounded-[8px] bg-black/10 px-4 py-3">
                  <p className="text-[11px] font-medium opacity-70">{s.label}</p>
                  <Num className="mt-1.5 text-[1.25rem]">{financeLoading ? "…" : money(s.v)}</Num>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[12px] border border-neutral-200 bg-neutral-50 p-6">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-neutral-500">Quotation → Invoice</p>
            {chartsLoading ? <Skeleton className="my-6 h-16 w-40" /> : <Num className="my-6 text-[clamp(2.5rem,1.5rem+3vw,4rem)]">{(conversion?.rate ?? 0).toFixed(1)}%</Num>}
            <div>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full rounded-full bg-accent-500 transition-[width] duration-700" style={{ width: `${Math.min(100, conversion?.rate ?? 0)}%` }} />
              </div>
              <p className="mt-3 text-[12px] text-neutral-500">
                {conversion?.convertedQuotations ?? 0} of {conversion?.totalQuotations ?? 0} quotations converted
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Tile label="Total quotations" value={finance?.totalQuotations ?? 0} loading={financeLoading} href="/finance/quotations" mark={<Mark tone="blue" />} />
          <Tile label="Total invoices" value={finance?.totalInvoices ?? 0} loading={financeLoading} href="/finance/invoices" mark={<Mark tone="blue" />} />
          <Tile label="Paid invoices" value={finance?.paidInvoices ?? 0} loading={financeLoading} href="/finance/invoices?status=PAID" mark={<Mark tone="green" />} />
          <Tile label="Overdue invoices" value={finance?.overdueInvoices ?? 0} loading={financeLoading} href="/finance/invoices?status=OVERDUE" mark={<Mark tone="red" />} />
          <Tile label="Number of clients" value={finance?.totalClients ?? 0} loading={financeLoading} href="/finance/clients" mark={<Mark tone="blue" />} />
          <Tile label="Average invoice value" value={money(finance?.averageInvoiceValue ?? 0)} loading={financeLoading} mark={<Mark tone="approx" />} />
        </div>
      </section>

      {/* ------------------------------------------------------- analytics */}
      <section className="space-y-4">
        <SectionHead
          title="Analytics"
          right={<span className="pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{rangeLabel}</span>}
        />
        <DashboardCharts data={charts} loading={chartsLoading} currency={currency} />
      </section>

      {/* --------------------------------------------------------- content */}
      <section className="space-y-4">
        <SectionHead title="Content" href="/services" linkLabel="Manage content" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Services" value={data?.services ?? 0} loading={loading} href="/services" mark={<Mark tone="arrow" />} />
          <Tile label="Portfolio projects" value={data?.projects ?? 0} loading={loading} href="/portfolio" mark={<Mark tone="arrow" />} />
          <Tile label="Testimonials" value={data?.testimonials ?? 0} loading={loading} href="/testimonials" mark={<Mark tone="arrow" />} />
          <Tile label="New contact submissions" value={data?.newSubmissions ?? 0} loading={loading} href="/analytics" mark={<Mark tone="arrow" />} />
        </div>
      </section>

      {/* ----------------------------------------------------- marketplace */}
      <section className="space-y-4">
        <SectionHead title="Influencer marketplace" href="/influencers" linkLabel="Open marketplace" />

        <div className="grid gap-3 md:grid-cols-3">
          <FlagCard label="Marketplace" enabled={inf?.flags.marketplaceEnabled ?? true} />
          <FlagCard label="Registrations" enabled={inf?.flags.registrationEnabled ?? true} />
          <FlagCard label="Client bookings" enabled={inf?.flags.bookingsEnabled ?? true} />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <Tile label="Pending applications" value={inf?.pendingApplications ?? 0} loading={infLoading} href="/influencers/applications" accent />
          <Tile label="Approved influencers" value={inf?.approvedInfluencers ?? 0} loading={infLoading} href="/influencers" />
          <Tile label="Bookings this month" value={inf?.bookingsThisMonth ?? 0} loading={infLoading} href="/influencers/bookings" />
          <Tile label="Marketplace revenue" value={money(inf?.totalRevenue ?? 0)} loading={infLoading} href="/influencers/reports" />
          <Tile label="Commission earned" value={money(inf?.totalCommission ?? 0)} loading={infLoading} href="/influencers/commission" />
          <Tile label="Pending payouts" value={money(inf?.pendingPayouts ?? 0)} loading={infLoading} href="/influencers/payouts" />
          <Tile label="Total bookings" value={inf?.totalBookings ?? 0} loading={infLoading} href="/influencers/bookings" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[8px] border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
            <h3 className="font-heading text-[1.0625rem] font-extrabold tracking-tight text-heading">Top influencers by revenue</h3>
            <div className="mt-5">
              {infLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !inf || inf.topInfluencers.length === 0 ? (
                <div className="rounded-[8px] border border-dashed border-neutral-200 px-4 py-8 text-center text-[13px] text-neutral-400">
                  No completed bookings yet.
                  {(inf?.pendingApplications ?? 0) > 0 && (
                    <Link href="/influencers/applications" className="mt-1 block font-bold text-accent-500 hover:underline">
                      Review {inf?.pendingApplications} pending application{inf?.pendingApplications === 1 ? "" : "s"} →
                    </Link>
                  )}
                </div>
              ) : (
                <ol className="space-y-3">
                  {inf.topInfluencers.map((x, i) => (
                    <li key={x.id} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="w-4 text-neutral-400">{i + 1}</span>
                        <span className="truncate font-semibold text-heading">{x.username ? `@${x.username}` : x.name}</span>
                      </span>
                      <span className="shrink-0 font-bold text-heading">{money(x.revenue)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          <section className="rounded-[8px] border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
            <h3 className="font-heading text-[1.0625rem] font-extrabold tracking-tight text-heading">Top categories</h3>
            <div className="mt-5">
              {infLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !inf || inf.topCategories.length === 0 ? (
                <p className="rounded-[8px] border border-dashed border-neutral-200 px-4 py-8 text-center text-[13px] text-neutral-400">No categories yet.</p>
              ) : (
                <ul className="space-y-3">
                  {inf.topCategories.map((c) => (
                    <li key={c.id} className="grid grid-cols-[5.5rem_1fr_6rem] items-center gap-3 text-[12px]">
                      <span className="truncate font-semibold text-heading">{c.name}</span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                        <span className="block h-full rounded-full bg-accent-500" style={{ width: `${(c.count / maxCategory) * 100}%` }} />
                      </span>
                      <span className="text-right text-neutral-500">
                        {c.count} influencer{c.count === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-[8px] border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-heading text-[1.0625rem] font-extrabold tracking-tight text-heading">Monthly growth</h3>
            <span className="text-[11px] text-neutral-400">Completed bookings per month</span>
          </div>
          <div className="mt-4 h-56">
            {infLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inf?.monthlyGrowth ?? []} margin={{ top: 18, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fill: "var(--color-neutral-400)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--color-neutral-200)", strokeDasharray: "3 3" }} />
                  <Bar dataKey="bookings" name="Completed bookings" fill="var(--accent)" radius={[6, 6, 0, 0]} minPointSize={2}>
                    <LabelList dataKey="bookings" position="top" fill="var(--color-neutral-500)" fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
