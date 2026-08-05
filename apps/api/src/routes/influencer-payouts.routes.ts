import { Router } from "express";
import { prisma } from "@agency/database";
import { payoutBatchCreateSchema, payoutStatusUpdateSchema, payoutMethodReviewSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";
import { parseListQuery, paginationMeta, exactFilter } from "../lib/list-query.js";
import { getEligibleBookingsForPayout, createPayoutBatch, nextAllowedPayoutStatuses, transitionPayout, payoutDetailInclude } from "../lib/payout.js";

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
