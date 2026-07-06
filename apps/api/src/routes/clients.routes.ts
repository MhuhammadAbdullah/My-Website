import { Router } from "express";
import { prisma, type Prisma } from "@agency/database";
import { clientSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { parseListQuery, paginationMeta, searchFilter, exactFilter } from "../lib/list-query.js";

// Unlike the generic createCrudRouter (built for public marketing content),
// Clients carry PII (email/phone/address) with no public-facing purpose at
// all -- every route here is auth-gated, including reads.
export const clientsRouter = Router();

const clientSortableFields = ["name", "company", "createdAt", "updatedAt"];

clientsRouter.get(
  "/admin",
  requireAuth,
  requirePermission("clients", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: clientSortableFields,
      defaultSort: "name",
      defaultLimit: 10,
    });

    const where = {
      ...searchFilter(search, ["name", "email", "company"]),
      ...exactFilter(req.query, "isArchived"),
    } as Prisma.ClientWhereInput;

    const [items, total] = await Promise.all([
      prisma.client.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.client.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

// Flat, unpaginated list -- used as a dropdown/combobox source (Quotation/
// Invoice client picker), same convention as e.g. /categories/services.
clientsRouter.get(
  "/",
  requireAuth,
  requirePermission("clients", "view"),
  asyncHandler(async (_req, res) => {
    const items = await prisma.client.findMany({ where: { isArchived: false }, orderBy: { name: "asc" } });
    res.json({ items });
  }),
);

clientsRouter.get(
  "/:id",
  requireAuth,
  requirePermission("clients", "view"),
  asyncHandler(async (req, res) => {
    const item = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!item) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    res.json({ item });
  }),
);

// Read-only aggregation for the Client Finance profile page -- no new writes,
// mirrors the same aggregate-don't-fetch-everything approach as /finance/dashboard.
clientsRouter.get(
  "/:id/summary",
  requireAuth,
  requirePermission("clients", "view"),
  asyncHandler(async (req, res) => {
    const clientId = req.params.id;
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const [totalQuotations, totalInvoices, paidRevenue, pendingRevenue, overdueInvoices, recentPayments] = await Promise.all([
      prisma.quotation.count({ where: { clientId } }),
      prisma.invoice.count({ where: { clientId } }),
      prisma.invoice.aggregate({ where: { clientId, status: "PAID" }, _sum: { grandTotal: true } }),
      prisma.invoice.aggregate({ where: { clientId, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } }, _sum: { balance: true } }),
      prisma.invoice.count({ where: { clientId, status: "OVERDUE" } }),
      prisma.payment.findMany({
        where: { invoice: { clientId } },
        include: { invoice: { select: { id: true, invoiceNumber: true } } },
        orderBy: { paymentDate: "desc" },
        take: 20,
      }),
    ]);

    res.json({
      client,
      totalQuotations,
      totalInvoices,
      totalRevenue: paidRevenue._sum.grandTotal?.toNumber() ?? 0,
      totalPending: pendingRevenue._sum.balance?.toNumber() ?? 0,
      overdueInvoices,
      recentPayments,
    });
  }),
);

clientsRouter.post(
  "/",
  requireAuth,
  requirePermission("clients", "create"),
  asyncHandler(async (req, res) => {
    const data = clientSchema.parse(req.body);
    const item = await prisma.client.create({ data });
    res.status(201).json({ item });
  }),
);

clientsRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("clients", "update"),
  asyncHandler(async (req, res) => {
    const data = clientSchema.partial().parse(req.body);
    const item = await prisma.client.update({ where: { id: req.params.id }, data });
    res.json({ item });
  }),
);

clientsRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("clients", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
