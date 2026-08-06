import { Router } from "express";
import { prisma } from "@agency/database";
import { INFLUENCER_SOCIAL_PLATFORMS } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";
import { parseListQuery, paginationMeta, exactFilter, booleanFilter } from "../lib/list-query.js";
import { getInfluencerFlags } from "../lib/influencer-flags.js";
import { fetchApprovedDiscountResponses, pickBestDisplayDiscount, type DisplayDiscount } from "../lib/discount.js";

export const influencersRouter = Router();

const sortableFields = ["ratingAverage", "ratingCount", "createdAt"];

// Deliberately not `as const`: Prisma's include/orderBy arg types need
// plain mutable arrays (InfluencerPlatformOrderByWithRelationInput[], not a
// readonly tuple) -- only the individual "asc"/"desc" literals need a const
// assertion so they narrow from `string` to the Prisma sort-order enum.
// Approved-only badge selection, shared by card + detail: badges are a
// public trust signal (brief §14 "surfaced on cards/profile"), so a
// RECOMMENDED/REJECTED award must never leak into a public response.
const approvedBadgeAwards = {
  where: { status: "APPROVED" as const },
  select: { badge: { select: { key: true, label: true, iconKey: true, color: true } } },
  orderBy: { awardedAt: "desc" as const },
};

const cardInclude = {
  influencer: { select: { name: true, badgeAwards: approvedBadgeAwards } },
  profilePhoto: true,
  coverImage: true,
  categories: true,
  // All platforms (not just primary) -- the card shows followers AND
  // engagement rate as totals blended across every connected platform, not
  // just one. avgLikes/avgComments/avgShares are fetched (not just the
  // already-stored engagementRate) so the blended rate can be re-derived
  // from raw numerators/followers -- summing each platform's already-a-
  // percentage engagementRate would be meaningless (three platforms at 5%
  // each isn't "15% engagement").
  platforms: {
    select: { platform: true, followers: true, avgLikes: true, avgComments: true, avgShares: true, isPrimary: true },
  },
  // Starting price now reads pricingCards (the showcase packages a client
  // actually books against), not the retired pricingItems editor -- cheapest
  // non-custom-quote card, so an influencer who only offers custom-quote
  // packages correctly falls back to "Custom pricing" (empty array below).
  pricingCards: { where: { isEnabled: true, isCustomQuote: false }, orderBy: { price: "asc" as const }, take: 1 },
};

const detailInclude = {
  influencer: { select: { name: true, email: false, badgeAwards: approvedBadgeAwards } },
  profilePhoto: true,
  coverImage: true,
  categories: true,
  seo: true,
  // Audience demographics are scoped per platform now (brief §19/§20's
  // per-platform tabs), not blended profile-wide.
  platforms: {
    orderBy: [{ isPrimary: "desc" as const }, { followers: "desc" as const }],
    include: { audienceInsight: true, audienceLocations: { orderBy: { percentage: "desc" as const } } },
  },
  pricingItems: { where: { isEnabled: true }, include: { deliverableType: true }, orderBy: { price: "asc" as const } },
  pricingCards: { where: { isEnabled: true }, orderBy: { order: "asc" as const } },
  // Capped at 4 -- keeps the public payload/render small (brief request:
  // "so the system doesn't get overloaded"), not the full library.
  portfolioItems: { where: { isPublic: true }, include: { media: true }, orderBy: { order: "asc" as const }, take: 4 },
  collaborations: { include: { brandLogo: true }, orderBy: { order: "asc" as const } },
};

// Only ever exposes profiles for influencers who cleared both gates: the
// application/InfluencerProfile is published AND the parent Influencer
// account is still in good standing (APPROVED) -- catches the case where
// staff suspends someone after their profile was already published.
const publicWhereBase = { publicStatus: "PUBLISHED", influencer: { status: "APPROVED" } } as const;

