import { Router } from "express";
import { z } from "zod";
import { prisma } from "@agency/database";
import { influencerBadgeSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";
import { runBadgeScoringPass, getPerformanceRanking } from "../lib/badge-scoring.js";
import { notifyInfluencer } from "../lib/notify.js";

export const influencerBadgesRouter = Router();

influencerBadgesRouter.get(
  "/admin/performance",
  requireAuth,
  requirePermission("influencerBadges", "view"),
  asyncHandler(async (_req, res) => {
    res.json({ items: await getPerformanceRanking() });
  }),
);

influencerBadgesRouter.post(
  "/admin/run-scoring",
  requireAuth,
  requirePermission("influencerBadges", "update"),
  asyncHandler(async (_req, res) => {
    res.json(await runBadgeScoringPass());
  }),
);

influencerBadgesRouter.get(
  "/admin/catalog",
  requireAuth,
  requirePermission("influencerBadges", "view"),
  asyncHandler(async (_req, res) => {
    res.json({ items: await prisma.influencerBadge.findMany({ orderBy: { order: "asc" } }) });
  }),
);

// Catalog CRUD (brief §14: badge types themselves, distinct from the
// award queue above) -- admin defines the badge and picks its display
// color here; individual influencers only ever receive an *award* of one
// of these via the queue/manual-award endpoints below, never create one.
influencerBadgesRouter.post(
  "/admin/catalog",
  requireAuth,
  requirePermission("influencerBadges", "create"),
  asyncHandler(async (req, res) => {
    const data = influencerBadgeSchema.parse(req.body);
    const existing = await prisma.influencerBadge.findUnique({ where: { key: data.key } });
    if (existing) throw new ApiError(409, "A badge with this key already exists.");

    const item = await prisma.influencerBadge.create({
      data: {
        key: data.key,
        label: data.label,
        description: data.description || null,
        iconKey: data.iconKey || null,
        color: data.color ?? null,
        isAutomated: data.isAutomated,
        order: data.order,
      },
    });
    res.status(201).json({ item });
  }),
);

influencerBadgesRouter.patch(
  "/admin/catalog/:id",
  requireAuth,
  requirePermission("influencerBadges", "update"),
  asyncHandler(async (req, res) => {
    const data = influencerBadgeSchema.parse(req.body);
    const badge = await prisma.influencerBadge.findUnique({ where: { id: req.params.id } });
    if (!badge) throw new ApiError(404, "Badge not found.");

    // `key` is intentionally immutable after creation -- badge-scoring.ts's
    // automated pass matches recommendations against it, so silently
    // changing it would orphan any already-awarded rows' meaning.
    const item = await prisma.influencerBadge.update({
      where: { id: req.params.id },
      data: {
        label: data.label,
        description: data.description || null,
        iconKey: data.iconKey || null,
        color: data.color ?? null,
        isAutomated: data.isAutomated,
        order: data.order,
      },
    });
    res.json({ item });
  }),
);

influencerBadgesRouter.delete(
  "/admin/catalog/:id",
  requireAuth,
  requirePermission("influencerBadges", "delete"),
  asyncHandler(async (req, res) => {
    const badge = await prisma.influencerBadge.findUnique({ where: { id: req.params.id } });
    if (!badge) throw new ApiError(404, "Badge not found.");
    // Cascades to InfluencerBadgeAward (schema's onDelete: Cascade) --
    // deleting a catalog badge deliberately also removes it from every
    // influencer who was awarded it, since it no longer exists to display.
    await prisma.influencerBadge.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

influencerBadgesRouter.get(
  "/admin/queue",
  requireAuth,
  requirePermission("influencerBadges", "view"),
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : "RECOMMENDED";
    const items = await prisma.influencerBadgeAward.findMany({
      where: { status: status as "RECOMMENDED" | "APPROVED" | "REJECTED" },
      orderBy: { createdAt: "desc" },
      include: {
        badge: true,
        influencer: { select: { id: true, name: true, profile: { select: { username: true } } } },
      },
    });
    res.json({ items });
  }),
);

const reviewSchema = z.object({ status: z.enum(["APPROVED", "REJECTED"]) });

influencerBadgesRouter.patch(
  "/admin/:id",
  requireAuth,
  requirePermission("influencerBadges", "update"),
  asyncHandler(async (req, res) => {
    const data = reviewSchema.parse(req.body);
    const award = await prisma.influencerBadgeAward.findUnique({ where: { id: req.params.id }, include: { badge: true } });
    if (!award) throw new ApiError(404, "Badge award not found.");

    const updated = await prisma.influencerBadgeAward.update({
      where: { id: req.params.id },
      data: { status: data.status, reviewedById: req.user!.id, reviewedAt: new Date(), awardedAt: data.status === "APPROVED" ? new Date() : null },
      include: { badge: true, influencer: { select: { id: true, name: true, profile: { select: { username: true } } } } },
    });

    if (data.status === "APPROVED") {
      void notifyInfluencer(award.influencerId, {
        type: "badge.approved",
        title: "You earned a new badge",
        body: `Your "${award.badge.label}" badge is now live on your public profile.`,
        linkUrl: "/influencer/dashboard/profile",
      });
    }

    res.json({ item: updated });
  }),
);

const manualAwardSchema = z.object({
  influencerId: z.string().min(1),
  badgeId: z.string().min(1),
});

// Admin's manual override (brief §14) -- also the only path to award
// "Fast Growing", which never gets an AUTOMATIC recommendation (see
// lib/badge-scoring.ts). Goes straight to APPROVED: a staff member
// deliberately picking "award this badge to this influencer" doesn't need
// a second self-review step the way an algorithmic RECOMMENDED row does.
influencerBadgesRouter.post(
  "/admin",
  requireAuth,
  requirePermission("influencerBadges", "update"),
  asyncHandler(async (req, res) => {
    const data = manualAwardSchema.parse(req.body);
    const item = await prisma.influencerBadgeAward.upsert({
      where: { influencerId_badgeId: { influencerId: data.influencerId, badgeId: data.badgeId } },
      update: { status: "APPROVED", source: "MANUAL", reviewedById: req.user!.id, reviewedAt: new Date(), awardedAt: new Date() },
      create: {
        influencerId: data.influencerId,
        badgeId: data.badgeId,
        status: "APPROVED",
        source: "MANUAL",
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
        awardedAt: new Date(),
      },
      include: { badge: true, influencer: { select: { id: true, name: true, profile: { select: { username: true } } } } },
    });
    res.status(201).json({ item });
  }),
);

influencerBadgesRouter.delete(
  "/admin/:id",
  requireAuth,
  requirePermission("influencerBadges", "update"),
  asyncHandler(async (req, res) => {
    await prisma.influencerBadgeAward.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
