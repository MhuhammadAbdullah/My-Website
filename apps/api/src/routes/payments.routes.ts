import { Router } from "express";
import { prisma, type Prisma } from "@agency/database";
import { paymentSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";
import { parseListQuery, paginationMeta, searchFilter, exactFilter } from "../lib/list-query.js";
import { recomputeInvoiceBalance } from "../lib/finance.js";

export const paymentsRouter = Router();

// Project/Client are read via the invoice relation rather than duplicated as
// columns on Payment -- one source of truth, satisfies "each payment shows
// its client/project" without denormalizing.
const paymentInclude = {
  invoice: { include: { client: true, project: true } },
  attachment: true,
};

const paymentSortableFields = ["paymentDate", "amount", "method", "createdAt"];

paymentsRouter.get(
  "/admin",
  requireAuth,
  requirePermission("payments", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: paymentSortableFields,
      defaultSort: "paymentDate",
      defaultLimit: 10,
    });

    const where = {
      ...searchFilter(search, ["transactionId", "notes"]),
      ...exactFilter(req.query, "invoiceId"),
      ...exactFilter(req.query, "method"),
    } as Prisma.PaymentWhereInput;

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: paymentInclude,
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

paymentsRouter.get(
  "/:id",
  requireAuth,
  requirePermission("payments", "view"),
  asyncHandler(async (req, res) => {
    const item = await prisma.payment.findUnique({ where: { id: req.params.id }, include: paymentInclude });
    if (!item) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    res.json({ item });
  }),
);

paymentsRouter.post(
  "/",
  requireAuth,
  requirePermission("payments", "create"),
  asyncHandler(async (req, res) => {
    const data = paymentSchema.parse(req.body);

    const item = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } });
      if (!invoice) throw new ApiError(404, "Invoice not found");
      if (data.amount > invoice.balance.toNumber()) {
        throw new ApiError(422, `Payment amount cannot exceed the remaining balance (${invoice.balance.toNumber()})`);
      }

      const created = await tx.payment.create({
        data: {
          invoiceId: data.invoiceId,
          amount: data.amount,
          currency: data.currency,
          paymentDate: data.paymentDate,
          method: data.method,
          transactionId: data.transactionId ?? null,
          notes: data.notes ?? null,
          attachmentId: data.attachmentId ?? null,
          createdById: req.user!.id,
        },
      });

      await recomputeInvoiceBalance(data.invoiceId, tx);
      return created;
    });

    const withIncludes = await prisma.payment.findUnique({ where: { id: item.id }, include: paymentInclude });
    res.status(201).json({ item: withIncludes });
  }),
);

paymentsRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("payments", "update"),
  asyncHandler(async (req, res) => {
    const data = paymentSchema.partial().parse(req.body);

    const item = await prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUniqueOrThrow({ where: { id: req.params.id } });
      const invoiceId = data.invoiceId ?? existing.invoiceId;

      if (data.amount !== undefined) {
        const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
        // Compare against the balance *excluding* this payment's current amount,
        // since it's already counted in the invoice's stored balance.
        const balanceExcludingThis = invoice.balance.toNumber() + existing.amount.toNumber();
        if (data.amount > balanceExcludingThis) {
          throw new ApiError(422, `Payment amount cannot exceed the remaining balance (${balanceExcludingThis})`);
        }
      }

      const updated = await tx.payment.update({
        where: { id: req.params.id },
        data: {
          ...(data.invoiceId !== undefined ? { invoiceId: data.invoiceId } : {}),
          ...(data.amount !== undefined ? { amount: data.amount } : {}),
          ...(data.currency !== undefined ? { currency: data.currency } : {}),
          ...(data.paymentDate !== undefined ? { paymentDate: data.paymentDate } : {}),
          ...(data.method !== undefined ? { method: data.method } : {}),
          ...(data.transactionId !== undefined ? { transactionId: data.transactionId } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          ...(data.attachmentId !== undefined ? { attachmentId: data.attachmentId } : {}),
        },
      });

      await recomputeInvoiceBalance(invoiceId, tx);
      if (existing.invoiceId !== invoiceId) {
        await recomputeInvoiceBalance(existing.invoiceId, tx);
      }
      return updated;
    });

    const withIncludes = await prisma.payment.findUnique({ where: { id: item.id }, include: paymentInclude });
    res.json({ item: withIncludes });
  }),
);

paymentsRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("payments", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUniqueOrThrow({ where: { id: req.params.id } });
      await tx.payment.delete({ where: { id: req.params.id } });
      await recomputeInvoiceBalance(existing.invoiceId, tx);
    });
    res.status(204).send();
  }),
);