// Builds the marketplace filter set (brief §3) directly from query params --
// deliberately not routed through the generic filterKeys system in
// use-paginated-list.ts, since several of these (price/followers/engagement
// range, language `has`) aren't plain exact-match filters.
/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma where-clause composition */
function buildMarketplaceWhere(query: Record<string, unknown>): any {
  const where: any = { ...publicWhereBase };

  const category = typeof query.category === "string" ? query.category : undefined;
  if (category) where.categories = { some: { slug: category } };

  const platform = typeof query.platform === "string" ? query.platform.toUpperCase() : undefined;
  const platformFilters: any[] = [];
  if (platform && (INFLUENCER_SOCIAL_PLATFORMS as readonly string[]).includes(platform)) {
    platformFilters.push({ platform });
  }

  const followersMin = Number.parseInt(String(query.followersMin ?? ""), 10);
  if (Number.isFinite(followersMin) && followersMin > 0) platformFilters.push({ followers: { gte: followersMin } });

  const engagementMin = Number.parseFloat(String(query.engagementMin ?? ""));
  if (Number.isFinite(engagementMin) && engagementMin > 0) platformFilters.push({ engagementRate: { gte: engagementMin } });

  if (platformFilters.length > 0) {
    where.platforms = { some: platformFilters.reduce((acc, f) => ({ ...acc, ...f }), {}) };
  }

  if (typeof query.country === "string" && query.country) where.countryCode = query.country;
  if (typeof query.city === "string" && query.city) where.city = { contains: query.city, mode: "insensitive" };
  if (typeof query.language === "string" && query.language) where.languages = { has: query.language };

  const priceMin = Number.parseFloat(String(query.priceMin ?? ""));
  const priceMax = Number.parseFloat(String(query.priceMax ?? ""));
  const priceRange: Record<string, number> = {};
  if (Number.isFinite(priceMin) && priceMin > 0) priceRange.gte = priceMin;
  if (Number.isFinite(priceMax) && priceMax > 0) priceRange.lte = priceMax;
  if (Object.keys(priceRange).length > 0) {
    where.pricingCards = { some: { isEnabled: true, isCustomQuote: false, price: priceRange } };
  }

  Object.assign(where, booleanFilter(query, "availability", "availableForBooking"));
  Object.assign(where, booleanFilter(query, "verified", "isVerified"));
  Object.assign(where, booleanFilter(query, "featured", "isFeatured"));

  return where;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function toCard(
  profile: {
    id: string;
    influencerId: string;
    username: string;
    tagline: string | null;
    countryCode: string | null;
    city: string | null;
    languages: string[];
    isVerified: boolean;
    isFeatured: boolean;
    availableForBooking: boolean;
    ratingAverage: unknown;
    ratingCount: number;
    influencer: { name: string; badgeAwards: { badge: { key: string; label: string; iconKey: string | null; color: string | null } }[] };
    profilePhoto: unknown;
    coverImage: unknown;
    categories: { id: string }[];
    platforms: { platform: string; followers: number; avgLikes: number; avgComments: number; avgShares: number; isPrimary: boolean }[];
    pricingCards: { price: unknown; currency: string | null }[];
  },
  approvedResponses: Parameters<typeof pickBestDisplayDiscount>[0],
) {
  const totalFollowers = profile.platforms.reduce((sum, p) => sum + p.followers, 0);
  // Blended engagement across every platform: re-derived from raw
  // likes+comments+shares over total followers (the same formula each
  // platform's own engagementRate was computed with), not a sum of
  // percentages -- summing three platforms' 5% each into "15% engagement"
  // would misrepresent the influencer to brands.
  const totalEngagementNumerator = profile.platforms.reduce((sum, p) => sum + p.avgLikes + p.avgComments + p.avgShares, 0);
  const totalEngagementRate = totalFollowers > 0 ? (totalEngagementNumerator / totalFollowers) * 100 : 0;

  return {
    id: profile.id,
    username: profile.username,
    name: profile.influencer.name,
    tagline: profile.tagline,
    countryCode: profile.countryCode,
    city: profile.city,
    languages: profile.languages,
    isVerified: profile.isVerified,
    isFeatured: profile.isFeatured,
    availableForBooking: profile.availableForBooking,
    ratingAverage: profile.ratingAverage,
    ratingCount: profile.ratingCount,
    profilePhoto: profile.profilePhoto,
    coverImage: profile.coverImage,
    categories: profile.categories,
    badges: profile.influencer.badgeAwards.map((a) => a.badge),
    // Total followers across every platform (e.g. Instagram 100 + Facebook
    // 130 + YouTube 34 = 264), and a blended total engagement rate across
    // all of them too (see above) -- both now consistently represent the
    // whole influencer, not just their primary platform.
    totalFollowers,
    totalEngagementRate,
    startingPrice: toDiscountedPrice(profile.pricingCards[0], profile.influencerId, approvedResponses),
  };
}

// Shared by the listing card's startingPrice and the detail page's package
// cards: attaches the best currently-live, influencer-approved auto-apply
// discount (if any) to a priced item so the frontend can render "was/now"
// pricing without having to re-derive eligibility itself.
function toDiscountedPrice(
  card: { price: unknown; currency: string | null } | undefined,
  influencerId: string,
  approvedResponses: Parameters<typeof pickBestDisplayDiscount>[0],
): { price: unknown; currency: string | null; discount: DisplayDiscount | null } | null {
  if (!card) return null;
  const amount = Number(card.price);
  const discount = pickBestDisplayDiscount(approvedResponses, { influencerId, amount });
  return { ...card, discount };
}

influencersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const flags = await getInfluencerFlags();
    if (!flags.marketplaceEnabled) throw new ApiError(404, "This service is currently unavailable.");

    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields,
      defaultSort: "ratingAverage",
    });
    const where = buildMarketplaceWhere(req.query);
    if (search) {
      where.OR = [
        { influencer: { name: { contains: search, mode: "insensitive" } } },
        { username: { contains: search, mode: "insensitive" } },
        { tagline: { contains: search, mode: "insensitive" } },
        { bio: { contains: search, mode: "insensitive" } },
      ];
    }

    // Default order surfaces top performers first (brief §2/§13): featured
    // profiles admin has manually promoted, then highest-rated. An explicit
    // ?sortBy overrides this with a single real column.
    const orderBy = req.query.sortBy
      ? { [sortBy]: sortOrder }
      : [{ isFeatured: "desc" as const }, { featuredOrder: "asc" as const }, { ratingAverage: "desc" as const }, { createdAt: "desc" as const }];

    const [items, total, approvedResponses] = await Promise.all([
      prisma.influencerProfile.findMany({ where, orderBy, skip, take: limit, include: cardInclude }),
      prisma.influencerProfile.count({ where }),
      fetchApprovedDiscountResponses(),
    ]);

    // `pageSize`/`totalPages`-shaped response (not the `limit`/`hasNextPage`
    // shape from paginationMeta() used below for /admin) -- matches the
    // PaginatedResponse<T> shape apps/web already expects from every other
    // public list endpoint (getProjects, getAffiliateTools).
    res.json({
      items: items.map((item) => toCard(item, approvedResponses)),
      total,
      page,
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  }),
);

