import { Router } from "express";
import { prisma } from "@agency/database";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { resolveReportDateRange } from "../lib/date-range.js";

export const influencerReportsRouter = Router();

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function rangeFromQuery(query: Record<string, unknown>) {
  return resolveReportDateRange(str(query.datePreset), str(query.dateFrom), str(query.dateTo));
}

// Bookings report (brief §24: bookings/revenue/commission/campaign
// performance) -- one row per booking, capped at 5,000 rows like the
// Finance report's export cap, since this endpoint backs both the on-screen
// table and the CSV export.
influencerReportsRouter.get(
  "/admin/bookings",
  requireAuth,
  requirePermission("influencers", "view"),
  asyncHandler(async (req, res) => {
    const range = rangeFromQuery(req.query as Record<string, unknown>);
    const where = range ? { createdAt: { gte: range.start, lte: range.end } } : {};

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        bookingNumber: true,
        businessName: true,
        status: true,
        campaignType: true,
        grossAmount: true,
        discountAmount: true,
        commissionAmount: true,
        netInfluencerEarning: true,
        createdAt: true,
        completedAt: true,
        influencer: { select: { name: true, profile: { select: { username: true } } } },
      },
    });

    const items = bookings.map((b) => ({
      bookingNumber: b.bookingNumber,
      influencer: b.influencer.profile?.username ? `@${b.influencer.profile.username}` : b.influencer.name,
      businessName: b.businessName,
      campaignType: b.campaignType,
      status: b.status,
      grossAmount: Number(b.grossAmount),
      discountAmount: Number(b.discountAmount),
      commissionAmount: Number(b.commissionAmount),
      netInfluencerEarning: Number(b.netInfluencerEarning),
      createdAt: b.createdAt.toISOString(),
      completedAt: b.completedAt ? b.completedAt.toISOString() : "",
    }));

    const totals = items.reduce(
      (acc, r) => ({
        grossAmount: acc.grossAmount + r.grossAmount,
        commissionAmount: acc.commissionAmount + r.commissionAmount,
        netInfluencerEarning: acc.netInfluencerEarning + r.netInfluencerEarning,
      }),
      { grossAmount: 0, commissionAmount: 0, netInfluencerEarning: 0 },
    );

    res.json({ items, total: items.length, totals });
  }),
);

// Payouts report (brief §24: payouts/earnings)
influencerReportsRouter.get(
  "/admin/payouts",
  requireAuth,
  requirePermission("influencerPayouts", "view"),
  asyncHandler(async (req, res) => {
    const range = rangeFromQuery(req.query as Record<string, unknown>);
    const where = range ? { createdAt: { gte: range.start, lte: range.end } } : {};

    const payouts = await prisma.influencerPayout.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        payoutNumber: true,
        status: true,
        totalAmount: true,
        currency: true,
        method: true,
        createdAt: true,
        processedAt: true,
        influencer: { select: { name: true, profile: { select: { username: true } } } },
      },
    });

    const items = payouts.map((p) => ({
      payoutNumber: p.payoutNumber,
      influencer: p.influencer.profile?.username ? `@${p.influencer.profile.username}` : p.influencer.name,
      status: p.status,
      totalAmount: Number(p.totalAmount),
      currency: p.currency,
      method: p.method,
      createdAt: p.createdAt.toISOString(),
      processedAt: p.processedAt ? p.processedAt.toISOString() : "",
    }));

    const totals = items.reduce((acc, r) => ({ totalAmount: acc.totalAmount + r.totalAmount }), { totalAmount: 0 });

    res.json({ items, total: items.length, totals });
  }),
);

// Top influencers / top categories (brief §24), same shape the admin
// dashboard widget uses but with a caller-supplied date range instead of a
// fixed "last 6 months" window.
influencerReportsRouter.get(
  "/admin/top-influencers",
  requireAuth,
  requirePermission("influencers", "view"),
  asyncHandler(async (req, res) => {
    const range = rangeFromQuery(req.query as Record<string, unknown>);
    const where = { status: "COMPLETED" as const, ...(range ? { completedAt: { gte: range.start, lte: range.end } } : {}) };

    const grouped = await prisma.booking.groupBy({
      by: ["influencerId"],
      where,
      _sum: { grossAmount: true, netInfluencerEarning: true },
      _count: { _all: true },
      orderBy: { _sum: { grossAmount: "desc" } },
      take: 20,
    });
    const profiles = await prisma.influencer.findMany({
      where: { id: { in: grouped.map((g) => g.influencerId) } },
      select: { id: true, name: true, profile: { select: { username: true } } },
    });
    const profileById = new Map(profiles.map((p) => [p.id, p]));

    res.json({
      items: grouped.map((g) => ({
        influencer: profileById.get(g.influencerId)?.profile?.username
          ? `@${profileById.get(g.influencerId)!.profile!.username}`
          : (profileById.get(g.influencerId)?.name ?? "—"),
        completedCampaigns: g._count._all,
        revenue: Number(g._sum.grossAmount ?? 0),
        netEarning: Number(g._sum.netInfluencerEarning ?? 0),
      })),
    });
  }),
);

influencerReportsRouter.get(
  "/admin/top-categories",
  requireAuth,
  requirePermission("influencers", "view"),
  asyncHandler(async (_req, res) => {
    const categories = await prisma.influencerCategory.findMany({
      select: { id: true, name: true, _count: { select: { influencers: true } } },
      orderBy: { influencers: { _count: "desc" } },
      take: 20,
    });
    res.json({ items: categories.map((c) => ({ name: c.name, influencerCount: c._count.influencers })) });
  }),
);
