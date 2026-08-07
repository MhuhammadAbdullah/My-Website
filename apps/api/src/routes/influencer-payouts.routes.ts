import { Router } from "express";
import { z } from "zod";
import { prisma } from "@agency/database";
import { payoutBatchCreateSchema, payoutStatusUpdateSchema, payoutStatusOverrideSchema, payoutMethodReviewSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";
import { parseListQuery, paginationMeta, exactFilter } from "../lib/list-query.js";
import {
  getEligibleBookingsForPayout,
  createPayoutBatch,
  nextAllowedPayoutStatuses,
  transitionPayout,
  overridePayoutStatus,
  payoutDetailInclude,
} from "../lib/payout.js";

export const influencerPayoutsRouter = Router();

const adminSortableFields = ["createdAt", "payoutNumber", "status", "totalAmount"];

influencerPayoutsRouter.get(
  "/admin",
  requireAuth,
  requirePermission("influencerPayouts", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: adminSortableFields,
      defaultSort: "createdAt",
    });
    const where = { ...exactFilter(req.query, "status"), ...exactFilter(req.query, "influencerId") };

    const [items, total] = await Promise.all([
      prisma.influencerPayout.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        select: {
          id: true,
          payoutNumber: true,
          status: true,
          totalAmount: true,
          currency: true,
          method: true,
          createdAt: true,
          processedAt: true,
          influencer: { select: { name: true, profile: { select: { username: true } } } },
        },
      }),
      prisma.influencerPayout.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

influencerPayoutsRouter.get(
  "/admin/eligible-bookings",
  requireAuth,
  requirePermission("influencerPayouts", "view"),
  asyncHandler(async (req, res) => {
    const influencerId = String(req.query.influencerId ?? "");
    if (!influencerId) throw new ApiError(422, "influencerId is required.");
    const items = await getEligibleBookingsForPayout(influencerId);
    res.json({ items });
  }),
);

influencerPayoutsRouter.get(
  "/admin/:id",
  requireAuth,
  requirePermission("influencerPayouts", "view"),
  asyncHandler(async (req, res) => {
    const payout = await prisma.influencerPayout.findUnique({ where: { id: req.params.id }, include: payoutDetailInclude });
    if (!payout) throw new ApiError(404, "Payout not found.");
    res.json({ item: { ...payout, allowedTransitions: nextAllowedPayoutStatuses(payout.status) } });
  }),
);

influencerPayoutsRouter.post(
  "/admin",
  requireAuth,
  requirePermission("influencerPayouts", "update"),
  asyncHandler(async (req, res) => {
    const data = payoutBatchCreateSchema.parse(req.body);
    const payout = await createPayoutBatch(data.influencerId, data.bookingIds, data.notes);
    res.status(201).json({ item: { ...payout, allowedTransitions: nextAllowedPayoutStatuses(payout.status) } });
  }),
);

influencerPayoutsRouter.patch(
  "/admin/:id/status",
  requireAuth,
  requirePermission("influencerPayouts", "update"),
  asyncHandler(async (req, res) => {
    const data = payoutStatusUpdateSchema.parse(req.body);
    const updated = await transitionPayout(req.params.id!, data.status, req.user!.id, data.notes);
    res.json({ item: { ...updated, allowedTransitions: nextAllowedPayoutStatuses(updated.status) } });
  }),
);

// Admin override: move a payout to ANY status directly (including back to
// PENDING, which the guided /status route above never allows), for fixing
// mistakes like a payout marked PAID when the transfer never actually went
// through. Gated on "delete" rather than "update" -- like Bookings'
// equivalent override, this can undo a real processedAt/processedById
// record and release bundled bookings, unlike the guided transition route.
influencerPayoutsRouter.patch(
  "/admin/:id/status-override",
  requireAuth,
  requirePermission("influencerPayouts", "delete"),
  asyncHandler(async (req, res) => {
    const data = payoutStatusOverrideSchema.parse(req.body);
    const updated = await overridePayoutStatus(req.params.id!, data.status, req.user!.id, data.notes || undefined);
    res.json({ item: { ...updated, allowedTransitions: nextAllowedPayoutStatuses(updated.status) } });
  }),
);

// Payout *method* review queue (bank/IBAN/wallet details an influencer
// submitted from their dashboard) -- separate resource namespace under the
// same router since both concepts share the "influencerPayouts" permission.
influencerPayoutsRouter.get(
  "/admin/methods/queue",
  requireAuth,
  requirePermission("influencerPayouts", "view"),
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : "PENDING";
    const items = await prisma.influencerPayoutMethod.findMany({
      where: { status: status as "PENDING" | "APPROVED" | "REJECTED" },
      orderBy: { submittedAt: "asc" },
      include: { influencer: { select: { name: true, email: true, profile: { select: { username: true } } } } },
    });
    res.json({ items });
  }),
);

