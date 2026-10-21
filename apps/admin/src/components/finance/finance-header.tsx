"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heading, Skeleton, cn } from "@agency/ui";
import { DEFAULT_CURRENCY } from "@agency/types";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { formatMoney } from "@/lib/currency";

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

const TABS = [
  { label: "Quotations", href: "/finance/quotations" },
  { label: "Invoices", href: "/finance/invoices" },
  { label: "Payments", href: "/finance/payments" },
  { label: "Clients", href: "/finance/clients" },
  { label: "Reports", href: "/finance/reports" },
  { label: "Settings", href: "/finance/settings" },
];

type Kpi = "revenue" | "pending" | "outstanding" | "month" | "quotations" | "invoices" | "paid" | "overdue" | "clients" | "average";

const KPI: Record<Kpi, { label: string; money?: boolean; value: (s: FinanceStats) => number; tone?: "error" | "success" }> = {
  revenue: { label: "Total revenue", money: true, value: (s) => s.totalRevenue, tone: "success" },
  pending: { label: "Pending revenue", money: true, value: (s) => s.pendingRevenue },
  outstanding: { label: "Outstanding", money: true, value: (s) => s.outstandingPayments },
  month: { label: "Received this month", money: true, value: (s) => s.paymentsThisMonth },
  quotations: { label: "Quotations", value: (s) => s.totalQuotations },
  invoices: { label: "Invoices", value: (s) => s.totalInvoices },
  paid: { label: "Paid invoices", value: (s) => s.paidInvoices, tone: "success" },
  overdue: { label: "Overdue invoices", value: (s) => s.overdueInvoices, tone: "error" },
  clients: { label: "Clients", value: (s) => s.totalClients },
  average: { label: "Average invoice", money: true, value: (s) => s.averageInvoiceValue },
};

// Switcher between the finance screens.
export function FinanceTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Finance sections" className="max-w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-1">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn("shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors", active ? "bg-accent-500 text-on-accent" : "text-neutral-500 hover:text-heading")}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function FinanceKpis({ keys }: { keys: Kpi[] }) {
  const { data, loading } = useAsyncData<FinanceStats>(() => request<FinanceStats>("/finance/dashboard"), []);
  const currency = data?.defaultCurrency ?? DEFAULT_CURRENCY;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {keys.map((k) => {
        const def = KPI[k];
        const v = data ? def.value(data) : 0;
        return (
          <div key={k} className="rounded-[10px] border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-[12px] font-medium text-neutral-500">{def.label}</p>
            {loading ? (
              <Skeleton className="mt-2 h-6 w-20" />
            ) : (
              <p className={cn("mt-1 font-heading text-[1.375rem] font-extrabold leading-none tracking-tight", def.tone === "error" && v > 0 ? "text-error-500" : "text-heading")}>
                {def.money ? formatMoney(v, currency, { maximumFractionDigits: 0 }) : v}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FinanceHeader({ title, description, action, kpis }: { title: string; description: string; action?: React.ReactNode; kpis?: Kpi[] }) {
  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <Heading level={2} className="admin-page-title">
            {title}
          </Heading>
          <p className="mt-2 text-body-sm text-neutral-500">{description}</p>
        </div>
        {action}
      </div>
      {kpis && <FinanceKpis keys={kpis} />}
    </header>
  );
}
