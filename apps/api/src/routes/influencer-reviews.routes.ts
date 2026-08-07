import { Router } from "express";
import { z } from "zod";
import { prisma, type Prisma } from "@agency/database";
import { influencerReviewSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";
import { parseListQuery, paginationMeta, searchFilter, exactFilter } from "../lib/list-query.js";

// Admin-authored testimonials for an influencer's public profile -- no
// client-facing submission flow exists (or is planned); admin writes the
// review text and assigns the star rating directly, distinct from the
// unrelated booking-linked InfluencerReview.bookingId (always null here).
// Reuses the "influencers" permission resource rather than inventing a new
// one -- managing an influencer's public reviews is squarely "managing
// influencers".
export const influencerReviewsRouter = Router();

const detailInclude = {
  influencer: { select: { id: true, name: true, profile: { select: { username: true } } } },
};

const sortableFields = ["authorName", "rating", "status", "createdAt"];

// InfluencerProfile.ratingAverage/ratingCount (brief: "actual jitne bhi
// reviews mile hain un ke total numbers star ke sath show hon") are
// recomputed from every PUBLISHED review whenever the set changes --
// DRAFT/ARCHIVED reviews don't count, matching what the public detail
// route already filters on for the ones it actually displays.
async function recomputeRating(influencerId: string) {
  const agg = await prisma.influencerReview.aggregate({
    where: { influencerId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await prisma.influencerProfile.updateMany({
    where: { influencerId },
    data: { ratingAverage: agg._avg.rating ?? 0, ratingCount: agg._count.rating },
  });
}

// One row per influencer instead of one per review -- an influencer with
// 500 reviews previously meant 500 rows in the admin table, all against
// the same influencer, which got slower and more cluttered the more
// reviews existed (exactly backwards: popular/well-reviewed influencers
// should be *cheaper* to scan in the admin list, not more expensive). This
// GROUP BY influencerId aggregate is O(distinct influencers with reviews),
// not O(reviews) -- unaffected by how many reviews any single influencer
// has. Sortable by the aggregate values (total/average/latest) rather than
// by influencer name, since name lives on a joined model groupBy can't
// order by directly; `search` still filters through the relation via
// `where` (evaluated before grouping), just not usable as a sort key.
const summarySortFields = ["totalReviews", "averageRating", "latestReviewDate"] as const;
type SummarySortField = (typeof summarySortFields)[number];

influencerReviewsRouter.get(
  "/admin/summary",
  requireAuth,
  requirePermission("influencers", "view"),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "10"), 10) || 10));
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const sortByRaw = typeof req.query.sortBy === "string" ? req.query.sortBy : "latestReviewDate";
    const sortBy: SummarySortField = (summarySortFields as readonly string[]).includes(sortByRaw)
      ? (sortByRaw as SummarySortField)
      : "latestReviewDate";
    const sortOrder: "asc" | "desc" = req.query.sortOrder === "asc" ? "asc" : "desc";

    const where: Prisma.InfluencerReviewWhereInput = search
      ? {
          OR: [
            { influencer: { name: { contains: search, mode: "insensitive" } } },
            { influencer: { profile: { username: { contains: search, mode: "insensitive" } } } },
          ],
        }
      : {};

    // Total distinct influencers matching `where`, for pagination -- one
    // full (unpaginated) grouping pass, but bounded by influencer count,
    // not review count, so this stays cheap even for influencers with
    // thousands of reviews each.
    const allGroups = await prisma.influencerReview.groupBy({ by: ["influencerId"], where });
    const total = allGroups.length;

    // `orderBy` has to be inlined at the call site rather than built as a
    // separately-typed variable -- Prisma's groupBy conditional types
    // (validating every orderBy field is either in `by` or a wrapped
    // aggregate) only resolve correctly against the literal object shape
    // passed directly to the call, not a widened `Prisma.…OrderByInput`.
    const groups =
      sortBy === "totalReviews"
        ? await prisma.influencerReview.groupBy({
            by: ["influencerId"],
            where,
            _count: { id: true },
            _avg: { rating: true },
            _max: { createdAt: true },
            orderBy: { _count: { id: sortOrder } },
            skip: (page - 1) * limit,
            take: limit,
          })
        : sortBy === "averageRating"
          ? await prisma.influencerReview.groupBy({
              by: ["influencerId"],
              where,
              _count: { id: true },
              _avg: { rating: true },
              _max: { createdAt: true },
              orderBy: { _avg: { rating: sortOrder } },
              skip: (page - 1) * limit,
              take: limit,
            })
          : await prisma.influencerReview.groupBy({
              by: ["influencerId"],
              where,
              _count: { id: true },
              _avg: { rating: true },
              _max: { createdAt: true },
              orderBy: { _max: { createdAt: sortOrder } },
              skip: (page - 1) * limit,
              take: limit,
            });
    const pageIds = groups.map((g) => g.influencerId);

    // Two more batched queries (not per-row) for the page's worth of
    // influencer details and published-only counts -- both use `in:`
    // over just this page's ids, so cost is bounded by `limit`, never by
    // total influencer or review count.
    const [profiles, publishedGroups] = await Promise.all([
      pageIds.length
        ? prisma.influencerProfile.findMany({
            where: { influencerId: { in: pageIds } },
            select: {
              influencerId: true,
              username: true,
              profilePhoto: true,
              influencer: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      pageIds.length
        ? prisma.influencerReview.groupBy({
            by: ["influencerId"],
            where: { influencerId: { in: pageIds }, status: "PUBLISHED" },
            _count: { id: true },
          })
        : Promise.resolve([]),
    ]);
    const profileById = new Map(profiles.map((p) => [p.influencerId, p]));
    const publishedById = new Map(publishedGroups.map((g) => [g.influencerId, g._count.id]));

    const items = groups.map((g) => {
      const profile = profileById.get(g.influencerId);
      return {
        influencerId: g.influencerId,
        name: profile?.influencer.name ?? "Unknown",
        username: profile?.username ?? null,
        profilePhoto: profile?.profilePhoto ?? null,
        totalReviews: g._count.id,
        publishedReviews: publishedById.get(g.influencerId) ?? 0,
        averageRating: g._avg.rating ?? 0,
        latestReviewDate: g._max.createdAt,
      };
    });

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

// Detail-page header: this influencer's full aggregate + star breakdown.
// The breakdown groupBy alone gives every number the header needs (total
// = sum of counts, average = weighted sum/total) without a second
// aggregate() call -- only the published-only count needs its own query.
influencerReviewsRouter.get(
  "/admin/summary/:influencerId",
  requireAuth,
  requirePermission("influencers", "view"),
  asyncHandler(async (req, res) => {
    const profile = await prisma.influencerProfile.findUnique({
      where: { influencerId: req.params.influencerId },
      select: { influencerId: true, username: true, profilePhoto: true, influencer: { select: { name: true } } },
    });
    if (!profile) throw new ApiError(404, "Influencer not found.");

    const [ratingGroups, publishedCount] = await Promise.all([
      prisma.influencerReview.groupBy({
        by: ["rating"],
        where: { influencerId: req.params.influencerId },
        _count: { id: true },
      }),
      prisma.influencerReview.count({ where: { influencerId: req.params.influencerId, status: "PUBLISHED" } }),
    ]);

    const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalReviews = 0;
    let ratingSum = 0;
    for (const g of ratingGroups) {
      const rating = g.rating as 1 | 2 | 3 | 4 | 5;
      if (rating in breakdown) breakdown[rating] = g._count.id;
      totalReviews += g._count.id;
      ratingSum += g.rating * g._count.id;
    }

    res.json({
      influencer: {
        id: profile.influencerId,
        name: profile.influencer.name,
        username: profile.username,
        profilePhoto: profile.profilePhoto,
      },
      totalReviews,
      publishedReviews: publishedCount,
      averageRating: totalReviews > 0 ? ratingSum / totalReviews : 0,
      breakdown,
    });
  }),
);

influencerReviewsRouter.get(
  "/admin",
  requireAuth,
  requirePermission("influencers", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, { sortableFields, defaultSort: "createdAt" });
    const where = {
      ...searchFilter(search, ["authorName", "comment"]),
      ...exactFilter(req.query, "status"),
      ...exactFilter(req.query, "influencerId"),
    } as Prisma.InfluencerReviewWhereInput;

    const [items, total] = await Promise.all([
      prisma.influencerReview.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit, include: detailInclude }),
      prisma.influencerReview.count({ where }),
    ]);
    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

influencerReviewsRouter.post(
  "/",
  requireAuth,
  requirePermission("influencers", "update"),
  asyncHandler(async (req, res) => {
    const data = influencerReviewSchema.parse(req.body);
    const item = await prisma.influencerReview.create({
      data: {
        influencerId: data.influencerId,
        authorName: data.authorName,
        authorCompany: data.authorCompany || null,
        rating: data.rating,
        comment: data.comment,
        status: data.status,
      },
      include: detailInclude,
    });
    await recomputeRating(data.influencerId);
    res.status(201).json({ item });
  }),
);

influencerReviewsRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("influencers", "update"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.influencerReview.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Review not found.");
    const data = influencerReviewSchema.parse(req.body);

    const item = await prisma.influencerReview.update({
      where: { id: req.params.id },
      data: {
        influencerId: data.influencerId,
        authorName: data.authorName,
        authorCompany: data.authorCompany || null,
        rating: data.rating,
        comment: data.comment,
        status: data.status,
      },
      include: detailInclude,
    });

    await recomputeRating(existing.influencerId);
    if (existing.influencerId !== data.influencerId) await recomputeRating(data.influencerId);
    res.json({ item });
  }),
);

const bulkDeleteSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });

influencerReviewsRouter.post(
  "/bulk-delete",
  requireAuth,
  requirePermission("influencers", "delete"),
  asyncHandler(async (req, res) => {
    const { ids } = bulkDeleteSchema.parse(req.body);
    const existing = await prisma.influencerReview.findMany({ where: { id: { in: ids } }, select: { influencerId: true } });
    const influencerIds = [...new Set(existing.map((r) => r.influencerId))];
    const { count } = await prisma.influencerReview.deleteMany({ where: { id: { in: ids } } });
    // Reviews being deleted can span multiple influencers (the summary page
    // groups by influencer, but this bulk action isn't itself scoped to
    // one) -- recompute every affected influencer's rating, not just one.
    await Promise.all(influencerIds.map((id) => recomputeRating(id)));
    res.json({ count });
  }),
);

influencerReviewsRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("influencers", "delete"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.influencerReview.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new ApiError(404, "Review not found.");
    await prisma.influencerReview.delete({ where: { id: req.params.id } });
    await recomputeRating(existing.influencerId);
    res.status(204).send();
  }),
);
