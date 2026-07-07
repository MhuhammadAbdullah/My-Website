"use client";

import { Banknote, CircleDollarSign, Clock, AlertTriangle, FileStack, Receipt, Users, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, Skeleton } from "@agency/ui";
import type { ReportSummary } from "./types";

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(0)}`;
  }
}

function Card1({
  label,
  value,
  icon: Icon,
  loading,
  tone = "accent",
}: {
  label: string;
  value: string | number;
  icon: typeof Banknote;
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
          {loading ? <Skeleton className="mt-2 h-7 w-20" /> : <p className="mt-1 text-h4 font-semibold text-heading">{value}</p>}
        </div>
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${toneClasses}`}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportSummaryCards({ summary, loading, currency }: { summary: ReportSummary | null; loading: boolean; currency: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <Card1 label="Total revenue" value={formatMoney(summary?.totalRevenue ?? 0, currency)} icon={TrendingUp} loading={loading} tone="accent" />
      <Card1
        label="Total payments received"
        value={formatMoney(summary?.totalPaymentsReceived ?? 0, currency)}
        icon={CircleDollarSign}
        loading={loading}
        tone="success"
      />
      <Card1
        label="Pending payments"
        value={formatMoney(summary?.pendingPayments ?? 0, currency)}
        icon={Clock}
        loading={loading}
        tone="warning"
      />
      <Card1
        label="Outstanding balance"
        value={formatMoney(summary?.outstandingBalance ?? 0, currency)}
        icon={Wallet}
        loading={loading}
        tone="error"
      />
      <Card1 label="Overdue invoices" value={summary?.overdueInvoices ?? 0} icon={AlertTriangle} loading={loading} tone="error" />
      <Card1 label="Total quotations" value={summary?.totalQuotations ?? 0} icon={FileStack} loading={loading} />
      <Card1 label="Total invoices" value={summary?.totalInvoices ?? 0} icon={Receipt} loading={loading} />
      <Card1 label="Number of clients" value={summary?.numberOfClients ?? 0} icon={Users} loading={loading} />
      <Card1
        label="Average invoice value"
        value={formatMoney(summary?.averageInvoiceValue ?? 0, currency)}
        icon={Banknote}
        loading={loading}
      />
    </div>
  );
}
