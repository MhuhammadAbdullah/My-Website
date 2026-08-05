import { Router } from "express";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { prisma } from "@agency/database";
import { bookingSubmissionSchema, bookingStatusTransitionSchema, paymentSchema, newMediaUploadSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";
import { parseListQuery, paginationMeta, exactFilter, searchFilter } from "../lib/list-query.js";
import { signCloudinaryUpload } from "../lib/cloudinary.js";
import {
  generateBookingNumber,
  resolveBookingCurrency,
  bookingDetailInclude,
  nextAllowedStatuses,
  transitionBooking,
  recordBookingPayment,
  getInfluencerSettings,
} from "../lib/booking.js";
import { sendBookingReceivedClientEmail, sendBookingReceivedAdminAlert } from "../lib/booking-mailer.js";
import { notifyStaffByPermission } from "../lib/notify.js";
import { getInfluencerFlags } from "../lib/influencer-flags.js";
import { resolveBookingDiscount } from "../lib/discount.js";

export const bookingsRouter = Router();

// Public, unauthenticated submission endpoint -- same rate-limit shape as
// influencer-applications.routes.ts for the same reason (spam/abuse target).
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many booking requests submitted. Please try again in a few minutes." },
});
const mediaSignLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many upload requests. Please try again in a few minutes." },
});

const mediaSignRequestSchema = z.object({
  sessionId: z.string().regex(/^[a-zA-Z0-9_-]{8,64}$/),
});

bookingsRouter.post(
  "/media/sign",
  mediaSignLimiter,
  asyncHandler(async (req, res) => {
    const { sessionId } = mediaSignRequestSchema.parse(req.body);
    res.json(signCloudinaryUpload(`agency-website/bookings/${sessionId}`));
  }),
);

// Public "book this influencer" submission (brief §9/§10). Scoped by
// :username (not a bare POST /) to mirror the public GET /influencers/:username
// route -- the browser never needs to know an influencer's internal id.
bookingsRouter.post(
  "/:username",
  bookingLimiter,
  asyncHandler(async (req, res) => {
    const flags = await getInfluencerFlags();
    if (!flags.marketplaceEnabled) throw new ApiError(404, "This service is currently unavailable.");
    if (!flags.bookingsEnabled) throw new ApiError(403, flags.bookingsDisabledMessage);

    const data = bookingSubmissionSchema.parse(req.body);

    const profile = await prisma.influencerProfile.findFirst({
      where: { username: req.params.username, publicStatus: "PUBLISHED", influencer: { status: "APPROVED" } },
      include: {
        influencer: { select: { id: true, name: true, email: true } },
        pricingCards: { where: { isEnabled: true } },
      },
    });
    if (!profile) throw new ApiError(404, "Influencer not found.");
    if (!profile.availableForBooking) throw new ApiError(409, "This influencer isn't accepting new bookings right now.");

    const selectedCard = profile.pricingCards.find((c) => c.id === data.pricingCardId);
    if (!selectedCard) throw new ApiError(422, "The selected package is no longer available.");

    const currency = await resolveBookingCurrency([selectedCard.currency]);
    // A custom-quote card has no fixed price -- the snapshot line carries 0
    // and the influencer/admin negotiate the real amount afterward via the
    // gross-amount override at AWAITING_PAYMENT (transitionBooking()
    // already supports this for any manual adjustment).
    const requiredDeliverables = [
      {
        deliverableTypeKey: "CUSTOM",
        label: selectedCard.isCustomQuote ? `${selectedCard.title} (Custom Quote)` : selectedCard.title,
        price: selectedCard.isCustomQuote ? 0 : Number(selectedCard.price),
        currency: selectedCard.currency ?? currency,
      },
    ];

    const grossAmount = requiredDeliverables.reduce((sum, d) => sum + d.price, 0);

    const influencerSettings = await getInfluencerSettings();
    if (
      !selectedCard.isCustomQuote &&
      influencerSettings.minimumBookingAmount !== null &&
      grossAmount < Number(influencerSettings.minimumBookingAmount)
    ) {
      throw new ApiError(422, `The selected package's price is less than the minimum booking amount (${Number(influencerSettings.minimumBookingAmount).toLocaleString()}).`);
    }

    // Redemption happens inside resolveBookingDiscount, atomically and
    // awaited -- by the time this returns, `discount` (if non-null) has
    // already won its usedCount/maxUses race, so nothing further needs to
    // happen here to "claim" it (see lib/discount.ts for why a
    // fire-and-forget redeem call after the fact isn't safe).
    const discount = await resolveBookingDiscount(data.discountCode || undefined, {
      influencerId: profile.influencer.id,
      contactEmail: data.contactEmail,
      grossAmount,
    });

    let client = await prisma.client.findFirst({ where: { email: data.contactEmail } });
    if (!client) {
      client = await prisma.client.create({
        data: { name: data.businessName, email: data.contactEmail, phone: data.contactPhone, company: data.businessName, currency },
      });
    }

    const attachmentMedia = await Promise.all(
      data.attachments.map((a) => prisma.media.create({ data: newMediaUploadSchema.parse(a) })),
    );

    const bookingNumber = await generateBookingNumber();

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        influencerId: profile.influencer.id,
        clientId: client.id,
        businessName: data.businessName,
        businessWebsite: data.businessWebsite || null,
        contactPerson: data.contactPerson,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        campaignObjective: data.campaignObjective,
        industry: data.industry,
        product: data.product,
        // No longer client-entered -- the selected package's price (0 for a
        // custom-quote card) is the actual budget signal now that "Budget"
        // has been replaced by package selection on the booking form.
        budget: grossAmount,
        campaignType: data.campaignType,
        targetAudience: data.targetAudience,
        requiredDeliverables,
        timeline: data.timeline,
        notes: data.notes || null,
        termsAcceptedAt: new Date(),
        discountId: discount?.discountId ?? null,
        discountAmount: discount?.discountAmount ?? 0,
        attachments: { create: attachmentMedia.map((m, i) => ({ mediaId: m.id, order: i })) },
        statusHistory: { create: { toStatus: "SUBMITTED" } },
      },
    });

    res.status(201).json({ bookingNumber: booking.bookingNumber, discountAmount: discount?.discountAmount ?? 0 });

    void sendBookingReceivedClientEmail({
      bookingNumber: booking.bookingNumber,
      businessName: booking.businessName,
      contactPerson: booking.contactPerson,
      contactEmail: booking.contactEmail,
    });
    void sendBookingReceivedAdminAlert({
      bookingNumber: booking.bookingNumber,
      businessName: booking.businessName,
      contactPerson: booking.contactPerson,
      contactEmail: booking.contactEmail,
      influencerName: profile.influencer.name,
    });
    void notifyStaffByPermission("bookings", "view", {
      type: "booking.submitted",
      title: "New booking request",
      body: `${booking.businessName} requested to book ${profile.influencer.name} (${booking.bookingNumber}).`,
      linkUrl: "/influencers/bookings",
    });
  }),
);

