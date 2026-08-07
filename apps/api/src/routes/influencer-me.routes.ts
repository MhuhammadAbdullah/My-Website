import { Router } from "express";
import { z } from "zod";
import { prisma } from "@agency/database";
import { influencerSelfProfileSchema, influencerPayoutMethodSubmissionSchema, type NewMediaUploadInput } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireInfluencerAuth, requireApprovedInfluencer } from "../middleware/require-influencer-auth.js";
import { ApiError } from "../middleware/error-handler.js";
import { signCloudinaryUpload } from "../lib/cloudinary.js";
import { parseListQuery, paginationMeta, exactFilter, searchFilter } from "../lib/list-query.js";
import {
  bookingDetailInclude,
  getInfluencerSettings,
  nextAllowedStatuses,
  omitClientPrivateFields,
  requestBookingClarification,
  transitionBooking,
} from "../lib/booking.js";
import { getEarningsSummary } from "../lib/payout.js";
import { notifyInfluencer } from "../lib/notify.js";
import { computePlatformEngagementRate } from "../lib/influencer-analytics.js";

export const influencerMeRouter = Router();

influencerMeRouter.post(
  "/media/sign",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    res.json(signCloudinaryUpload(`agency-website/influencers/${req.influencer!.id}`));
  }),
);

// Lets the Pricing Cards dashboard UI enforce the admin-set cap client-side
// (disable "Add card" at the limit) without exposing the full admin-only
// /influencer-settings endpoint to influencers.
influencerMeRouter.get(
  "/pricing-limits",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (_req, res) => {
    const { maxPricingCards } = await getInfluencerSettings();
    res.json({ maxPricingCards });
  }),
);

const selfInclude = {
  profile: {
    include: {
      profilePhoto: true,
      coverImage: true,
      categories: true,
      platforms: { include: { audienceInsight: true, audienceLocations: { orderBy: { order: "asc" as const } } } },
      pricingItems: { include: { deliverableType: true } },
      pricingCards: { orderBy: { order: "asc" as const } },
      portfolioItems: { include: { media: true }, orderBy: { order: "asc" as const } },
    },
  },
} as const;

// Works at any application status -- the dashboard shell needs this to
// decide whether to show "pending review" / "rejected" / the real
// dashboard, so it can't be gated behind requireApprovedInfluencer.
influencerMeRouter.get(
  "/",
  requireInfluencerAuth,
  asyncHandler(async (req, res) => {
    const influencer = await prisma.influencer.findUnique({
      where: { id: req.influencer!.id },
      include: selfInclude,
    });
    if (!influencer) throw new ApiError(404, "Account not found.");
    res.json({ item: influencer });
  }),
);