influencerPayoutsRouter.patch(
  "/admin/methods/:id",
  requireAuth,
  requirePermission("influencerPayouts", "update"),
  asyncHandler(async (req, res) => {
    const data = payoutMethodReviewSchema.parse(req.body);
    const method = await prisma.influencerPayoutMethod.findUnique({ where: { id: req.params.id } });
    if (!method) throw new ApiError(404, "Payout method not found.");

    const updated = await prisma.$transaction(async (tx) => {
      // Approving a method as the influencer's default demotes any other
      // default they had -- at most one APPROVED+default method per
      // influencer, matching what createPayoutBatch() relies on.
      if (data.status === "APPROVED" && method.isDefault) {
        await tx.influencerPayoutMethod.updateMany({
          where: { influencerId: method.influencerId, id: { not: method.id } },
          data: { isDefault: false },
        });
      }
      return tx.influencerPayoutMethod.update({
        where: { id: req.params.id },
        data: { status: data.status, reviewedById: req.user!.id, reviewedAt: new Date() },
      });
    });

    res.json({ item: updated });
  }),
);

const bulkDeleteSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });
const deletablePayoutStatuses = ["PENDING", "CANCELLED"] as const;

// Payouts are financial audit records -- delete is restricted to statuses
// that never represent money having actually moved (PENDING was never
// processed, CANCELLED explicitly didn't go through). PROCESSING/PAID/FAILED
// can never be deleted, only transitioned. InfluencerPayoutBooking rows for
// a deleted payout cascade (schema's onDelete: Cascade on payoutId), which
// also releases those bookings back into the eligible-for-payout pool.
influencerPayoutsRouter.post(
  "/admin/bulk-delete",
  requireAuth,
  requirePermission("influencerPayouts", "delete"),
  asyncHandler(async (req, res) => {
    const { ids } = bulkDeleteSchema.parse(req.body);
    const payouts = await prisma.influencerPayout.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } });
    const notDeletable = payouts.filter((p) => !(deletablePayoutStatuses as readonly string[]).includes(p.status));
    if (notDeletable.length > 0) {
      throw new ApiError(409, `${notDeletable.length} selected payout${notDeletable.length === 1 ? " is" : "s are"} processing or already paid and can't be deleted.`);
    }
    const { count } = await prisma.influencerPayout.deleteMany({ where: { id: { in: ids }, status: { in: [...deletablePayoutStatuses] } } });
    res.json({ count });
  }),
);

influencerPayoutsRouter.delete(
  "/admin/:id",
  requireAuth,
  requirePermission("influencerPayouts", "delete"),
  asyncHandler(async (req, res) => {
    const payout = await prisma.influencerPayout.findUnique({ where: { id: req.params.id } });
    if (!payout) throw new ApiError(404, "Payout not found.");
    if (!(deletablePayoutStatuses as readonly string[]).includes(payout.status)) {
      throw new ApiError(409, "Only pending or cancelled payouts can be deleted.");
    }
    await prisma.influencerPayout.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
