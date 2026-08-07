import { Router } from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { APIError } from "better-auth/api";
import { prisma } from "@agency/database";
import { influencerApplicationSchema, influencerApplicationStatusSchema, normalizePayoutMethodDetails } from "@agency/types";
import { influencerAuth } from "@agency/auth/influencer-server";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";
import { parseListQuery, paginationMeta, exactFilter } from "../lib/list-query.js";
import { signCloudinaryUpload, signPrivateMediaUrl } from "../lib/cloudinary.js";
import {
  sendApplicationApprovedEmail,
  sendApplicationNeedsInfoEmail,
  sendApplicationRejectedEmail,
  sendApplicationReceivedAdminAlert,
  sendApplicationSubmittedEmail,
} from "../lib/influencer-mailer.js";
import { notifyInfluencer, notifyStaffByPermission } from "../lib/notify.js";
import { computePlatformEngagementRate } from "../lib/influencer-analytics.js";
import { getInfluencerFlags } from "../lib/influencer-flags.js";
import { getInfluencerSettings } from "../lib/booking.js";

export const influencerApplicationsRouter = Router();

// This is the most likely spam/abuse target on the whole API (public,
// unauthenticated, and -- via /media/sign -- capable of minting Cloudinary
// upload signatures), so it gets the tightest limiter in the app.
//
// `message` as an object (not a string) matters: express-rate-limit's
// handler does `response.send(message)`, and Express's res.send() only
// delegates to res.json() for object/array bodies -- a plain string message
// (the library's default) comes back as text/plain, which silently breaks
// every client-side `res.json()` call site and surfaces as a generic
// "Something went wrong" instead of a real rate-limit message.
const applicationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many applications submitted. Please try again in a few minutes." },
});
const mediaSignLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many upload requests. Please try again in a few minutes." },
});

const mediaSignRequestSchema = z.object({
  // Client-generated per-form-session id (not a real identifier of
  // anything) so every upload from one applicant's session lands in the
  // same Cloudinary folder -- constrained to a safe charset since it's
  // interpolated directly into the folder path.
  sessionId: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/),
  private: z.boolean().optional(),
});

influencerApplicationsRouter.post(
  "/media/sign",
  mediaSignLimiter,
  asyncHandler(async (req, res) => {
    const { sessionId, private: isPrivate } = mediaSignRequestSchema.parse(req.body);
    const folder = `agency-website/influencer-applications/${sessionId}`;
    res.json(signCloudinaryUpload(folder, { authenticated: isPrivate }));
  }),
);

