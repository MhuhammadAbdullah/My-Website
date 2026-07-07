import { Router } from "express";
import { prisma } from "@agency/database";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { resolveDateRange, buildDateBuckets } from "../lib/date-range.js";

export const financeDashboardRouter = Router();

const TOP_N = 8;

financeDashboardRouter.get(
  "/",
  requireAuth,
  requirePermission("invoices", "view"),
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      paidRevenue,
      pendingRevenue,
      outstandingPayments,
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      totalQuotations,
      totalClients,
      paymentsThisMonth,
      invoiceValueAgg,
      financeSettings,
    ] = await Promise.all([
      // Revenue actually received -- summed from the Payments table (not
      // invoice.grandTotal) so partially-paid invoices count only the
      // amount actually paid. See apps/api/src/routes/clients.routes.ts
      // for the same calculation on the per-client summary.
      prisma.payment.aggregate({
        where: { invoice: { status: { notIn: ["DRAFT", "CANCELLED"] } } },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({ where: { status: { in: ["SENT", "PARTIALLY_PAID"] } }, _sum: { balance: true } }),
      // Overdue is derived, not the (rarely, manually set) OVERDUE status --
      // an invoice is overdue once its due date has passed and it still has
      // a balance owed, regardless of whether anyone flipped its status.
      prisma.invoice.aggregate({
        where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] }, dueDate: { lt: now }, balance: { gt: 0 } },
        _sum: { balance: true },
      }),
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: "PAID" } }),
      prisma.invoice.count({
        where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] }, dueDate: { lt: now }, balance: { gt: 0 } },
      }),
      prisma.quotation.count(),
      prisma.client.count({ where: { isArchived: false } }),
      prisma.payment.aggregate({ where: { paymentDate: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.invoice.aggregate({ where: { status: { not: "CANCELLED" } }, _sum: { grandTotal: true }, _count: true }),
      prisma.financeSettings.findFirst(),
    ]);

    const invoiceCount = invoiceValueAgg._count;
    const averageInvoiceValue = invoiceCount > 0 ? (invoiceValueAgg._sum.grandTotal?.toNumber() ?? 0) / invoiceCount : 0;

    res.json({
      totalRevenue: paidRevenue._sum.amount?.toNumber() ?? 0,
      pendingRevenue: pendingRevenue._sum.balance?.toNumber() ?? 0,
      outstandingPayments: outstandingPayments._sum.balance?.toNumber() ?? 0,
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      totalQuotations,
      totalClients,
      paymentsThisMonth: paymentsThisMonth._sum.amount?.toNumber() ?? 0,
      averageInvoiceValue,
      defaultCurrency: financeSettings?.defaultCurrency ?? "PKR",
    });
  }),
);

financeDashboardRouter.get(
  "/charts",
  requireAuth,
  requirePermission("invoices", "view"),
  asyncHandler(async (req, res) => {
    const range = resolveDateRange(
      typeof req.query.range === "string" ? req.query.range : undefined,
      typeof req.query.from === "string" ? req.query.from : undefined,
      typeof req.query.to === "string" ? req.query.to : undefined,
    );
    const buckets = buildDateBuckets(range);

    const [payments, invoicesForStatus, invoicesForOutstanding, quotationsInRange] = await Promise.all([
      prisma.payment.findMany({
        where: { paymentDate: { gte: range.start, lte: range.end } },
        select: {
          amount: true,
          paymentDate: true,
          method: true,
          invoice: {
            select: {
              projectId: true,
              clientId: true,
              project: { select: { title: true } },
              client: { select: { name: true } },
            },
          },
        },
      }),
      prisma.invoice.findMany({
        where: { issueDate: { gte: range.start, lte: range.end } },
        select: { status: true },
      }),
      prisma.invoice.findMany({
        where: { dueDate: { gte: range.start, lte: range.end }, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
        select: { dueDate: true, balance: true },
      }),
      prisma.quotation.findMany({
        where: { issueDate: { gte: range.start, lte: range.end } },
        select: { status: true },
      }),
    ]);

    // Monthly/daily revenue -- recognized as payments actually received.
    const monthlyRevenue = buckets.map((b) => ({
      label: b.label,
      revenue: payments
        .filter((p) => p.paymentDate >= b.start && p.paymentDate <= b.end)
        .reduce((sum, p) => sum + p.amount.toNumber(), 0),
    }));

    // Outstanding trend -- balance of unpaid invoices due within each bucket.
    const outstandingTrend = buckets.map((b) => ({
      label: b.label,
      outstanding: invoicesForOutstanding
        .filter((inv) => inv.dueDate >= b.start && inv.dueDate <= b.end)
        .reduce((sum, inv) => sum + inv.balance.toNumber(), 0),
    }));

    function topNGrouped(getKey: (p: (typeof payments)[number]) => string | null, getLabel: (p: (typeof payments)[number]) => string) {
      const totals = new Map<string, { label: string; revenue: number }>();
      for (const p of payments) {
        const key = getKey(p);
        if (!key) continue;
        const label = getLabel(p);
        const existing = totals.get(key);
        const amount = p.amount.toNumber();
        if (existing) existing.revenue += amount;
        else totals.set(key, { label, revenue: amount });
      }
      const sorted = [...totals.values()].sort((a, b) => b.revenue - a.revenue);
      const top = sorted.slice(0, TOP_N);
      const rest = sorted.slice(TOP_N);
      if (rest.length > 0) {
        top.push({ label: "Other", revenue: rest.reduce((sum, r) => sum + r.revenue, 0) });
      }
      return top;
    }

    const revenueByProject = topNGrouped(
      (p) => p.invoice.projectId,
      (p) => p.invoice.project?.title ?? "Untitled project",
    );
    const revenueByClient = topNGrouped(
      (p) => p.invoice.clientId,
      (p) => p.invoice.client?.name ?? "Unknown client",
    );

    const statusCounts = new Map<string, number>();
    for (const inv of invoicesForStatus) statusCounts.set(inv.status, (statusCounts.get(inv.status) ?? 0) + 1);
    const invoiceStatusDistribution = [...statusCounts.entries()].map(([status, count]) => ({ status, count }));

    const methodTotals = new Map<string, { count: number; amount: number }>();
    for (const p of payments) {
      const existing = methodTotals.get(p.method) ?? { count: 0, amount: 0 };
      existing.count += 1;
      existing.amount += p.amount.toNumber();
      methodTotals.set(p.method, existing);
    }
    const paymentMethodDistribution = [...methodTotals.entries()].map(([method, v]) => ({ method, ...v }));

    const totalQuotationsInRange = quotationsInRange.length;
    const convertedQuotations = quotationsInRange.filter((q) => q.status === "ACCEPTED").length;
    const conversionRate = {
      totalQuotations: totalQuotationsInRange,
      convertedQuotations,
      rate: totalQuotationsInRange > 0 ? (convertedQuotations / totalQuotationsInRange) * 100 : 0,
    };

    res.json({
      monthlyRevenue,
      revenueByProject,
      revenueByClient,
      invoiceStatusDistribution,
      paymentMethodDistribution,
      conversionRate,
      outstandingTrend,
    });
  }),
);
