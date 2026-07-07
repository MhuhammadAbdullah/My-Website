import { Router } from "express";
import { prisma } from "@agency/database";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";

// Read-only Project Finance summary -- Project CRUD itself lives in
// projects.routes.ts; this is purely an aggregation view for the admin
// Portfolio page, same "aggregate, don't fetch everything" approach as
// /finance/dashboard and /finance/clients/:id/summary.
export const financeProjectsRouter = Router();

financeProjectsRouter.get(
  "/:id/summary",
  requireAuth,
  requirePermission("invoices", "view"),
  asyncHandler(async (req, res) => {
    const projectId = req.params.id;

    const [totalQuoted, totalInvoiced, totalOutstanding, quotationsCount, invoicesCount, invoicesForPaid, financeSettings] =
      await Promise.all([
        prisma.quotation.aggregate({ where: { projectId }, _sum: { grandTotal: true } }),
        prisma.invoice.aggregate({ where: { projectId }, _sum: { grandTotal: true } }),
        prisma.invoice.aggregate({ where: { projectId, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } }, _sum: { balance: true } }),
        prisma.quotation.count({ where: { projectId } }),
        prisma.invoice.count({ where: { projectId } }),
        prisma.invoice.findMany({ where: { projectId }, select: { amountPaid: true } }),
        prisma.financeSettings.findFirst(),
      ]);

    const totalReceived = invoicesForPaid.reduce((sum, inv) => sum + inv.amountPaid.toNumber(), 0);

    res.json({
      totalQuoted: totalQuoted._sum.grandTotal?.toNumber() ?? 0,
      totalInvoiced: totalInvoiced._sum.grandTotal?.toNumber() ?? 0,
      totalReceived,
      totalOutstanding: totalOutstanding._sum.balance?.toNumber() ?? 0,
      quotationsCount,
      invoicesCount,
      defaultCurrency: financeSettings?.defaultCurrency ?? "PKR",
    });
  }),
);