influencerApplicationsRouter.post(
  "/",
  applicationLimiter,
  asyncHandler(async (req, res) => {
    const flags = await getInfluencerFlags();
    if (!flags.registrationEnabled) {
      throw new ApiError(403, "Influencer registrations are currently closed. Please check back later.");
    }

    const data = influencerApplicationSchema.parse(req.body);
    const { autoApproveApplications } = await getInfluencerSettings();

    const [existingUsername, categories] = await Promise.all([
      prisma.influencerProfile.findUnique({ where: { username: data.username } }),
      prisma.influencerCategory.findMany({ where: { id: { in: data.categoryIds } } }),
    ]);
    if (existingUsername) throw new ApiError(409, "That username is already taken.");
    if (categories.length !== data.categoryIds.length) throw new ApiError(422, "One or more selected categories are invalid.");

    let influencerId: string;
    try {
      const signUpResult = await influencerAuth.api.signUpEmail({
        body: { name: data.name, email: data.email, password: data.password },
      });
      influencerId = signUpResult.user.id;
    } catch (error) {
      if (error instanceof APIError) {
        throw new ApiError(error.statusCode ?? 400, error.body?.message ?? "Could not create your account.");
      }
      throw error;
    }

    try {
      // Media rows are created up front, outside the transaction -- these
      // are just I/O-bound inserts, and doing them here instead of
      // one-at-a-time inside the transaction keeps the transaction itself to
      // a handful of fast local writes instead of N serial round trips. That
      // serial-writes shape was blowing past Prisma's default 5s
      // interactive-transaction timeout against the remote Supabase pooler
      // for any application with more than a couple of portfolio items
      // (confirmed via P2028 "Transaction not found" errors under real
      // network latency).
      const [profilePhoto, coverImage, introVideo] = await Promise.all([
        data.profilePhoto ? prisma.media.create({ data: data.profilePhoto }) : Promise.resolve(null),
        data.coverImage ? prisma.media.create({ data: data.coverImage }) : Promise.resolve(null),
        data.introVideo ? prisma.media.create({ data: data.introVideo }) : Promise.resolve(null),
      ]);

      // Real payout details (brief update §5/§6) start PENDING -- never
      // active until admin approves the influencer, at which point
      // PATCH /admin/:id/status auto-approves this same row alongside the
      // application (or, if autoApproveApplications is on, immediately here).
      const payoutStatus = autoApproveApplications ? ("APPROVED" as const) : ("PENDING" as const);

      await prisma.$transaction(
        async (tx) => {
          if (autoApproveApplications) {
            await tx.influencer.update({
              where: { id: influencerId },
              data: { status: "APPROVED" as const, reviewedAt: new Date() },
            });
          }

          const profile = await tx.influencerProfile.create({
            data: {
              influencerId,
              username: data.username,
              ...(autoApproveApplications ? { publicStatus: "PUBLISHED" as const } : {}),
              tagline: data.tagline || null,
              bio: data.bio || null,
              countryCode: data.countryCode || null,
              city: data.city || null,
              languages: data.languages,
              profilePhotoId: profilePhoto?.id,
              coverImageId: coverImage?.id,
              introVideoId: introVideo?.id,
              preferredPayoutMethod: data.payoutMethod.type,
              categories: { connect: data.categoryIds.map((id) => ({ id })) },
              platforms: {
                create: data.platforms.map((p) => {
                  const { audienceInsight, audienceLocations, handle, profileUrl, ...rest } = p;
                  return {
                    ...rest,
                    handle: handle || null,
                    profileUrl: profileUrl || null,
                    engagementRate: computePlatformEngagementRate(p),
                    ...(audienceInsight ? { audienceInsight: { create: audienceInsight } } : {}),
                    ...(audienceLocations && audienceLocations.length > 0
                      ? { audienceLocations: { create: audienceLocations.map((l, i) => ({ ...l, order: i })) } }
                      : {}),
                  };
                }),
              },
            },
          });

          await tx.influencerPayoutMethod.create({
            data: {
              influencerId,
              type: data.payoutMethod.type,
              details: normalizePayoutMethodDetails(data.payoutMethod.type, data.payoutMethod.details),
              isDefault: true,
              status: payoutStatus,
              ...(autoApproveApplications ? { reviewedAt: new Date() } : {}),
            },
          });

          return profile.id;
        },
        { timeout: 15_000 }, // safety margin on top of the round-trip reduction above
      );
    } catch (error) {
      // The auth account was created outside our transaction (Better Auth's
      // own commit) -- if the rest of the application fails, don't leave a
      // login-capable orphan with no profile behind.
      await prisma.influencer.delete({ where: { id: influencerId } }).catch(() => {});
      throw error;
    }

    res.status(201).json({ id: influencerId });

    if (autoApproveApplications) {
      void sendApplicationApprovedEmail({ name: data.name, email: data.email });
      void notifyStaffByPermission("influencerApplications", "view", {
        type: "application.auto_approved",
        title: "New influencer auto-approved",
        body: `${data.name} (@${data.username}) applied and was automatically approved.`,
        linkUrl: "/influencers",
      });
    } else {
      void sendApplicationSubmittedEmail({ name: data.name, email: data.email });
      void sendApplicationReceivedAdminAlert({ name: data.name, email: data.email, username: data.username });
      void notifyStaffByPermission("influencerApplications", "view", {
        type: "application.submitted",
        title: "New influencer application",
        body: `${data.name} (@${data.username}) applied to join the Influencer Marketplace.`,
        linkUrl: "/influencers/applications",
      });
    }
  }),
);

const applicationsSortableFields = ["appliedAt", "reviewedAt", "name", "status"];

influencerApplicationsRouter.get(
  "/admin",
  requireAuth,
  requirePermission("influencerApplications", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: applicationsSortableFields,
      defaultSort: "appliedAt",
    });

    const where = { ...exactFilter(req.query, "status") };

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
          appliedAt: true,
          reviewedAt: true,
          identityDocumentType: true,
          profile: { select: { username: true, city: true, countryCode: true, categories: { select: { name: true } } } },
        },
      }),
      prisma.influencer.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

