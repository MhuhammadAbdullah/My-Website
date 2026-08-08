import { Router } from "express";
import { z } from "zod";
import { prisma, type Prisma } from "@agency/database";
import { popupSchema, type PopupInput } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { parseListQuery, paginationMeta, searchFilter, exactFilter } from "../lib/list-query.js";

// Admin CRUD below is fully auth-gated, same reasoning as discounts.routes.ts:
// a Popup row's targeting/trigger/frequency config and analytics counts
// should never be fetchable by an unauthenticated client wholesale. The
// public surface (GET /active, POST /:id/impression, POST /:id/click) is
// separate and purpose-built -- /active returns only currently-eligible
// popups through an explicit `select`, never internalNotes or the raw
// impression/click counts.
export const popupsRouter = Router();

const sortableFields = ["createdAt", "name", "priority", "impressionCount", "clickCount"];

const popupInclude = { image: true };

// What the public site needs to decide whether/how to render a popup --
// deliberately narrower than popupInclude (no internalNotes, no analytics
// counters) even though this route has no auth to hide behind.
const publicPopupSelect = {
  id: true,
  templateType: true,
  priority: true,
  heading: true,
  description: true,
  image: { select: { id: true, url: true, width: true, height: true, altText: true } },
  imageLinkUrl: true,
  ctaEnabled: true,
  ctaText: true,
  ctaUrl: true,
  ctaOpenNewTab: true,
  countdownEndAt: true,
  countdownTimezone: true,
  countdownExpiryAction: true,
  countdownExpiryMessage: true,
  design: true,
  targeting: true,
  trigger: true,
  frequency: true,
  deviceTarget: true,
  closeOnOverlayClick: true,
} satisfies Prisma.PopupSelect;

function normalizeBody(data: PopupInput): Prisma.PopupUncheckedCreateInput {
  return {
    name: data.name,
    internalNotes: data.internalNotes || null,
    templateType: data.templateType,
    isActive: data.isActive,
    priority: data.priority,
    startsAt: data.startsAt ?? null,
    endsAt: data.endsAt ?? null,
    heading: data.heading || null,
    description: data.description || null,
    imageId: data.imageId || null,
    imageLinkUrl: data.imageLinkUrl || null,
    ctaEnabled: data.ctaEnabled,
    ctaText: data.ctaEnabled ? data.ctaText || null : null,
    ctaUrl: data.ctaEnabled ? data.ctaUrl || null : null,
    ctaOpenNewTab: data.ctaOpenNewTab,
    countdownEndAt: data.countdownEndAt ?? null,
    countdownTimezone: data.countdownTimezone || null,
    countdownExpiryAction: data.countdownExpiryAction,
    countdownExpiryMessage: data.countdownExpiryMessage || null,
    design: data.design as Prisma.InputJsonValue,
    targeting: data.targeting as Prisma.InputJsonValue,
    trigger: data.trigger as Prisma.InputJsonValue,
    frequency: data.frequency as Prisma.InputJsonValue,
    deviceTarget: data.deviceTarget,
    closeOnOverlayClick: data.closeOnOverlayClick,
  };
}

popupsRouter.get(
  "/admin",
  requireAuth,
  requirePermission("popups", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, { sortableFields, defaultSort: "priority" });
    const where = { ...searchFilter(search, ["name"]), ...exactFilter(req.query, "isActive"), ...exactFilter(req.query, "templateType") };

    const [items, total] = await Promise.all([
      prisma.popup.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit, include: popupInclude }),
      prisma.popup.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

popupsRouter.post(
  "/",
  requireAuth,
  requirePermission("popups", "create"),
  asyncHandler(async (req, res) => {
    const data = popupSchema.parse(req.body);
    const created = await prisma.popup.create({ data: normalizeBody(data), include: popupInclude });
    res.status(201).json({ item: created });
  }),
);

popupsRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("popups", "update"),
  asyncHandler(async (req, res) => {
    const data = popupSchema.parse(req.body);
    const updated = await prisma.popup.update({ where: { id: req.params.id }, data: normalizeBody(data), include: popupInclude });
    res.json({ item: updated });
  }),
);

const toggleSchema = z.object({ isActive: z.boolean() });

// Lightweight partial update for the list page's Active/Inactive Switch --
// popupSchema.parse requires the full form (name, template, all four config
// blobs, ...), which the list row doesn't have loaded, so a real PATCH /:id
// would need the whole popup re-fetched first just to flip one boolean.
popupsRouter.patch(
  "/:id/toggle",
  requireAuth,
  requirePermission("popups", "update"),
  asyncHandler(async (req, res) => {
    const { isActive } = toggleSchema.parse(req.body);
    const updated = await prisma.popup.update({ where: { id: req.params.id }, data: { isActive }, include: popupInclude });
    res.json({ item: updated });
  }),
);

popupsRouter.post(
  "/:id/duplicate",
  requireAuth,
  requirePermission("popups", "create"),
  asyncHandler(async (req, res) => {
    const original = await prisma.popup.findUniqueOrThrow({ where: { id: req.params.id } });
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, impressionCount: _impressionCount, clickCount: _clickCount, ...rest } = original;
    const item = await prisma.popup.create({
      data: {
        ...rest,
        name: `${original.name} (Copy)`,
        isActive: false,
        impressionCount: 0,
        clickCount: 0,
        design: rest.design as Prisma.InputJsonValue,
        targeting: rest.targeting as Prisma.InputJsonValue,
        trigger: rest.trigger as Prisma.InputJsonValue,
        frequency: rest.frequency as Prisma.InputJsonValue,
      },
      include: popupInclude,
    });
    res.status(201).json({ item });
  }),
);

popupsRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("popups", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.popup.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

// ---------------------------------------------------------------------------
// Public surface -- no requireAuth. Targeting (which page/URL/device) and
// triggers (delay/scroll/exit-intent/frequency) are evaluated client-side in
// apps/web, since pathname and viewport are only known there; this endpoint
// just narrows the universe down to popups that are switched on and inside
// their scheduled window, ordered by priority so the client's "show the
// highest-priority eligible one" logic doesn't need to re-sort.
popupsRouter.get(
  "/active",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const items = await prisma.popup.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { priority: "desc" },
      select: publicPopupSelect,
    });
    res.json({ items });
  }),
);

// updateMany (not update) so a stale/removed popup id from a client that
// loaded before a delete just no-ops instead of 404ing -- these are
// fire-and-forget beacons from apps/web, nothing reads the response body.
popupsRouter.post(
  "/:id/impression",
  asyncHandler(async (req, res) => {
    await prisma.popup.updateMany({ where: { id: req.params.id }, data: { impressionCount: { increment: 1 } } });
    res.status(204).send();
  }),
);

popupsRouter.post(
  "/:id/click",
  asyncHandler(async (req, res) => {
    await prisma.popup.updateMany({ where: { id: req.params.id }, data: { clickCount: { increment: 1 } } });
    res.status(204).send();
  }),
);