influencerMeRouter.patch(
  "/",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    const data = influencerSelfProfileSchema.parse(req.body);

    const categories = await prisma.influencerCategory.findMany({ where: { id: { in: data.categoryIds } } });
    if (categories.length !== data.categoryIds.length) throw new ApiError(422, "One or more selected categories are invalid.");

    const existing = await prisma.influencerProfile.findUnique({ where: { influencerId: req.influencer!.id } });
    if (!existing) throw new ApiError(404, "Profile not found.");

    if (data.pricingCards) {
      const { maxPricingCards } = await getInfluencerSettings();
      if (data.pricingCards.length > maxPricingCards) {
        throw new ApiError(422, `You can have at most ${maxPricingCards} pricing cards.`);
      }
    }

    const deliverableTypes = data.pricingItems
      ? await prisma.influencerDeliverableType.findMany({
          where: { key: { in: data.pricingItems.map((p) => p.deliverableTypeKey) } },
        })
      : [];
    const deliverableTypeIdByKey = new Map(deliverableTypes.map((d) => [d.key, d.id]));

    // Media rows are upserted (by publicId, Media's unique key) up front,
    // outside the transaction -- these are just I/O-bound writes, and doing
    // them here instead of one-at-a-time inside the transaction keeps the
    // transaction itself to a handful of fast local writes instead of N
    // serial round trips. That serial-writes shape was blowing past
    // Prisma's default 5s interactive-transaction timeout against the
    // remote Supabase pooler for any profile with more than a couple of
    // portfolio items (confirmed via P2028 "Transaction not found" errors
    // under real network latency).
    //
    // upsert (not create): the client always resubmits the *full* list of
    // portfolio items -- including ones saved in a previous request, whose
    // Media row already exists -- since portfolioItemSchema.media carries
    // raw upload fields rather than an existing-media reference. A blind
    // create() therefore collided with itself (P2002 on publicId) the
    // moment a second video was added to an already-saved portfolio, and
    // failed the whole request before the transaction ever ran.
    const upsertMedia = (media: NewMediaUploadInput) =>
      prisma.media.upsert({ where: { publicId: media.publicId }, create: media, update: media });

    const [profilePhoto, coverImage, portfolioMedia] = await Promise.all([
      data.profilePhoto ? upsertMedia(data.profilePhoto) : Promise.resolve(undefined),
      data.coverImage ? upsertMedia(data.coverImage) : Promise.resolve(undefined),
      data.portfolioItems ? Promise.all(data.portfolioItems.map((item) => upsertMedia(item.media))) : [],
    ]);

    const profileId = await prisma.$transaction(async (tx) => {
      await tx.influencerProfile.update({
        where: { id: existing.id },
        data: {
          tagline: data.tagline || null,
          bio: data.bio || null,
          countryCode: data.countryCode || null,
          city: data.city || null,
          languages: data.languages,
          availableForBooking: data.availableForBooking,
          ...(profilePhoto ? { profilePhotoId: profilePhoto.id } : {}),
          ...(coverImage ? { coverImageId: coverImage.id } : {}),
          categories: { set: data.categoryIds.map((id) => ({ id })) },
        },
      });

      // Full-replace pattern when a sub-list IS present, matching how
      // Service's pricing plans are updated (the form resubmits the
      // complete list, not a diff). A sub-list that's entirely absent from
      // the request (undefined, not []) is left untouched -- callers that
      // don't manage that section (e.g. the Profile page today, which only
      // exposes scalar fields) simply omit it rather than reconstructing
      // fake data for items they never actually edited.
      if (data.platforms) {
        await tx.influencerPlatform.deleteMany({ where: { influencerProfileId: existing.id } });
        // One create() per platform (not createMany) -- audienceInsight/
        // audienceLocations are nested relation writes, which createMany
        // can't express. Platform counts per influencer are tiny (at most
        // one per INFLUENCER_SOCIAL_PLATFORMS entry), so the serial awaits
        // stay well inside this transaction's 15s timeout.
        for (const p of data.platforms) {
          const { audienceInsight, audienceLocations, handle, profileUrl, ...rest } = p;
          await tx.influencerPlatform.create({
            data: {
              ...rest,
              handle: handle || null,
              profileUrl: profileUrl || null,
              influencerProfileId: existing.id,
              // Never trust a client-supplied engagement rate -- always a
              // real calculation from the raw numbers on this same platform.
              engagementRate: computePlatformEngagementRate(p),
              ...(audienceInsight ? { audienceInsight: { create: audienceInsight } } : {}),
              ...(audienceLocations && audienceLocations.length > 0
                ? { audienceLocations: { create: audienceLocations.map((l, i) => ({ ...l, order: i })) } }
                : {}),
            },
          });
        }
      }

      if (data.pricingItems) {
        await tx.influencerPricingItem.deleteMany({ where: { influencerProfileId: existing.id } });
        const validPricingItems = data.pricingItems.filter((p) => deliverableTypeIdByKey.has(p.deliverableTypeKey));
        if (validPricingItems.length > 0) {
          await tx.influencerPricingItem.createMany({
            data: validPricingItems.map((p) => ({
              influencerProfileId: existing.id,
              deliverableTypeId: deliverableTypeIdByKey.get(p.deliverableTypeKey)!,
              customLabel: p.customLabel || null,
              price: p.price,
              currency: p.currency || null,
              isEnabled: p.isEnabled,
            })),
          });
        }
      }

      if (data.pricingCards) {
        await tx.influencerPricingCard.deleteMany({ where: { influencerProfileId: existing.id } });
        if (data.pricingCards.length > 0) {
          await tx.influencerPricingCard.createMany({
            data: data.pricingCards.map((c, i) => ({
              influencerProfileId: existing.id,
              title: c.title,
              price: c.isCustomQuote ? null : c.price,
              currency: c.currency || null,
              estimatedDeliveryTime: c.estimatedDeliveryTime || null,
              description: c.description || null,
              features: c.features,
              isCustomQuote: c.isCustomQuote,
              isEnabled: c.isEnabled,
              order: i,
            })),
          });
        }
      }

      if (data.portfolioItems) {
        await tx.influencerPortfolioItem.deleteMany({ where: { influencerProfileId: existing.id } });
        if (data.portfolioItems.length > 0) {
          await tx.influencerPortfolioItem.createMany({
            data: data.portfolioItems.map((item, i) => ({
              influencerProfileId: existing.id,
              mediaId: portfolioMedia[i]!.id,
              isPublic: item.isPublic,
              order: i,
            })),
          });
        }
      }

      return existing.id;
    }, { timeout: 15_000 }); // safety margin on top of the round-trip reduction above

    const updated = await prisma.influencerProfile.findUnique({ where: { id: profileId }, include: selfInclude.profile.include });

    void notifyInfluencer(req.influencer!.id, {
      type: "profile.updated",
      title: "Profile updated",
      body: "Your public profile changes are now live.",
      linkUrl: "/influencer/dashboard/profile",
    });

    res.json({ item: updated });
  }),
);

