import { prisma } from "@agency/database";
import { getInfluencerSettings } from "./booking.js";

// Automated badges computable from data the schema actually tracks (brief
// §14). "Fast Growing" is deliberately excluded: there's no historical
// follower snapshot anywhere in the schema, so real growth can't be
// computed -- admin can still hand-award it from the Badges queue (source
// MANUAL), it just never gets an AUTOMATIC recommendation.
const AUTOMATIC_BADGE_KEYS = [
  "top-performer",
  "highly-engaged",
  "client-favorite",
  "trusted-creator",
  "trending",
  "premium",
  "rising-star",
  "verified",
  "authority",
] as const;

interface Metrics {
  influencerId: string;
  totalFollowers: number;
  avgEngagement: number;
  completedCampaigns: number;
  revenue: number;
  ratingAverage: number;
  ratingCount: number;
  repeatClients: number;
  recentBookings: number;
  maxPrice: number;
  isVerified: boolean;
  approvedDaysAgo: number;
  hasBadHistory: boolean;
}

function topPercentileSet(values: { influencerId: string; value: number }[], fraction: number, minValue = 0): Set<string> {
  const eligible = values.filter((v) => v.value > minValue).sort((a, b) => b.value - a.value);
  if (eligible.length === 0) return new Set();
  const cutoff = Math.max(1, Math.ceil(eligible.length * fraction));
  return new Set(eligible.slice(0, cutoff).map((v) => v.influencerId));
}

// Percentile rank (0..1) per influencer within a metric, used to build the
// weighted composite "top-performer" score -- keeps wildly different scales
// (followers in the thousands vs. a 0-5 rating) from dominating the sum.
function rankScore(values: { influencerId: string; value: number }[]): Map<string, number> {
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const n = sorted.length;
  const m = new Map<string, number>();
  sorted.forEach((v, i) => m.set(v.influencerId, n <= 1 ? 1 : i / (n - 1)));
  return m;
}

async function computeMetrics(): Promise<Metrics[]> {
  const influencers = await prisma.influencer.findMany({
    where: { status: "APPROVED" },
    select: {
      id: true,
      reviewedAt: true,
      profile: {
        select: {
          ratingAverage: true,
          ratingCount: true,
          isVerified: true,
          platforms: { select: { followers: true, engagementRate: true } },
          pricingItems: { select: { price: true } },
        },
      },
    },
  });

  const [completedAgg, recentAgg, badHistoryAgg, completedBookings] = await Promise.all([
    prisma.booking.groupBy({ by: ["influencerId"], where: { status: "COMPLETED" }, _count: { _all: true }, _sum: { grossAmount: true } }),
    prisma.booking.groupBy({
      by: ["influencerId"],
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      _count: { _all: true },
    }),
    prisma.booking.groupBy({ by: ["influencerId"], where: { status: { in: ["CANCELLED", "DISPUTED"] } }, _count: { _all: true } }),
    prisma.booking.findMany({ where: { status: "COMPLETED" }, select: { influencerId: true, contactEmail: true } }),
  ]);

  const completedByInfluencer = new Map(completedAgg.map((a) => [a.influencerId, a]));
  const recentByInfluencer = new Map(recentAgg.map((a) => [a.influencerId, a._count._all]));
  const badHistoryByInfluencer = new Map(badHistoryAgg.map((a) => [a.influencerId, a._count._all]));

  const clientsByInfluencer = new Map<string, Map<string, number>>();
  for (const b of completedBookings) {
    if (!clientsByInfluencer.has(b.influencerId)) clientsByInfluencer.set(b.influencerId, new Map());
    const m = clientsByInfluencer.get(b.influencerId)!;
    m.set(b.contactEmail, (m.get(b.contactEmail) ?? 0) + 1);
  }

  const metrics: Metrics[] = [];
  for (const inf of influencers) {
    if (!inf.profile) continue;
    const agg = completedByInfluencer.get(inf.id);
    const clientMap = clientsByInfluencer.get(inf.id);
    metrics.push({
      influencerId: inf.id,
      totalFollowers: inf.profile.platforms.reduce((s, p) => s + p.followers, 0),
      avgEngagement: inf.profile.platforms.length
        ? inf.profile.platforms.reduce((s, p) => s + Number(p.engagementRate), 0) / inf.profile.platforms.length
        : 0,
      completedCampaigns: agg?._count._all ?? 0,
      revenue: Number(agg?._sum.grossAmount ?? 0),
      ratingAverage: Number(inf.profile.ratingAverage),
      ratingCount: inf.profile.ratingCount,
      repeatClients: clientMap ? [...clientMap.values()].filter((c) => c > 1).length : 0,
      recentBookings: recentByInfluencer.get(inf.id) ?? 0,
      maxPrice: inf.profile.pricingItems.reduce((m, p) => Math.max(m, Number(p.price)), 0),
      isVerified: inf.profile.isVerified,
      approvedDaysAgo: inf.reviewedAt ? (Date.now() - inf.reviewedAt.getTime()) / (1000 * 60 * 60 * 24) : Number.POSITIVE_INFINITY,
      hasBadHistory: (badHistoryByInfluencer.get(inf.id) ?? 0) > 0,
    });
  }
  return metrics;
}

