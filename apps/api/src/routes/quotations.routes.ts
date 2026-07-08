import { Router } from "express";
import { prisma, type Prisma } from "@agency/database";
import { quotationSchema, type LineItemInput } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { parseListQuery, paginationMeta, searchFilter, exactFilter } from "../lib/list-query.js";
import { computeDocumentTotals, generateQuoteNumber, generateInvoiceNumber } from "../lib/finance.js";

export const quotationsRouter = Router();

const quotationInclude = {
  client: true,
  project: true,
  items: { orderBy: { order: "asc" as const } },
};

const quotationSortableFields = ["quoteNumber", "issueDate", "expiryDate", "status", "createdAt", "updatedAt"];

// Vercel's separate type-check pass (distinct from this project's own
// passing tsc --noEmit) loses the required-ness of LineItemInput's fields
// when `data.items` flows straight from a parsed, `.refine()`-wrapped Zod
// schema into computeDocumentTotals's generic <T>, inferring `name` (and
// others) as optional and rejecting the call. Reconstructing the array
// explicitly field-by-field removes the ambiguity outright, the same fix
// already applied to every other Prisma create() payload in this sweep.
function toLineItems(items: readonly LineItemInput[]): LineItemInput[] {
  return items.map((it) => ({
    id: it.id,
    name: it.name,
    description: it.description,
    pricingType: it.pricingType,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    discountType: it.discountType,
    discountValue: it.discountValue,
    taxPercent: it.taxPercent,
    order: it.order,
  }));
}

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

quotationsRouter.get(
  "/admin",
  requireAuth,
  requirePermission("quotations", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: quotationSortableFields,
      defaultSort: "createdAt",
      defaultLimit: 10,
    });

    const where = {
      ...searchFilter(search, ["quoteNumber", "notes"]),
      ...exactFilter(req.query, "status"),
      ...exactFilter(req.query, "clientId"),
      ...exactFilter(req.query, "projectId"),
      ...exactFilter(req.query, "isArchived"),
    } as Prisma.QuotationWhereInput;

    const [items, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: quotationInclude,
      }),
      prisma.quotation.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

quotationsRouter.get(
  "/:id",
  requireAuth,
  requirePermission("quotations", "view"),
  asyncHandler(async (req, res) => {
    const item = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: quotationInclude });
    if (!item) {
      res.status(404).json({ error: "Quotation not found" });
      return;
    }
    res.json({ item });
  }),
);

quotationsRouter.post(
  "/",
  requireAuth,
  requirePermission("quotations", "create"),
  asyncHandler(async (req, res) => {
    const data = quotationSchema.parse(req.body);
    const { computedItems, subtotal, discountTotal, taxTotal, grandTotal } = computeDocumentTotals(
      toLineItems(data.items),
    );
    const quoteNumber = await generateQuoteNumber();

    const item = await prisma.quotation.create({
      data: {
        quoteNumber,
        status: data.status,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        clientId: data.clientId,
        projectId: data.projectId ?? null,
        currency: data.currency,
        notes: data.notes ?? null,
        terms: data.terms ?? null,
        signatureText: data.signatureText ?? null,
        isArchived: data.isArchived,
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        createdById: req.user!.id,
        items: { create: itemCreateData(computedItems) },
      },
      include: quotationInclude,
    });
    res.status(201).json({ item });
  }),
);

quotationsRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("quotations", "update"),
  asyncHandler(async (req, res) => {
    const data = quotationSchema.parse(req.body);
    const { computedItems, subtotal, discountTotal, taxTotal, grandTotal } = computeDocumentTotals(
      toLineItems(data.items),
    );

    // Full-document replace: delete existing line items and recreate them
    // fresh from the submitted array, rather than diffing -- the admin form
    // always resubmits the complete item list, so this stays simple and
    // correct without a separate add/remove/reorder API per item.
    const item = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: req.params.id } });
      return tx.quotation.update({
        where: { id: req.params.id },
        data: {
          status: data.status,
          issueDate: data.issueDate,
          expiryDate: data.expiryDate,
          clientId: data.clientId,
          projectId: data.projectId ?? null,
          currency: data.currency,
          notes: data.notes ?? null,
          terms: data.terms ?? null,
          signatureText: data.signatureText ?? null,
          isArchived: data.isArchived,
          subtotal,
          discountTotal,
          taxTotal,
          grandTotal,
          items: { create: itemCreateData(computedItems) },
        },
        include: quotationInclude,
      });
    });
    res.json({ item });
  }),
);

quotationsRouter.patch(
  "/:id/archive",
  requireAuth,
  requirePermission("quotations", "update"),
  asyncHandler(async (req, res) => {
    const isArchived = typeof req.body?.isArchived === "boolean" ? req.body.isArchived : true;
    const item = await prisma.quotation.update({
      where: { id: req.params.id },
      data: { isArchived },
      include: quotationInclude,
    });
    res.json({ item });
  }),
);

quotationsRouter.post(
  "/:id/duplicate",
  requireAuth,
  requirePermission("quotations", "create"),
  asyncHandler(async (req, res) => {
    const original = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!original) {
      res.status(404).json({ error: "Quotation not found" });
      return;
    }
    const quoteNumber = await generateQuoteNumber();
    const item = await prisma.quotation.create({
      data: {
        quoteNumber,
        status: "DRAFT",
        issueDate: new Date(),
        expiryDate: original.expiryDate,
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
      include: quotationInclude,
    });
    res.status(201).json({ item });
  }),
);

quotationsRouter.post(
  "/:id/convert-to-invoice",
  requireAuth,
  requirePermission("invoices", "create"),
  asyncHandler(async (req, res) => {
    const quotation = await prisma.quotation.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!quotation) {
      res.status(404).json({ error: "Quotation not found" });
      return;
    }
    const invoiceNumber = await generateInvoiceNumber();
    const issueDate = new Date();
    const dueDate = new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000); // default 14-day terms

    const [invoice] = await prisma.$transaction([
      prisma.invoice.create({
        data: {
          invoiceNumber,
          status: "DRAFT",
          issueDate,
          dueDate,
          clientId: quotation.clientId,
          projectId: quotation.projectId,
          quotationId: quotation.id,
          currency: quotation.currency,
          notes: quotation.notes,
          terms: quotation.terms,
          signatureText: quotation.signatureText,
          subtotal: quotation.subtotal,
          discountTotal: quotation.discountTotal,
          taxTotal: quotation.taxTotal,
          grandTotal: quotation.grandTotal,
          balance: quotation.grandTotal,
          createdById: req.user!.id,
          items: {
            create: quotation.items.map((it) => ({
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
        include: { client: true, project: true, items: true },
      }),
      prisma.quotation.update({ where: { id: quotation.id }, data: { status: "ACCEPTED" } }),
    ]);

    res.status(201).json({ item: invoice });
  }),
);

quotationsRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("quotations", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.quotation.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