const bookingSortableFields = ["createdAt", "status"];

influencerMeRouter.get(
  "/bookings",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: bookingSortableFields,
      defaultSort: "createdAt",
    });

    const dateFrom = typeof req.query.dateFrom === "string" && req.query.dateFrom ? new Date(req.query.dateFrom) : undefined;
    const dateTo = typeof req.query.dateTo === "string" && req.query.dateTo ? new Date(req.query.dateTo) : undefined;

    const where = {
      influencerId: req.influencer!.id,
      ...exactFilter(req.query, "status"),
      ...exactFilter(req.query, "campaignType"),
      ...searchFilter(search, ["bookingNumber", "businessName", "campaignType"]),
      ...(dateFrom || dateTo ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        select: { id: true, bookingNumber: true, status: true, businessName: true, campaignType: true, netInfluencerEarning: true, createdAt: true },
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

// Ownership is enforced by scoping the lookup to influencerId, not by
// checking after the fact -- a booking that belongs to someone else 404s
// exactly like one that doesn't exist, rather than leaking its existence.
async function loadOwnBooking(influencerId: string, bookingId: string) {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, influencerId }, include: bookingDetailInclude });
  if (!booking) throw new ApiError(404, "Booking not found.");
  return booking;
}

influencerMeRouter.get(
  "/bookings/:id",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    const booking = await loadOwnBooking(req.influencer!.id, req.params.id!);
    res.json({ item: { ...omitClientPrivateFields(booking), allowedTransitions: nextAllowedStatuses(booking.status) } });
  }),
);

const noteSchema = z.object({ note: z.string().max(1000).optional().or(z.literal("")) });
// Rejecting a booking always requires a reason (brief §10) -- the admin and
// client both need to know why the influencer isn't available.
const declineSchema = z.object({ reason: z.string().min(10, "Please provide a reason (at least 10 characters).").max(1000) });
const requestDetailsSchema = z.object({ message: z.string().min(5, "Please describe what you need clarified.").max(1000) });

influencerMeRouter.post(
  "/bookings/:id/accept",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    await loadOwnBooking(req.influencer!.id, req.params.id!);
    const updated = await transitionBooking(req.params.id!, "ACCEPTED_BY_INFLUENCER", {
      actorType: "INFLUENCER",
      actorId: req.influencer!.id,
    });
    res.json({ item: { ...omitClientPrivateFields(updated), allowedTransitions: nextAllowedStatuses(updated.status) } });
  }),
);

influencerMeRouter.post(
  "/bookings/:id/decline",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    await loadOwnBooking(req.influencer!.id, req.params.id!);
    const { reason } = declineSchema.parse(req.body);
    const updated = await transitionBooking(req.params.id!, "DECLINED_BY_INFLUENCER", {
      actorType: "INFLUENCER",
      actorId: req.influencer!.id,
      note: reason,
    });
    res.json({ item: { ...omitClientPrivateFields(updated), allowedTransitions: nextAllowedStatuses(updated.status) } });
  }),
);

influencerMeRouter.post(
  "/bookings/:id/request-details",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    const { message } = requestDetailsSchema.parse(req.body);
    const updated = await requestBookingClarification(req.params.id!, req.influencer!.id, message);
    res.json({ item: { ...omitClientPrivateFields(updated), allowedTransitions: nextAllowedStatuses(updated.status) } });
  }),
);

influencerMeRouter.post(
  "/bookings/:id/deliver",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    await loadOwnBooking(req.influencer!.id, req.params.id!);
    const { note } = noteSchema.parse(req.body);
    const updated = await transitionBooking(req.params.id!, "DELIVERED", {
      actorType: "INFLUENCER",
      actorId: req.influencer!.id,
      note: note || undefined,
    });
    res.json({ item: { ...omitClientPrivateFields(updated), allowedTransitions: nextAllowedStatuses(updated.status) } });
  }),
);

