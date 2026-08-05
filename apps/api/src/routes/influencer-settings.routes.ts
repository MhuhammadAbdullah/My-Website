import { Router } from "express";
import { z } from "zod";
import { prisma } from "@agency/database";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { getInfluencerSettings } from "../lib/booking.js";

export const influencerSettingsRouter = Router();

const updateSchema = z.object({
  defaultCommissionPercent: z.coerce.number().min(0).max(100).optional(),
  allowPerInfluencerOverride: z.boolean().optional(),
  allowPerCampaignOverride: z.boolean().optional(),
  minimumBookingAmount: z.coerce.number().min(0).nullable().optional(),
  payoutMinimumAmount: z.coerce.number().min(0).nullable().optional(),
  payoutProcessingDays: z.coerce.number().int().min(0).optional(),
  autoApproveApplications: z.boolean().optional(),
  requireIdentityVerification: z.boolean().optional(),
  badgeAutoApprovalEnabled: z.boolean().optional(),
  maxPricingCards: z.coerce.number().int().min(1).max(100).optional(),
});

influencerSettingsRouter.get(
  "/",
  requireAuth,
  requirePermission("influencerSettings", "view"),
  asyncHandler(async (_req, res) => {
    const settings = await getInfluencerSettings();
    res.json({ item: settings });
  }),
);

influencerSettingsRouter.patch(
  "/",
  requireAuth,
  requirePermission("influencerSettings", "update"),
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const existing = await getInfluencerSettings();
    const updated = await prisma.influencerSettings.update({ where: { id: existing.id }, data });
    res.json({ item: updated });
  }),
);
