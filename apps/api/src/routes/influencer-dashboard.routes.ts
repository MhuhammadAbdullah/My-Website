import { Router } from "express";
import { prisma } from "@agency/database";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { getInfluencerFlags } from "../lib/influencer-flags.js";

export const influencerDashboardRouter = Router();

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

influencerDashboardRouter.get(
  "/admin/stats",
  requireAuth,
  requirePermission("influencers", "view"),
  asyncHandler(async (_req, res) => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [
      pendingApplications,
      approvedInfluencers,
      totalBookings,
      bookingsThisMonth,
      completedAgg,
      pendingPayoutAgg,
      recentBookings,
      categories,
      flags,
    ] = await Promise.all([
      prisma.influencer.count({ where: { status: "PENDING" } }),
      prisma.influencer.count({ where: { status: "APPROVED" } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
      prisma.booking.aggregate({ where: { status: "COMPLETED" }, _sum: { grossAmount: true, commissionAmount: true } }),
      prisma.influencerPayout.aggregate({ where: { status: { in: ["PENDING", "PROCESSING"] } }, _sum: { totalAmount: true } }),
      prisma.booking.findMany({
        where: { status: "COMPLETED", completedAt: { gte: sixMonthsAgo } },
        select: { completedAt: true, grossAmount: true },
      }),
      prisma.influencerCategory.findMany({
        select: { id: true, name: true, _count: { select: { influencers: true } } },
        orderBy: { influencers: { _count: "desc" } },
        take: 5,
      }),
      getInfluencerFlags(),
    ]);

    const topInfluencersRaw = await prisma.booking.groupBy({
      by: ["influencerId"],
      where: { status: "COMPLETED" },
      _sum: { grossAmount: true },
      orderBy: { _sum: { grossAmount: "desc" } },
      take: 5,
    });
    const topInfluencerProfiles = await prisma.influencer.findMany({
      where: { id: { in: topInfluencersRaw.map((t) => t.influencerId) } },
      select: { id: true, name: true, profile: { select: { username: true } } },
    });
    const profileById = new Map(topInfluencerProfiles.map((p) => [p.id, p]));
    const topInfluencers = topInfluencersRaw.map((t) => ({
      id: t.influencerId,
      name: profileById.get(t.influencerId)?.name ?? "—",
      username: profileById.get(t.influencerId)?.profile?.username ?? null,
      revenue: Number(t._sum.grossAmount ?? 0),
    }));

    const monthBuckets = new Map<string, { bookings: number; revenue: number }>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      monthBuckets.set(monthKey(d), { bookings: 0, revenue: 0 });
    }
    for (const b of recentBookings) {
      if (!b.completedAt) continue;
      const key = monthKey(b.completedAt);
      const bucket = monthBuckets.get(key);
      if (bucket) {
        bucket.bookings += 1;
        bucket.revenue += Number(b.grossAmount);
      }
    }

    res.json({
      pendingApplications,
      approvedInfluencers,
      totalBookings,
      bookingsThisMonth,
      totalRevenue: Number(completedAgg._sum.grossAmount ?? 0),
      totalCommission: Number(completedAgg._sum.commissionAmount ?? 0),
      pendingPayouts: Number(pendingPayoutAgg._sum.totalAmount ?? 0),
      topInfluencers,
      topCategories: categories.map((c) => ({ id: c.id, name: c.name, count: c._count.influencers })),
      monthlyGrowth: [...monthBuckets.entries()].map(([month, v]) => ({ month, ...v })),
      flags: { marketplaceEnabled: flags.marketplaceEnabled, registrationEnabled: flags.registrationEnabled, bookingsEnabled: flags.bookingsEnabled },
    });
  }),
);