// Earnings summary (brief §17 "Earnings" tab) -- computed on read rather
// than a maintained running balance, since the underlying figures
// (COMPLETED bookings, payout batches) are both small per-influencer sets.
influencerMeRouter.get(
  "/earnings",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    const summary = await getEarningsSummary(req.influencer!.id);
    res.json({
      totalEarned: summary.lifetimeEarnings,
      completedCampaigns: summary.completedCampaigns,
      totalPaidOut: summary.totalPaidOut,
      pendingPayout: summary.pendingEarnings,
      availableBalance: summary.availableBalance,
    });
  }),
);

const payoutSortableFields = ["createdAt", "status", "totalAmount"];

influencerMeRouter.get(
  "/payouts",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: payoutSortableFields,
      defaultSort: "createdAt",
    });

    const dateFrom = typeof req.query.dateFrom === "string" && req.query.dateFrom ? new Date(req.query.dateFrom) : undefined;
    const dateTo = typeof req.query.dateTo === "string" && req.query.dateTo ? new Date(req.query.dateTo) : undefined;

    const where = {
      influencerId: req.influencer!.id,
      ...exactFilter(req.query, "status"),
      ...exactFilter(req.query, "method"),
      ...searchFilter(search, ["payoutNumber"]),
      ...(dateFrom || dateTo ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.influencerPayout.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        select: { id: true, payoutNumber: true, status: true, totalAmount: true, currency: true, method: true, createdAt: true, processedAt: true },
      }),
      prisma.influencerPayout.count({ where }),
    ]);
    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Overview-page stats (brief §1) -- every figure here is either a direct
// count/aggregate scoped to this influencer or reuses getEarningsSummary()
// (the same source the Earnings tab reads), so nothing shown is duplicated
// or fabricated. Platform stats aren't included here -- they're already
// fully available client-side via GET / (profile.platforms), no need for a
// second round trip.
influencerMeRouter.get(
  "/dashboard-stats",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    const influencerId = req.influencer!.id;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const [
      totalBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      earnings,
      totalPayouts,
      pendingPayouts,
      totalInvoices,
      recentCompletedBookings,
      recentBookingsForCount,
      bookingsByStatusRaw,
      recentActivity,
    ] = await Promise.all([
      prisma.booking.count({ where: { influencerId } }),
      prisma.booking.count({ where: { influencerId, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
      prisma.booking.count({ where: { influencerId, status: "COMPLETED" } }),
      prisma.booking.count({ where: { influencerId, status: "CANCELLED" } }),
      getEarningsSummary(influencerId),
      prisma.influencerPayout.count({ where: { influencerId } }),
      prisma.influencerPayout.count({ where: { influencerId, status: { in: ["PENDING", "PROCESSING"] } } }),
      prisma.booking.count({ where: { influencerId, invoiceId: { not: null } } }),
      prisma.booking.findMany({
        where: { influencerId, status: "COMPLETED", completedAt: { gte: sixMonthsAgo } },
        select: { completedAt: true, netInfluencerEarning: true },
      }),
      prisma.booking.findMany({ where: { influencerId, createdAt: { gte: sixMonthsAgo } }, select: { createdAt: true } }),
      prisma.booking.groupBy({ by: ["status"], where: { influencerId }, _count: true }),
      // Bookings + earnings (payouts) only, per §1's "Recent activity" scope
      // -- badge/application/profile notifications are noise here, they
      // already have their own surfaces. Capped to the last 3 days: this
      // feed is "what just happened," not a lifetime log, so it can't grow
      // unbounded in size/load the longer an influencer has been active.
      prisma.notification.findMany({
        where: {
          recipientType: "INFLUENCER",
          recipientInfluencerId: influencerId,
          createdAt: { gte: threeDaysAgo },
          OR: [{ type: { startsWith: "booking." } }, { type: { startsWith: "payout." } }],
        },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: { type: true, title: true, body: true, linkUrl: true, createdAt: true },
      }),
    ]);

    const earningsBuckets = new Map<string, number>();
    const bookingBuckets = new Map<string, number>();
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      earningsBuckets.set(monthKey(d), 0);
      bookingBuckets.set(monthKey(d), 0);
    }
    for (const b of recentCompletedBookings) {
      if (!b.completedAt) continue;
      const key = monthKey(b.completedAt);
      if (earningsBuckets.has(key)) earningsBuckets.set(key, earningsBuckets.get(key)! + Number(b.netInfluencerEarning));
    }
    for (const b of recentBookingsForCount) {
      const key = monthKey(b.createdAt);
      if (bookingBuckets.has(key)) bookingBuckets.set(key, bookingBuckets.get(key)! + 1);
    }

    res.json({
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
      },
      earnings: {
        totalEarnings: earnings.totalEarnings,
        lifetimeEarnings: earnings.lifetimeEarnings,
        pendingEarnings: earnings.pendingEarnings,
        availableBalance: earnings.availableBalance,
      },
      payouts: { total: totalPayouts, pending: pendingPayouts },
      totalInvoices,
      monthlyEarnings: [...earningsBuckets.entries()].map(([month, amount]) => ({ month, amount })),
      monthlyBookings: [...bookingBuckets.entries()].map(([month, count]) => ({ month, count })),
      bookingsByStatus: bookingsByStatusRaw.map((b) => ({ status: b.status, count: b._count })),
      recentActivity,
    });
  }),
);