// Weighted sum of percentile ranks (0..1 each) -- exported so the admin
// Performance page can show the same score it's ranking by, not a
// recomputation that risks drifting from what actually drove recommendations.
export function computeCompositeScore(metrics: Metrics[]): Map<string, number> {
  const followerRank = rankScore(metrics.map((m) => ({ influencerId: m.influencerId, value: m.totalFollowers })));
  const engagementRank = rankScore(metrics.map((m) => ({ influencerId: m.influencerId, value: m.avgEngagement })));
  const campaignRank = rankScore(metrics.map((m) => ({ influencerId: m.influencerId, value: m.completedCampaigns })));
  const ratingRank = rankScore(metrics.map((m) => ({ influencerId: m.influencerId, value: m.ratingAverage })));
  const revenueRank = rankScore(metrics.map((m) => ({ influencerId: m.influencerId, value: m.revenue })));
  const repeatRank = rankScore(metrics.map((m) => ({ influencerId: m.influencerId, value: m.repeatClients })));

  const scores = new Map<string, number>();
  for (const m of metrics) {
    scores.set(
      m.influencerId,
      followerRank.get(m.influencerId)! * 0.2 +
        engagementRank.get(m.influencerId)! * 0.15 +
        campaignRank.get(m.influencerId)! * 0.2 +
        ratingRank.get(m.influencerId)! * 0.15 +
        revenueRank.get(m.influencerId)! * 0.2 +
        repeatRank.get(m.influencerId)! * 0.1,
    );
  }
  return scores;
}

function buildRecommendations(metrics: Metrics[]): Record<(typeof AUTOMATIC_BADGE_KEYS)[number], Set<string>> {
  const compositeScores = computeCompositeScore(metrics);
  const composite = metrics.map((m) => ({ influencerId: m.influencerId, value: compositeScores.get(m.influencerId)! }));

  return {
    "top-performer": topPercentileSet(composite, 0.2),
    "highly-engaged": topPercentileSet(metrics.map((m) => ({ influencerId: m.influencerId, value: m.avgEngagement })), 0.2),
    "client-favorite": new Set(metrics.filter((m) => m.repeatClients >= 2).map((m) => m.influencerId)),
    "trusted-creator": new Set(metrics.filter((m) => m.completedCampaigns >= 5 && !m.hasBadHistory).map((m) => m.influencerId)),
    trending: new Set(metrics.filter((m) => m.recentBookings >= 3).map((m) => m.influencerId)),
    premium: topPercentileSet(metrics.map((m) => ({ influencerId: m.influencerId, value: m.maxPrice })), 0.2),
    "rising-star": new Set(
      metrics.filter((m) => m.approvedDaysAgo <= 60 && (m.completedCampaigns >= 1 || m.ratingAverage >= 4)).map((m) => m.influencerId),
    ),
    verified: new Set(metrics.filter((m) => m.isVerified).map((m) => m.influencerId)),
    authority: topPercentileSet(metrics.map((m) => ({ influencerId: m.influencerId, value: m.ratingCount })), 0.2),
  };
}

