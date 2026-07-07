import { Router } from "express";
import { prisma, type Prisma } from "@agency/database";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { paginationMeta } from "../lib/list-query.js";
import { resolveReportDateRange } from "../lib/date-range.js";
import { getReportRows, getReportRowsForExport, REPORT_SORT_FIELDS, type ReportFilters, type ReportRow } from "../lib/finance-reports-query.js";

export const financeReportsRouter = Router();

const REPORT_TYPES = ["QUOTATION", "INVOICE", "PAYMENT"] as const;

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function parseReportFilters(query: Record<string, unknown>): ReportFilters {
  const typeRaw = str(query.type)?.toUpperCase();
  return {
    search: str(query.search),
    type: typeRaw && (REPORT_TYPES as readonly string[]).includes(typeRaw) ? (typeRaw as ReportFilters["type"]) : undefined,
    clientId: str(query.clientId),
    projectId: str(query.projectId),
    paymentStatus: str(query.paymentStatus),
    invoiceStatus: str(query.invoiceStatus),
    paymentMethod: str(query.paymentMethod),
    currency: str(query.currency),
    datePreset: str(query.datePreset),
    dateFrom: str(query.dateFrom),
    dateTo: str(query.dateTo),
  };
}

function parseSort(query: Record<string, unknown>): { sortBy: string; sortOrder: "asc" | "desc" } {
  const sortByRaw = typeof query.sortBy === "string" ? query.sortBy : "date";
  const sortBy = REPORT_SORT_FIELDS.includes(sortByRaw) ? sortByRaw : "date";
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  return { sortBy, sortOrder };
}

// Raw-query numeric columns can come back as strings/Decimal-likes depending
// on the pg driver's type parsing -- normalize to plain numbers once here so
// every consumer (list, export) gets consistent JSON.
function serializeRow(row: ReportRow) {
  return {
    ...row,
    amount: Number(row.amount),
    tax: Number(row.tax),
    discount: Number(row.discount),
    netAmount: Number(row.netAmount),
    balanceDue: row.balanceDue === null ? null : Number(row.balanceDue),
  };
}

