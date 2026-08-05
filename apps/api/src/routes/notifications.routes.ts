import { Router } from "express";
import { prisma } from "@agency/database";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";

// Staff-facing half of the polymorphic Notification model (brief §8's
// notification bell) -- the influencer-facing half lives on
// influencerMeRouter (/influencers/me/notifications) since that's where
// every other self-scoped influencer endpoint already lives. Both write
// through notify.ts; this router only ever reads/marks-read.
export const notificationsRouter = Router();

function parseLimit(value: unknown): number {
  const n = Number.parseInt(String(value ?? "20"), 10);
  return Math.min(50, Math.max(1, Number.isFinite(n) && n > 0 ? n : 20));
}

notificationsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const where = { recipientType: "STAFF" as const, recipientUserId: req.user!.id };
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: parseLimit(req.query.limit) }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);
    res.json({ items, unreadCount });
  }),
);

notificationsRouter.patch(
  "/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    // Scoped by recipientUserId in the lookup itself (not checked after the
    // fact) -- another staffer's notification 404s exactly like one that
    // doesn't exist, rather than leaking its existence or letting anyone
    // mark anyone else's notifications read.
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, recipientType: "STAFF", recipientUserId: req.user!.id },
    });
    if (!notification) throw new ApiError(404, "Notification not found.");
    const updated = await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true, readAt: new Date() } });
    res.json({ item: updated });
  }),
);

notificationsRouter.post(
  "/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { recipientType: "STAFF", recipientUserId: req.user!.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    res.status(204).send();
  }),
);
