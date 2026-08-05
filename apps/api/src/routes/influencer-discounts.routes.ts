import { Router } from "express";
import { prisma } from "@agency/database";
import { influencerDiscountResponseSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireInfluencerAuth, requireApprovedInfluencer } from "../middleware/require-influencer-auth.js";
import { ApiError } from "../middleware/error-handler.js";
import { parseListQuery, paginationMeta } from "../lib/list-query.js";
import { notifyStaffByPermission } from "../lib/notify.js";

// Influencers never create their own discounts -- admin proposes one (any
// scope: ALL/CATEGORY/FIRST_BOOKING broadcasts to every eligible
// influencer, INFLUENCER targets just one) and each affected influencer
// gets their own DiscountInfluencerResponse row (fanned out by
// syncDiscountResponses in discounts.routes.ts) to individually accept or
// decline, never edit its terms. Ownership is checked on every read/write
// so one influencer can't respond to another's row even by guessing an id.
export const influencerDiscountsRouter = Router();

const sortableFields = ["createdAt"];

influencerDiscountsRouter.get(
  "/",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, { sortableFields, defaultSort: "createdAt" });

    const where = { influencerId: req.influencer!.id };
    const [items, total] = await Promise.all([
      prisma.discountInfluencerResponse.findMany({
        where,
        include: { discount: true },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.discountInfluencerResponse.count({ where }),
    ]);
    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

// Not locked to PENDING-only: an influencer can change their mind at any
// time -- approve something they'd declined, or withdraw an approval
// they'd given (which immediately stops it showing on their cards/applying
// to their bookings, same as if they'd declined it from the start). Only a
// no-op (re-submitting the same decision they're already at) is rejected.
influencerDiscountsRouter.patch(
  "/:id/respond",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    const response = await prisma.discountInfluencerResponse.findFirst({
      where: { id: req.params.id, influencerId: req.influencer!.id },
      include: { discount: true },
    });
    if (!response) throw new ApiError(404, "Discount not found.");
    const { decision } = influencerDiscountResponseSchema.parse(req.body);
    if (response.status === decision) {
      throw new ApiError(409, `This discount is already ${decision.toLowerCase()}.`);
    }

    const item = await prisma.discountInfluencerResponse.update({
      where: { id: response.id },
      data: { status: decision, respondedAt: new Date() },
      include: { discount: true },
    });

    void notifyStaffByPermission("discounts", "view", {
      type: decision === "APPROVED" ? "discount.approved" : "discount.declined",
      title: decision === "APPROVED" ? "Discount approved by influencer" : "Discount declined/withdrawn by influencer",
      body: `"${response.discount.label}" was ${decision === "APPROVED" ? "approved" : "declined"} by an influencer it was proposed to.`,
      linkUrl: "/influencers/discounts",
    });

    res.json({ item });
  }),
);