influencerMeRouter.get(
  "/payout-methods",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    const items = await prisma.influencerPayoutMethod.findMany({
      where: { influencerId: req.influencer!.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  }),
);

influencerMeRouter.post(
  "/payout-methods",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    const data = influencerPayoutMethodSubmissionSchema.parse(req.body);
    const created = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.influencerPayoutMethod.updateMany({ where: { influencerId: req.influencer!.id }, data: { isDefault: false } });
      }
      return tx.influencerPayoutMethod.create({
        data: { influencerId: req.influencer!.id, type: data.type, details: data.details, isDefault: data.isDefault },
      });
    });
    res.status(201).json({ item: created });
  }),
);

influencerMeRouter.patch(
  "/payout-methods/:id",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    const method = await prisma.influencerPayoutMethod.findFirst({ where: { id: req.params.id, influencerId: req.influencer!.id } });
    if (!method) throw new ApiError(404, "Payout method not found.");
    if (method.status === "APPROVED") {
      throw new ApiError(409, "Approved payout methods can't be edited. Submit a new one and contact us if your details changed.");
    }
    const data = influencerPayoutMethodSubmissionSchema.parse(req.body);
    const updated = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.influencerPayoutMethod.updateMany({ where: { influencerId: req.influencer!.id }, data: { isDefault: false } });
      }
      // Edited details haven't been reviewed yet -- a REJECTED method that's
      // been corrected goes back to PENDING for re-review rather than
      // staying REJECTED with new details the admin never saw.
      return tx.influencerPayoutMethod.update({
        where: { id: method.id },
        data: {
          type: data.type,
          details: data.details,
          isDefault: data.isDefault,
          status: "PENDING",
          reviewedById: null,
          reviewedAt: null,
        },
      });
    });
    res.json({ item: updated });
  }),
);

influencerMeRouter.delete(
  "/payout-methods/:id",
  requireInfluencerAuth,
  requireApprovedInfluencer,
  asyncHandler(async (req, res) => {
    const method = await prisma.influencerPayoutMethod.findFirst({ where: { id: req.params.id, influencerId: req.influencer!.id } });
    if (!method) throw new ApiError(404, "Payout method not found.");
    if (method.status === "APPROVED") {
      throw new ApiError(409, "Approved payout methods can't be deleted. Submit a new one and contact us if your details changed.");
    }
    await prisma.influencerPayoutMethod.delete({ where: { id: method.id } });
    res.status(204).end();
  }),
);

function parseNotificationLimit(value: unknown): number {
  const n = Number.parseInt(String(value ?? "20"), 10);
  return Math.min(50, Math.max(1, Number.isFinite(n) && n > 0 ? n : 20));
}

// Influencer-facing half of the notification bell (brief §8) -- mirrors
// notificationsRouter's staff-facing routes exactly, scoped to
// recipientInfluencerId instead of recipientUserId.
influencerMeRouter.get(
  "/notifications",
  requireInfluencerAuth,
  asyncHandler(async (req, res) => {
    const where = { recipientType: "INFLUENCER" as const, recipientInfluencerId: req.influencer!.id };
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: parseNotificationLimit(req.query.limit) }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);
    res.json({ items, unreadCount });
  }),
);

influencerMeRouter.patch(
  "/notifications/:id/read",
  requireInfluencerAuth,
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, recipientType: "INFLUENCER", recipientInfluencerId: req.influencer!.id },
    });
    if (!notification) throw new ApiError(404, "Notification not found.");
    const updated = await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true, readAt: new Date() } });
    res.json({ item: updated });
  }),
);

influencerMeRouter.post(
  "/notifications/read-all",
  requireInfluencerAuth,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { recipientType: "INFLUENCER", recipientInfluencerId: req.influencer!.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    res.status(204).send();
  }),
);