const adminSortableFields = ["createdAt", "bookingNumber", "status", "grossAmount"];

bookingsRouter.get(
  "/admin",
  requireAuth,
  requirePermission("bookings", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: adminSortableFields,
      defaultSort: "createdAt",
    });

    const where = {
      ...exactFilter(req.query, "status"),
      ...exactFilter(req.query, "influencerId"),
      ...searchFilter(search, ["bookingNumber", "businessName", "contactEmail", "contactPerson"]),
    };

    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          businessName: true,
          grossAmount: true,
          netInfluencerEarning: true,
          createdAt: true,
          influencer: { select: { name: true, profile: { select: { username: true } } } },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

bookingsRouter.get(
  "/admin/:id",
  requireAuth,
  requirePermission("bookings", "view"),
  asyncHandler(async (req, res) => {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include: bookingDetailInclude });
    if (!booking) throw new ApiError(404, "Booking not found.");
    res.json({ item: { ...booking, allowedTransitions: nextAllowedStatuses(booking.status) } });
  }),
);

bookingsRouter.patch(
  "/admin/:id/status",
  requireAuth,
  requirePermission("bookings", "update"),
  asyncHandler(async (req, res) => {
    const data = bookingStatusTransitionSchema.parse(req.body);
    const updated = await transitionBooking(req.params.id!, data.toStatus, {
      actorType: "STAFF",
      actorId: req.user!.id,
      note: data.note,
      grossAmount: data.grossAmount,
      platformFees: data.platformFees,
      taxAmount: data.taxAmount,
      cancelReason: data.cancelReason,
    });
    res.json({ item: { ...updated, allowedTransitions: nextAllowedStatuses(updated.status) } });
  }),
);

const bookingPaymentSchema = paymentSchema.omit({ id: true, invoiceId: true });

bookingsRouter.post(
  "/admin/:id/payment",
  requireAuth,
  requirePermission("bookings", "update"),
  asyncHandler(async (req, res) => {
    const data = bookingPaymentSchema.parse(req.body);
    const updated = await recordBookingPayment(
      req.params.id!,
      {
        amount: data.amount,
        currency: data.currency,
        paymentDate: data.paymentDate,
        method: data.method,
        transactionId: data.transactionId,
        notes: data.notes,
        attachmentId: data.attachmentId,
      },
      req.user!.id,
    );
    res.json({ item: { ...updated, allowedTransitions: nextAllowedStatuses(updated.status) } });
  }),
);