// Admin-triggered (brief §14: "recommend badges automatically", not a cron)
// -- upserts RECOMMENDED rows for influencers who now qualify and clears
// RECOMMENDED rows (never APPROVED/REJECTED ones -- those are a human
// decision this pass must never overwrite) for influencers who no longer
// do, so the queue always reflects the latest run. No enclosing
// $transaction: each badge's create/delete batch is independent and
// idempotent, and serializing everything through one interactive
// transaction risks the same P2028 timeout other routes in this codebase
// hit against the remote Supabase pooler.
export async function runBadgeScoringPass(): Promise<{ recommended: number; cleared: number }> {
  const badges = await prisma.influencerBadge.findMany({ where: { key: { in: [...AUTOMATIC_BADGE_KEYS] } } });
  const badgeIdByKey = new Map(badges.map((b) => [b.key, b.id]));

  const [metrics, { badgeAutoApprovalEnabled }] = await Promise.all([computeMetrics(), getInfluencerSettings()]);
  const recommendations = buildRecommendations(metrics);

  const existingAwards = await prisma.influencerBadgeAward.findMany({
    where: { badgeId: { in: [...badgeIdByKey.values()] } },
    select: { id: true, influencerId: true, badgeId: true, status: true },
  });

  let recommended = 0;
  let cleared = 0;

  for (const key of AUTOMATIC_BADGE_KEYS) {
    const badgeId = badgeIdByKey.get(key);
    if (!badgeId) continue;
    const qualifying = recommendations[key];

    const existingForBadge = existingAwards.filter((a) => a.badgeId === badgeId);
    const existingInfluencerIds = new Set(existingForBadge.map((a) => a.influencerId));

    const toCreate = [...qualifying].filter((id) => !existingInfluencerIds.has(id));
    if (toCreate.length > 0) {
      const status = badgeAutoApprovalEnabled ? ("APPROVED" as const) : ("RECOMMENDED" as const);
      const result = await prisma.influencerBadgeAward.createMany({
        data: toCreate.map((influencerId) => ({
          influencerId,
          badgeId,
          status,
          source: "AUTOMATIC" as const,
          awardedAt: badgeAutoApprovalEnabled ? new Date() : null,
        })),
        skipDuplicates: true,
      });
      recommended += result.count;
    }

    const staleIds = existingForBadge.filter((a) => a.status === "RECOMMENDED" && !qualifying.has(a.influencerId)).map((a) => a.id);
    if (staleIds.length > 0) {
      const result = await prisma.influencerBadgeAward.deleteMany({ where: { id: { in: staleIds } } });
      cleared += result.count;
    }
  }

  return { recommended, cleared };
}

export interface PerformanceRankingRow {
  influencerId: string;
  name: string;
  username: string | null;
  isFeatured: boolean;
  featuredOrder: number;
  score: number;
  totalFollowers: number;
  avgEngagement: number;
  completedCampaigns: number;
  revenue: number;
  ratingAverage: number;
  repeatClients: number;
}

// Read-only ranked view for the admin Performance page -- the same
// composite score `runBadgeScoringPass` uses for the "top-performer" badge,
// alongside its inputs, so admin can see *why* someone ranked where they
// did before deciding whether to manually feature them.
export async function getPerformanceRanking(): Promise<PerformanceRankingRow[]> {
  const metrics = await computeMetrics();
  const scores = computeCompositeScore(metrics);

  const profiles = await prisma.influencerProfile.findMany({
    where: { influencerId: { in: metrics.map((m) => m.influencerId) } },
    select: { influencerId: true, username: true, isFeatured: true, featuredOrder: true, influencer: { select: { name: true } } },
  });
  const profileByInfluencer = new Map(profiles.map((p) => [p.influencerId, p]));

  return metrics
    .map((m) => {
      const profile = profileByInfluencer.get(m.influencerId);
      return {
        influencerId: m.influencerId,
        name: profile?.influencer.name ?? "—",
        username: profile?.username ?? null,
        isFeatured: profile?.isFeatured ?? false,
        featuredOrder: profile?.featuredOrder ?? 0,
        score: scores.get(m.influencerId) ?? 0,
        totalFollowers: m.totalFollowers,
        avgEngagement: m.avgEngagement,
        completedCampaigns: m.completedCampaigns,
        revenue: m.revenue,
        ratingAverage: m.ratingAverage,
        repeatClients: m.repeatClients,
      };
    })
    .sort((a, b) => b.score - a.score);
}