financeReportsRouter.get(
  "/summary",
  requireAuth,
  requirePermission("invoices", "view"),
  asyncHandler(async (req, res) => {
    const range = resolveReportDateRange(str(req.query.datePreset), str(req.query.dateFrom), str(req.query.dateTo));
    const clientId = str(req.query.clientId);
    const projectId = str(req.query.projectId);
    const currency = str(req.query.currency);
    const now = new Date();

    const quotationWhere: Prisma.QuotationWhereInput = {
      ...(clientId ? { clientId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(currency ? { currency } : {}),
      ...(range ? { issueDate: { gte: range.start, lte: range.end } } : {}),
    };
    const invoiceWhere: Prisma.InvoiceWhereInput = {
      ...(clientId ? { clientId } : {}),
      ...(projectId ? { projectId } : {}),
      ...(currency ? { currency } : {}),
      ...(range ? { issueDate: { gte: range.start, lte: range.end } } : {}),
    };
    const paymentInvoiceFilter: Prisma.InvoiceWhereInput = {
      ...(clientId ? { clientId } : {}),
      ...(projectId ? { projectId } : {}),
    };
    const paymentWhere: Prisma.PaymentWhereInput = {
      ...(currency ? { currency } : {}),
      ...(range ? { paymentDate: { gte: range.start, lte: range.end } } : {}),
      invoice: paymentInvoiceFilter,
    };

    const [
      totalRevenueAgg,
      paymentsReceivedAgg,
      pendingAgg,
      outstandingAgg,
      overdueInvoices,
      totalQuotations,
      totalInvoices,
      avgInvoiceAgg,
      invoiceClientRows,
      quotationClientRows,
    ] = await Promise.all([
      prisma.invoice.aggregate({ where: { ...invoiceWhere, status: { notIn: ["DRAFT", "CANCELLED"] } }, _sum: { grandTotal: true } }),
      prisma.payment.aggregate({
        where: { ...paymentWhere, invoice: { ...paymentInvoiceFilter, status: { notIn: ["DRAFT", "CANCELLED"] } } },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({ where: { ...invoiceWhere, status: { in: ["SENT", "PARTIALLY_PAID"] } }, _sum: { balance: true } }),
      prisma.invoice.aggregate({
        where: { ...invoiceWhere, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
        _sum: { balance: true },
      }),
      prisma.invoice.count({
        where: { ...invoiceWhere, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] }, dueDate: { lt: now }, balance: { gt: 0 } },
      }),
      prisma.quotation.count({ where: quotationWhere }),
      prisma.invoice.count({ where: invoiceWhere }),
      prisma.invoice.aggregate({ where: { ...invoiceWhere, status: { not: "CANCELLED" } }, _avg: { grandTotal: true } }),
      prisma.invoice.findMany({ where: invoiceWhere, select: { clientId: true }, distinct: ["clientId"] }),
      prisma.quotation.findMany({ where: quotationWhere, select: { clientId: true }, distinct: ["clientId"] }),
    ]);

    const numberOfClients = new Set([...invoiceClientRows, ...quotationClientRows].map((r) => r.clientId)).size;

    res.json({
      totalRevenue: totalRevenueAgg._sum.grandTotal?.toNumber() ?? 0,
      totalPaymentsReceived: paymentsReceivedAgg._sum.amount?.toNumber() ?? 0,
      pendingPayments: pendingAgg._sum.balance?.toNumber() ?? 0,
      outstandingBalance: outstandingAgg._sum.balance?.toNumber() ?? 0,
      overdueInvoices,
      totalQuotations,
      totalInvoices,
      numberOfClients,
      averageInvoiceValue: avgInvoiceAgg._avg.grandTotal?.toNumber() ?? 0,
    });
  }),
);

financeReportsRouter.get(
  "/export",
  requireAuth,
  requirePermission("invoices", "view"),
  asyncHandler(async (req, res) => {
    const filters = parseReportFilters(req.query as Record<string, unknown>);
    const { sortBy, sortOrder } = parseSort(req.query as Record<string, unknown>);

    const { items, total, truncated } = await getReportRowsForExport(filters, { sortBy, sortOrder });
    res.json({ items: items.map(serializeRow), total, truncated });
  }),
);

financeReportsRouter.get(
  "/:type/:id",
  requireAuth,
  requirePermission("invoices", "view"),
  asyncHandler(async (req, res) => {
    const type = String(req.params.type ?? "").toUpperCase();
    const { id } = req.params;

    if (type === "QUOTATION") {
      const item = await prisma.quotation.findUnique({
        where: { id },
        include: { client: true, project: true, invoices: { select: { id: true, invoiceNumber: true } } },
      });
      if (!item) {
        res.status(404).json({ error: "Quotation not found" });
        return;
      }
      res.json({ type, item });
      return;
    }

    if (type === "INVOICE") {
      const item = await prisma.invoice.findUnique({
        where: { id },
        include: {
          client: true,
          project: true,
          quotation: { select: { id: true, quoteNumber: true } },
          payments: { orderBy: { paymentDate: "desc" } },
        },
      });
      if (!item) {
        res.status(404).json({ error: "Invoice not found" });
        return;
      }
      res.json({ type, item });
      return;
    }

    if (type === "PAYMENT") {
      const item = await prisma.payment.findUnique({
        where: { id },
        include: {
          invoice: { include: { client: true, project: true, quotation: { select: { id: true, quoteNumber: true } } } },
        },
      });
      if (!item) {
        res.status(404).json({ error: "Payment not found" });
        return;
      }
      res.json({ type, item });
      return;
    }

    res.status(400).json({ error: "Invalid report type" });
  }),
);

financeReportsRouter.get(
  "/",
  requireAuth,
  requirePermission("invoices", "view"),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limitRaw = Number.parseInt(String(req.query.limit ?? "10"), 10);
    const limit = Math.min(100, Math.max(1, Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 10));
    const skip = (page - 1) * limit;

    const filters = parseReportFilters(req.query as Record<string, unknown>);
    const { sortBy, sortOrder } = parseSort(req.query as Record<string, unknown>);

    const { items, total } = await getReportRows(filters, { skip, take: limit, sortBy, sortOrder });

    res.json({ items: items.map(serializeRow), ...paginationMeta(total, page, limit) });
  }),
);
