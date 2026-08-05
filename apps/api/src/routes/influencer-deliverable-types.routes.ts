import { Router } from "express";
import { prisma } from "@agency/database";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";

export const influencerDeliverableTypesRouter = Router();

// Public catalog -- only the types admin has enabled globally (brief §7:
// "Admin can enable or disable pricing fields"). Every DeliverableType enum
// value is seeded once and never created/deleted at runtime; admin only
// toggles/reorders/relabels the existing rows (see /admin below).
influencerDeliverableTypesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({
      items: await prisma.influencerDeliverableType.findMany({
        where: { isEnabledGlobally: true },
        orderBy: { order: "asc" },
      }),
    });
  }),
);

influencerDeliverableTypesRouter.get(
  "/admin",
  requireAuth,
  requirePermission("influencers", "view"),
  asyncHandler(async (_req, res) => {
    res.json({
      items: await prisma.influencerDeliverableType.findMany({ orderBy: { order: "asc" } }),
    });
  }),
);

influencerDeliverableTypesRouter.patch(
  "/admin/:id",
  requireAuth,
  requirePermission("influencers", "update"),
  asyncHandler(async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (typeof body.label === "string" && body.label.trim()) data.label = body.label.trim();
    if (typeof body.isEnabledGlobally === "boolean") data.isEnabledGlobally = body.isEnabledGlobally;
    if (typeof body.order === "number") data.order = body.order;

    const existing = await prisma.influencerDeliverableType.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Deliverable type not found.");

    res.json({ item: await prisma.influencerDeliverableType.update({ where: { id: req.params.id }, data }) });
  }),
);
