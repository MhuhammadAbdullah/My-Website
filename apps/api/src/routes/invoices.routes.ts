import { Router } from "express";
import { prisma, type Prisma } from "@agency/database";
import { invoiceSchema, invoiceStatusSchema, type LineItemInput } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { parseListQuery, paginationMeta, searchFilter, exactFilter } from "../lib/list-query.js";
import { computeDocumentTotals, generateInvoiceNumber } from "../lib/finance.js";

export const invoicesRouter = Router();

const invoiceInclude = {
  client: true,
  project: true,
  quotation: { select: { id: true, quoteNumber: true } },
  items: { orderBy: { order: "asc" as const } },
  payments: { orderBy: { paymentDate: "desc" as const } },
};

const invoiceSortableFields = ["invoiceNumber", "issueDate", "dueDate", "status", "createdAt", "updatedAt"];

function itemCreateData(computedItems: (LineItemInput & { lineTotal: number })[]) {
  return computedItems.map((ci, i) => ({
    name: ci.name,
    description: ci.description ?? null,
    pricingType: ci.pricingType,
    quantity: ci.quantity,
    unitPrice: ci.unitPrice,
    discountType: ci.discountType,
    discountValue: ci.discountValue,
    taxPercent: ci.taxPercent,
    lineTotal: ci.lineTotal,
    order: i,
  }));
}

invoicesRouter.get(
  "/admin",
  requireAuth,
  requirePermission("invoices", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: invoiceSortableFields,
      defaultSort: "createdAt",
      defaultLimit: 10,
    });

    const where = {
      ...searchFilter(search, ["invoiceNumber", "notes"]),
      ...exactFilter(req.query, "status"),
      ...exactFilter(req.query, "clientId"),
      ...exactFilter(req.query, "projectId"),
    } as Prisma.InvoiceWhereInput;

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: invoiceInclude,
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

invoicesRouter.get(
  "/:id",
  requireAuth,
  requirePermission("invoices", "view"),
  asyncHandler(async (req, res) => {
    const item = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: invoiceInclude });
    if (!item) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    res.json({ item });
  }),
);

invoicesRouter.post(
  "/",
  requireAuth,
  requirePermission("invoices", "create"),
  asyncHandler(async (req, res) => {
    const data = invoiceSchema.parse(req.body);
    const { computedItems, subtotal, discountTotal, taxTotal, grandTotal } = computeDocumentTotals(data.items);
    const invoiceNumber = await generateInvoiceNumber();

    const item = await prisma.invoice.create({
      data: {
        invoiceNumber,
        status: data.status,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        clientId: data.clientId,
        projectId: data.projectId ?? null,
        quotationId: data.quotationId ?? null,
        currency: data.currency,
        notes: data.notes ?? null,
        terms: data.terms ?? null,
        signatureText: data.signatureText ?? null,
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        balance: grandTotal,
        createdById: req.user!.id,
        items: { create: itemCreateData(computedItems) },
      },
      include: invoiceInclude,
    });
    res.status(201).json({ item });
  }),
);

invoicesRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("invoices", "update"),
  asyncHandler(async (req, res) => {
    const data = invoiceSchema.parse(req.body);
    const { computedItems, subtotal, discountTotal, taxTotal, grandTotal } = computeDocumentTotals(data.items);

    const item = await prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findUniqueOrThrow({ where: { id: req.params.id }, include: { payments: true } });
      const amountPaid = existing.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
      const balance = Math.max(0, grandTotal - amountPaid);

      await tx.invoiceItem.deleteMany({ where: { invoiceId: req.params.id } });
      return tx.invoice.update({
        where: { id: req.params.id },
        data: {
          status: data.status,
          issueDate: data.issueDate,
          dueDate: data.dueDate,
          clientId: data.clientId,
          projectId: data.projectId ?? null,
          quotationId: data.quotationId ?? null,
          currency: data.currency,
          notes: data.notes ?? null,
          terms: data.terms ?? null,
          signatureText: data.signatureText ?? null,
          subtotal,
          discountTotal,
          taxTotal,
          grandTotal,
          balance,
          items: { create: itemCreateData(computedItems) },
        },
        include: invoiceInclude,
      });
    });
    res.json({ item });
  }),
);

invoicesRouter.patch(
  "/:id/status",
  requireAuth,
  requirePermission("invoices", "update"),
  asyncHandler(async (req, res) => {
    const status = invoiceStatusSchema.parse(req.body?.status);
    const item = await prisma.invoice.update({ where: { id: req.params.id }, data: { status }, include: invoiceInclude });
    res.json({ item });
  }),
);

invoicesRouter.post(
  "/:id/duplicate",
  requireAuth,
  requirePermission("invoices", "create"),
  asyncHandler(async (req, res) => {
    const original = await prisma.invoice.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!original) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }
    const invoiceNumber = await generateInvoiceNumber();
    const issueDate = new Date();
    const dueDate = new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    const item = await prisma.invoice.create({
      data: {
        invoiceNumber,
        status: "DRAFT",
        issueDate,
        dueDate,
        clientId: original.clientId,
        projectId: original.projectId,
        currency: original.currency,
        notes: original.notes,
        terms: original.terms,
        signatureText: original.signatureText,
        subtotal: original.subtotal,
        discountTotal: original.discountTotal,
        taxTotal: original.taxTotal,
        grandTotal: original.grandTotal,
        balance: original.grandTotal,
        createdById: req.user!.id,
        items: {
          create: original.items.map((it) => ({
            name: it.name,
            description: it.description,
            pricingType: it.pricingType,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discountType: it.discountType,
            discountValue: it.discountValue,
            taxPercent: it.taxPercent,
            lineTotal: it.lineTotal,
            order: it.order,
          })),
        },
      },
      include: invoiceInclude,
    });
    res.status(201).json({ item });
  }),
);

invoicesRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("invoices", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