influencerApplicationsRouter.get(
  "/admin/:id",
  requireAuth,
  requirePermission("influencerApplications", "view"),
  asyncHandler(async (req, res) => {
    const influencer = await prisma.influencer.findUnique({
      where: { id: req.params.id },
      include: {
        identityDocument: true,
        payoutMethods: { orderBy: { createdAt: "desc" }, take: 1 },
        profile: {
          include: {
            profilePhoto: true,
            coverImage: true,
            introVideo: true,
            categories: true,
            platforms: true,
          },
        },
      },
    });
    if (!influencer) throw new ApiError(404, "Application not found.");

    // Never leak a working document URL over a "public-ish" field -- swap it
    // for a freshly signed one, generated only now that the caller has
    // already passed requirePermission above.
    const identityDocumentUrl = influencer.identityDocument
      ? signPrivateMediaUrl(influencer.identityDocument.publicId)
      : null;

    res.json({ item: { ...influencer, identityDocument: undefined, identityDocumentUrl } });
  }),
);

influencerApplicationsRouter.patch(
  "/admin/:id/status",
  requireAuth,
  requirePermission("influencerApplications", "update"),
  asyncHandler(async (req, res) => {
    const { status, note } = influencerApplicationStatusSchema.parse(req.body);

    const influencer = await prisma.influencer.findUnique({ where: { id: req.params.id } });
    if (!influencer) throw new ApiError(404, "Application not found.");

    const updated = await prisma.influencer.update({
      where: { id: req.params.id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedById: req.user!.id,
        rejectionReason: status === "REJECTED" ? note || null : null,
      },
    });

    if (status === "APPROVED") {
      await prisma.influencerProfile.updateMany({
        where: { influencerId: influencer.id },
        data: { publicStatus: "PUBLISHED" },
      });
      // The payout method submitted at registration (brief update §6) sits
      // PENDING until exactly this moment -- approving the influencer is
      // what activates it, not a separate manual payout-method review step.
      await prisma.influencerPayoutMethod.updateMany({
        where: { influencerId: influencer.id, status: "PENDING" },
        data: { status: "APPROVED", reviewedById: req.user!.id, reviewedAt: new Date() },
      });
    }

    res.json({ item: updated });

    const recipient = { name: influencer.name, email: influencer.email };
    if (status === "APPROVED") {
      void sendApplicationApprovedEmail(recipient);
      void notifyInfluencer(influencer.id, {
        type: "application.approved",
        title: "Your application was approved",
        body: "Welcome to the Influencer Marketplace — your profile is now live.",
        linkUrl: "/influencer/dashboard",
      });
    } else if (status === "REJECTED") {
      void sendApplicationRejectedEmail(recipient, note);
      void notifyInfluencer(influencer.id, {
        type: "application.rejected",
        title: "Your application was not approved",
        body: note || "Thanks for your interest — your application wasn't approved this time.",
      });
    } else if (status === "NEEDS_MORE_INFO") {
      void sendApplicationNeedsInfoEmail(recipient, note);
      void notifyInfluencer(influencer.id, {
        type: "application.needs_more_info",
        title: "We need more information",
        body: note || "Please reply to our email with the requested information.",
      });
    }
  }),
);

const bulkDeleteSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });

// Applications and Influencers (influencers.routes.ts) both operate on the
// same Influencer model, just filtered by status -- deletion here is
// gated on the "influencerApplications" permission (matching this
// router's own review-queue resource) rather than reusing influencers.routes.ts's
// delete route, which is gated on "influencers" instead. Same underlying
// guardrail either way: bookings/payouts lack onDelete: Cascade, so
// Postgres rejects (P2003 -> 409) deleting anyone with real business
// history -- not that a PENDING/REJECTED applicant would have any.
influencerApplicationsRouter.post(
  "/admin/bulk-delete",
  requireAuth,
  requirePermission("influencerApplications", "delete"),
  asyncHandler(async (req, res) => {
    const { ids } = bulkDeleteSchema.parse(req.body);
    const { count } = await prisma.influencer.deleteMany({ where: { id: { in: ids } } });
    res.json({ count });
  }),
);

influencerApplicationsRouter.delete(
  "/admin/:id",
  requireAuth,
  requirePermission("influencerApplications", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.influencer.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
