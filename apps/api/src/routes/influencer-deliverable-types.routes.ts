import { Router } from "express";
import { z } from "zod";
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

const bulkDeleteSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });

// Unlike the fixed catalog's usual "never created/deleted at runtime" rule
// (see top-of-file note), staff can remove a row here -- but only if no
// influencer's InfluencerPricingItem references it by id, since that FK
// would otherwise silently orphan (or, given no onDelete: Cascade is set,
// simply be rejected by Postgres -- this pre-check just gives a clearer
// message than a raw P2003 would).
async function assertDeliverableTypesDeletable(ids: string[]) {
  const inUse = await prisma.influencerPricingItem.findMany({
    where: { deliverableTypeId: { in: ids } },
    select: { deliverableTypeId: true },
    distinct: ["deliverableTypeId"],
  });
  if (inUse.length === 0) return;
  const used = await prisma.influencerDeliverableType.findMany({
    where: { id: { in: inUse.map((i) => i.deliverableTypeId) } },
    select: { label: true },
  });
  throw new ApiError(
    409,
    `Still used in influencer pricing: ${used.map((u) => u.label).join(", ")}. Disable ${used.length === 1 ? "it" : "them"} instead.`,
  );
}

influencerDeliverableTypesRouter.post(
  "/admin/bulk-delete",
  requireAuth,
  requirePermission("influencers", "delete"),
  asyncHandler(async (req, res) => {
    const { ids } = bulkDeleteSchema.parse(req.body);
    await assertDeliverableTypesDeletable(ids);
    const { count } = await prisma.influencerDeliverableType.deleteMany({ where: { id: { in: ids } } });
    res.json({ count });
  }),
);

influencerDeliverableTypesRouter.delete(
  "/admin/:id",
  requireAuth,
  requirePermission("influencers", "delete"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.influencerDeliverableType.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Deliverable type not found.");
    await assertDeliverableTypesDeletable([req.params.id!]);
    await prisma.influencerDeliverableType.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
