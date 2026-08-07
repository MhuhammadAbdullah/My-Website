import { Router } from "express";
import { z } from "zod";
import { prisma } from "@agency/database";
import { discountSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";
import { parseListQuery, paginationMeta, searchFilter, exactFilter } from "../lib/list-query.js";
import { syncDiscountResponses } from "../lib/discount.js";
import { notifyInfluencer } from "../lib/notify.js";

// Admin-only, unlike the public content CRUD factory -- a Discount row
// includes usage counts and (for scoped ones) which influencer/category it
// targets, none of which should ever be fetchable by an unauthenticated
// client. Booking-time redemption goes through lib/discount.ts's
// resolveBookingDiscount(), which looks up by code server-side and never
// echoes the full row back.
export const discountsRouter = Router();

const sortableFields = ["createdAt", "label", "usedCount", "value"];

const detailInclude = {
  influencer: { select: { id: true, name: true, profile: { select: { username: true } } } },
  category: { select: { id: true, name: true } },
  // Aggregate approval state (not the full per-influencer list -- the admin
  // list view only needs "N approved / M pending / K declined" counts) so
  // admin can see at a glance whether a broadcast discount is actually
  // live for anyone yet.
  responses: { select: { status: true } },
};

function normalizeBody(data: ReturnType<typeof discountSchema.parse>) {
  return {
    code: data.code ? data.code.toUpperCase() : null,
    label: data.label,
    type: data.type,
    scope: data.scope,
    value: data.value,
    influencerId: data.scope === "INFLUENCER" ? data.influencerId || null : null,
    categoryId: data.scope === "CATEGORY" ? data.categoryId || null : null,
    startsAt: data.startsAt ?? null,
    endsAt: data.endsAt ?? null,
    maxUses: data.maxUses ?? null,
    minBookingAmount: data.minBookingAmount ?? null,
    isActive: data.isActive,
    color: data.color ?? null,
  };
}

// After the Discount row itself is written, fans out fresh PENDING
// DiscountInfluencerResponse rows to every influencer this discount is now
// eligible for (see syncDiscountResponses -- ALL/FIRST_BOOKING reach every
// approved influencer, CATEGORY reaches that category's, INFLUENCER
// reaches just the one picked) and notifies each of them. Any discount
// terms change (including on a create-then-immediately-edited row) wipes
// prior responses first, so this always re-notifies everyone currently
// eligible -- an influencer who already approved the old terms gets asked
// again for the new ones.
async function syncAndNotify(item: { id: string; label: string }) {
  const discount = await prisma.discount.findUniqueOrThrow({ where: { id: item.id } });
  const influencerIds = await syncDiscountResponses(discount);
  for (const influencerId of influencerIds) {
    void notifyInfluencer(influencerId, {
      type: "discount.pending_approval",
      title: "New discount awaiting your approval",
      body: `Admin proposed "${item.label}" for your profile -- review and approve it to show it on your cards.`,
      linkUrl: "/influencer/dashboard/discounts",
    });
  }
}

discountsRouter.get(
  "/admin",
  requireAuth,
  requirePermission("discounts", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, { sortableFields, defaultSort: "createdAt" });
    const where = { ...searchFilter(search, ["label", "code"]), ...exactFilter(req.query, "scope"), ...exactFilter(req.query, "isActive") };

    const [items, total] = await Promise.all([
      prisma.discount.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit, include: detailInclude }),
      prisma.discount.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

// Create/update/delete deliberately sit at the bare path (not /admin/*) to
// match createResourceClient()'s REST convention (apps/admin/src/lib/api.ts)
// so this resource can drive the generic PaginatedResourceManager UI --
// still fully requireAuth-gated per route, unlike createCrudRouter's public
// GET /, which a Discount (usage counts, targeting) must never expose.
discountsRouter.post(
  "/",
  requireAuth,
  requirePermission("discounts", "create"),
  asyncHandler(async (req, res) => {
    const data = discountSchema.parse(req.body);
    if (data.code) {
      const existing = await prisma.discount.findUnique({ where: { code: data.code.toUpperCase() } });
      if (existing) throw new ApiError(409, "A discount with this code already exists.");
    }
    const created = await prisma.discount.create({ data: normalizeBody(data) });
    await syncAndNotify(created);
    const item = await prisma.discount.findUniqueOrThrow({ where: { id: created.id }, include: detailInclude });
    res.status(201).json({ item });
  }),
);

discountsRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("discounts", "update"),
  asyncHandler(async (req, res) => {
    const data = discountSchema.parse(req.body);
    if (data.code) {
      const existing = await prisma.discount.findUnique({ where: { code: data.code.toUpperCase() } });
      if (existing && existing.id !== req.params.id) throw new ApiError(409, "A discount with this code already exists.");
    }
    const updated = await prisma.discount.update({ where: { id: req.params.id }, data: normalizeBody(data) });
    await syncAndNotify(updated);
    const item = await prisma.discount.findUniqueOrThrow({ where: { id: updated.id }, include: detailInclude });
    res.json({ item });
  }),
);

const bulkDeleteSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });

discountsRouter.post(
  "/bulk-delete",
  requireAuth,
  requirePermission("discounts", "delete"),
  asyncHandler(async (req, res) => {
    const { ids } = bulkDeleteSchema.parse(req.body);
    const { count } = await prisma.discount.deleteMany({ where: { id: { in: ids } } });
    res.json({ count });
  }),
);

discountsRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("discounts", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.discount.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