const adminSortableFields = ["name", "createdAt", "reviewedAt"];

// Owned by this router rather than influencer-applications.routes.ts: that
// router's /admin covers the PENDING/REJECTED/NEEDS_MORE_INFO review queue,
// this one covers already-decided (APPROVED/SUSPENDED) marketplace
// management -- verify/feature/suspend -- matching the brief's separate
// "Applications" vs "Influencers" admin menu entries (§21).
influencersRouter.get(
  "/admin",
  requireAuth,
  requirePermission("influencers", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: adminSortableFields,
      defaultSort: "name",
    });

    const where = {
      status: { in: ["APPROVED", "SUSPENDED"] as ("APPROVED" | "SUSPENDED")[] },
      ...exactFilter(req.query, "status"),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { profile: { username: { contains: search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.influencer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          profile: {
            select: {
              username: true,
              city: true,
              countryCode: true,
              isVerified: true,
              isFeatured: true,
              featuredOrder: true,
              availableForBooking: true,
              publicStatus: true,
              ratingAverage: true,
              ratingCount: true,
              commissionOverridePercent: true,
              categories: { select: { name: true } },
            },
          },
        },
      }),
      prisma.influencer.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

influencersRouter.get(
  "/admin/:id",
  requireAuth,
  requirePermission("influencers", "view"),
  asyncHandler(async (req, res) => {
    const influencer = await prisma.influencer.findUnique({
      where: { id: req.params.id },
      include: { profile: { include: detailInclude } },
    });
    if (!influencer) throw new ApiError(404, "Influencer not found.");
    res.json({ item: influencer });
  }),
);

influencersRouter.patch(
  "/admin/:id",
  requireAuth,
  requirePermission("influencers", "update"),
  asyncHandler(async (req, res) => {
    const influencer = await prisma.influencer.findUnique({ where: { id: req.params.id }, include: { profile: true } });
    if (!influencer || !influencer.profile) throw new ApiError(404, "Influencer not found.");

    const body = req.body as Record<string, unknown>;
    const profileData: Record<string, unknown> = {};
    if (typeof body.isVerified === "boolean") profileData.isVerified = body.isVerified;
    if (typeof body.isFeatured === "boolean") profileData.isFeatured = body.isFeatured;
    if (typeof body.featuredOrder === "number") profileData.featuredOrder = body.featuredOrder;
    if (typeof body.availableForBooking === "boolean") profileData.availableForBooking = body.availableForBooking;
    if (typeof body.publicStatus === "string" && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(body.publicStatus)) {
      profileData.publicStatus = body.publicStatus;
    }
    if (body.commissionOverridePercent === null || typeof body.commissionOverridePercent === "number") {
      profileData.commissionOverridePercent = body.commissionOverridePercent;
    }

    const influencerData: Record<string, unknown> = {};
    if (typeof body.status === "string" && ["APPROVED", "SUSPENDED"].includes(body.status)) {
      influencerData.status = body.status;
    }

    const [profile] = await prisma.$transaction([
      prisma.influencerProfile.update({ where: { id: influencer.profile.id }, data: profileData, include: detailInclude }),
      ...(Object.keys(influencerData).length > 0
        ? [prisma.influencer.update({ where: { id: influencer.id }, data: influencerData })]
        : []),
    ]);

    res.json({ item: { ...influencer, ...influencerData, profile } });
  }),
);

// Public detail — registered last so it never shadows the static /admin
// routes above (Express matches middleware in registration order, and
// `/:username` would otherwise swallow a literal request for "/admin").
influencersRouter.get(
  "/:username",
  asyncHandler(async (req, res) => {
    const flags = await getInfluencerFlags();
    if (!flags.marketplaceEnabled) throw new ApiError(404, "This service is currently unavailable.");

    const profile = await prisma.influencerProfile.findFirst({
      where: { username: req.params.username, ...publicWhereBase },
      include: detailInclude,
    });
    if (!profile) throw new ApiError(404, "Influencer not found.");

    const [reviews, approvedResponses] = await Promise.all([
      // Capped at 10 (brief: "system par load na ho") -- the carousel this
      // feeds loops a fixed set rather than needing every review ever
      // written; ratingAverage/ratingCount on the profile (already in this
      // response via `...profile` below) reflect the *actual* full count,
      // kept in sync by influencer-reviews.routes.ts's recomputeRating on
      // every admin write, independent of this cap.
      prisma.influencerReview.findMany({
        where: { influencerId: profile.influencerId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      fetchApprovedDiscountResponses(),
    ]);

    // Non-custom-quote package cards get the same live-discount treatment
    // as the marketplace listing card's startingPrice (see toDiscountedPrice)
    // -- custom-quote cards have no fixed price to discount against.
    const pricingCards = profile.pricingCards.map((card) =>
      card.isCustomQuote ? { ...card, discount: null } : toDiscountedPrice(card, profile.influencerId, approvedResponses),
    );

    res.json({
      item: { ...profile, pricingCards, badges: profile.influencer.badgeAwards.map((a) => a.badge), reviews },
    });
  }),
);
