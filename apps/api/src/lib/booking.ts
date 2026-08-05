import { prisma, type Prisma } from "@agency/database";
import type { BookingStatusId } from "@agency/types";
import { ApiError } from "../middleware/error-handler.js";
import { generateInvoiceNumber, recomputeInvoiceBalance } from "./finance.js";
import {
  sendBookingAcceptedClientEmail,
  sendBookingApprovedClientEmail,
  sendBookingAssignedInfluencerEmail,
  sendBookingDeclinedClientEmail,
  sendCampaignCompletedClientEmail,
  sendPaymentReceivedClientEmail,
} from "./booking-mailer.js";
import { notifyInfluencer, notifyStaffByPermission } from "./notify.js";

// Server-validated allowed-transition table for the booking workflow (brief
// §9-10): the influencer confirms availability (Influencer Notified ->
// Accepted) BEFORE payment is ever requested (Awaiting Payment), so a client
// is never charged for a creator who turns out to be unavailable. Every hop
// is its own directly-requestable transition (no auto-chaining) -- each
// caller action produces exactly one BookingStatusHistory row. The one
// exception is AWAITING_PAYMENT -> PAYMENT_RECEIVED, which recordBookingPayment()
// below advances automatically since it's a direct consequence of a payment
// event, not a human decision. Declined/Delivered/Client Approved/Disputed/
// Cancelled remain as escape hatches off the main path.
const BOOKING_TRANSITIONS: Record<BookingStatusId, BookingStatusId[]> = {
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["INFLUENCER_NOTIFIED", "CANCELLED"],
  INFLUENCER_NOTIFIED: ["ACCEPTED_BY_INFLUENCER", "DECLINED_BY_INFLUENCER", "CANCELLED"],
  ACCEPTED_BY_INFLUENCER: ["AWAITING_PAYMENT", "CANCELLED"],
  DECLINED_BY_INFLUENCER: ["CANCELLED"],
  AWAITING_PAYMENT: ["PAYMENT_RECEIVED", "CANCELLED"],
  PAYMENT_RECEIVED: ["APPROVED", "CANCELLED"],
  APPROVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["DELIVERED", "COMPLETED", "DISPUTED", "CANCELLED"],
  DELIVERED: ["CLIENT_APPROVED", "DISPUTED"],
  CLIENT_APPROVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
};

export function assertValidTransition(from: BookingStatusId, to: BookingStatusId) {
  if (!BOOKING_TRANSITIONS[from]?.includes(to)) {
    throw new ApiError(409, `Cannot move a booking from ${from} to ${to}.`);
  }
}

export function nextAllowedStatuses(from: BookingStatusId): BookingStatusId[] {
  return BOOKING_TRANSITIONS[from] ?? [];
}

async function getOrCreateInfluencerSettings(tx: Prisma.TransactionClient) {
  const existing = await tx.influencerSettings.findFirst();
  if (existing) return existing;
  return tx.influencerSettings.create({ data: {} });
}

function formatDocumentNumber(format: string, prefix: string, seq: number): string {
  return format
    .replaceAll("{PREFIX}", prefix)
    .replaceAll("{YEAR}", String(new Date().getFullYear()))
    .replaceAll("{SEQ}", String(seq).padStart(4, "0"));
}

// Mirrors generateInvoiceNumber()/generateQuoteNumber() in lib/finance.ts --
// its own short transaction so two concurrent bookings can never collide on
// the same sequence number.
export async function generateBookingNumber(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const settings = await getOrCreateInfluencerSettings(tx);
    const seq = settings.nextBookingSeq;
    await tx.influencerSettings.update({ where: { id: settings.id }, data: { nextBookingSeq: seq + 1 } });
    return formatDocumentNumber(settings.bookingNumberFormat, settings.bookingPrefix, seq);
  });
}

export async function getInfluencerSettings() {
  const existing = await prisma.influencerSettings.findFirst();
  if (existing) return existing;
  return prisma.influencerSettings.create({ data: {} });
}

// Commission % resolution order (brief §11): per-campaign override (passed
// by the caller when one was set on this specific booking) beats
// per-influencer override beats the platform-wide default.
export function resolveCommissionPercent(
  settings: { defaultCommissionPercent: Prisma.Decimal | number; allowPerInfluencerOverride: boolean },
  influencerOverridePercent: Prisma.Decimal | number | null,
  campaignOverridePercent: number | null = null,
): number {
  if (campaignOverridePercent !== null) return campaignOverridePercent;
  if (settings.allowPerInfluencerOverride && influencerOverridePercent !== null) {
    return Number(influencerOverridePercent);
  }
  return Number(settings.defaultCommissionPercent);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeInfluencerEarning(
  grossAmount: number,
  commissionPercent: number,
  discountAmount = 0,
  platformFees = 0,
  taxAmount = 0,
): { commissionAmount: number; netInfluencerEarning: number } {
  const commissionAmount = round2((grossAmount * commissionPercent) / 100);
  const netInfluencerEarning = round2(Math.max(0, grossAmount - commissionAmount - discountAmount - platformFees - taxAmount));
  return { commissionAmount, netInfluencerEarning };
}

// Every InfluencerPricingItem.currency is nullable ("use the site's global
// currency setting", same convention as PricingPlan) -- resolves a single
// currency for a set of selected deliverables, erroring only if two
// *explicitly set* currencies actually conflict (mixing an explicit-currency
// item with a null one is fine; null just defers to the resolved value).
export async function resolveBookingCurrency(explicitCurrencies: (string | null)[]): Promise<string> {
  const distinct = new Set(explicitCurrencies.filter((c): c is string => !!c));
  if (distinct.size > 1) {
    throw new ApiError(422, "Selected deliverables use different currencies — this isn't supported in one booking yet.");
  }
  if (distinct.size === 1) return [...distinct][0]!;
  const financeSettings = await prisma.financeSettings.findFirst();
  return financeSettings?.defaultCurrency ?? "PKR";
}

export const bookingDetailInclude = {
  influencer: { select: { id: true, name: true, email: true, profile: { select: { username: true, commissionOverridePercent: true } } } },
  client: true,
  invoice: { include: { items: true, payments: { orderBy: { paymentDate: "desc" as const } } } },
  attachments: { include: { media: true } },
  statusHistory: { orderBy: { createdAt: "asc" as const }, include: { changedBy: { select: { name: true } }, changedByInfluencer: { select: { name: true } } } },
};

type BookingWithDetail = Prisma.BookingGetPayload<{ include: typeof bookingDetailInclude }>;

interface RequiredDeliverableSnapshot {
  deliverableTypeKey: string;
  label: string;
  price: number;
  currency: string;
}

interface TransitionOptions {
  actorType: "STAFF" | "INFLUENCER";
  actorId: string;
  note?: string;
  grossAmount?: number;
  platformFees?: number;
  taxAmount?: number;
  cancelReason?: string;
}

// The one place that mutates a Booking's status/money fields -- both the
// admin and influencer routers call this so the state machine, invoice
// generation, commission math, and notification fan-out can never drift
// between the two entry points. DB work happens in a transaction; emails/
// notifications fire afterward (never inside the transaction, matching
// every other route in this app that holds I/O outside its `$transaction`).
export async function transitionBooking(bookingId: string, toStatus: BookingStatusId, opts: TransitionOptions): Promise<BookingWithDetail> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: bookingDetailInclude });
  if (!booking) throw new ApiError(404, "Booking not found.");

  assertValidTransition(booking.status, toStatus);

  if (toStatus === "AWAITING_PAYMENT" && booking.invoiceId) {
    throw new ApiError(409, "This booking already has an invoice.");
  }
  if (toStatus === "APPROVED" && booking.invoice?.status !== "PAID") {
    throw new ApiError(409, "The invoice must be fully paid before a booking can be approved.");
  }

  // generateInvoiceNumber() opens its own `prisma.$transaction` (a separate
  // pooled connection) -- calling it from inside the transaction below would
  // nest one interactive transaction inside another. Against Supabase's
  // pgbouncer pooler (transaction pooling mode) that nested transaction
  // stalls waiting for a connection the outer one is still holding, which
  // reliably blew past the default 5s transaction timeout and 500'd every
  // AWAITING_PAYMENT transition (confirmed via P2028 "Transaction already
  // closed" errors). Generating it here, before the transaction opens,
  // mirrors how bookings.routes.ts already generates the booking number
  // itself outside any transaction.
  const invoiceNumber = toStatus === "AWAITING_PAYMENT" ? await generateInvoiceNumber() : null;

  const updated = await prisma.$transaction(async (tx) => {
    const data: Prisma.BookingUpdateInput = { status: toStatus };

    if (toStatus === "AWAITING_PAYMENT") {
      const snapshot = booking.requiredDeliverables as unknown as RequiredDeliverableSnapshot[];
      const snapshotTotal = snapshot.reduce((sum, d) => sum + d.price, 0);
      const grossAmount = opts.grossAmount ?? snapshotTotal;
      const currency = snapshot[0]?.currency ?? "PKR";
      const issueDate = new Date();
      const dueDate = new Date(issueDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const useAdjustedTotal = opts.grossAmount !== undefined && Math.abs(opts.grossAmount - snapshotTotal) > 0.005;
      const items = useAdjustedTotal
        ? [
            {
              name: `Campaign booking — ${booking.bookingNumber}`,
              pricingType: "FIXED" as const,
              quantity: 1,
              unitPrice: grossAmount,
              discountType: "PERCENT" as const,
              discountValue: 0,
              taxPercent: 0,
              lineTotal: grossAmount,
              order: 0,
            },
          ]
        : snapshot.map((d, i) => ({
            name: d.label,
            pricingType: "FIXED" as const,
            quantity: 1,
            unitPrice: d.price,
            discountType: "PERCENT" as const,
            discountValue: 0,
            taxPercent: 0,
            lineTotal: d.price,
            order: i,
          }));

      // Any promo-code/automatic discount resolved at submission time
      // (Booking.discountAmount, set in bookings.routes.ts) is what the
      // client actually gets billed less -- capped at grossAmount in case an
      // admin's `opts.grossAmount` override here ends up smaller than what
      // the discount was originally computed against.
      const discountTotal = Math.min(Number(booking.discountAmount), grossAmount);
      const grandTotal = grossAmount - discountTotal;

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: invoiceNumber!,
          status: "SENT",
          issueDate,
          dueDate,
          clientId: booking.clientId!,
          currency,
          subtotal: grossAmount,
          discountTotal,
          taxTotal: 0,
          grandTotal,
          balance: grandTotal,
          createdById: opts.actorType === "STAFF" ? opts.actorId : null,
          items: { create: items },
        },
      });

      data.invoice = { connect: { id: invoice.id } };
      data.grossAmount = grossAmount;
    }

    if (toStatus === "COMPLETED") {
      const settings = await getOrCreateInfluencerSettings(tx);
      const commissionPercent = resolveCommissionPercent(settings, booking.influencer.profile?.commissionOverridePercent ?? null);
      const platformFees = opts.platformFees ?? 0;
      const taxAmount = opts.taxAmount ?? 0;
      const { commissionAmount, netInfluencerEarning } = computeInfluencerEarning(
        Number(booking.grossAmount),
        commissionPercent,
        Number(booking.discountAmount),
        platformFees,
        taxAmount,
      );
      data.commissionPercent = commissionPercent;
      data.commissionAmount = commissionAmount;
      data.platformFees = platformFees;
      data.taxAmount = taxAmount;
      data.netInfluencerEarning = netInfluencerEarning;
      data.completedAt = new Date();
    }

    if (toStatus === "CANCELLED") {
      data.cancelledAt = new Date();
      data.cancelReason = opts.cancelReason || null;
    }

    await tx.booking.update({ where: { id: bookingId }, data });

    const historyBase = {
      bookingId,
      ...(opts.actorType === "STAFF" ? { changedById: opts.actorId } : { changedByInfluencerId: opts.actorId }),
    };
    await tx.bookingStatusHistory.create({
      data: { ...historyBase, fromStatus: booking.status, toStatus, note: opts.note || null },
    });

    return tx.booking.findUniqueOrThrow({ where: { id: bookingId }, include: bookingDetailInclude });
  }, { timeout: 15_000 });

  const emailCtx = {
    bookingNumber: updated.bookingNumber,
    businessName: updated.businessName,
    contactPerson: updated.contactPerson,
    contactEmail: updated.contactEmail,
  };

  if (toStatus === "INFLUENCER_NOTIFIED") {
    void sendBookingApprovedClientEmail(emailCtx);
    void sendBookingAssignedInfluencerEmail(emailCtx, { name: updated.influencer.name, email: updated.influencer.email });
    void notifyInfluencer(updated.influencer.id, {
      type: "booking.assigned",
      title: "New booking assigned to you",
      body: `${updated.businessName} booked you for a new campaign (${updated.bookingNumber}).`,
      linkUrl: "/influencer/dashboard/bookings",
    });
  } else if (toStatus === "ACCEPTED_BY_INFLUENCER") {
    void sendBookingAcceptedClientEmail(emailCtx);
    void notifyStaffByPermission("bookings", "view", {
      type: "booking.accepted",
      title: "Influencer accepted a booking",
      body: `${updated.influencer.name} accepted booking ${updated.bookingNumber}.`,
      linkUrl: `/influencers/bookings`,
    });
  } else if (toStatus === "DECLINED_BY_INFLUENCER") {
    void sendBookingDeclinedClientEmail(emailCtx, opts.note || null);
    void notifyStaffByPermission("bookings", "view", {
      type: "booking.declined",
      title: "Influencer declined a booking",
      body: `${updated.influencer.name} declined booking ${updated.bookingNumber}.`,
      linkUrl: `/influencers/bookings`,
    });
  } else if (toStatus === "DELIVERED") {
    void notifyStaffByPermission("bookings", "view", {
      type: "booking.delivered",
      title: "Booking marked as delivered",
      body: `${updated.influencer.name} delivered booking ${updated.bookingNumber}. Confirm with the client to proceed.`,
      linkUrl: `/influencers/bookings`,
    });
  } else if (toStatus === "COMPLETED") {
    void sendCampaignCompletedClientEmail(emailCtx);
    void notifyInfluencer(updated.influencer.id, {
      type: "booking.completed",
      title: "Campaign completed",
      body: `Booking ${updated.bookingNumber} is complete. Your earnings have been added to your balance.`,
      linkUrl: "/influencer/dashboard/earnings",
    });
  } else if (toStatus === "CANCELLED") {
    void notifyStaffByPermission("bookings", "view", {
      type: "booking.cancelled",
      title: "Booking cancelled",
      body: `Booking ${updated.bookingNumber} was cancelled.`,
      linkUrl: `/influencers/bookings`,
    });
  }

  return updated;
}

// Records a client payment against a booking's linked invoice, reusing the
// exact same recomputeInvoiceBalance() helper the standalone Finance >
// Payments module uses -- then auto-advances AWAITING_PAYMENT ->
// PAYMENT_RECEIVED the moment the invoice becomes fully paid, since that's
// the one hop in the workflow that's a direct, unambiguous consequence of a
// system event rather than a human decision.
export async function recordBookingPayment(
  bookingId: string,
  payment: { amount: number; currency: string; paymentDate: Date; method: string; transactionId?: string | null; notes?: string | null; attachmentId?: string | null },
  actorId: string,
): Promise<BookingWithDetail> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { invoice: true } });
  if (!booking) throw new ApiError(404, "Booking not found.");
  if (!booking.invoiceId) throw new ApiError(409, "This booking doesn't have an invoice yet.");
  if (payment.amount > booking.invoice!.balance.toNumber()) {
    throw new ApiError(422, `Payment amount cannot exceed the remaining balance (${booking.invoice!.balance.toNumber()}).`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId: booking.invoiceId!,
        amount: payment.amount,
        currency: payment.currency,
        paymentDate: payment.paymentDate,
        method: payment.method as Prisma.PaymentCreateInput["method"],
        transactionId: payment.transactionId || null,
        notes: payment.notes || null,
        attachmentId: payment.attachmentId || null,
        createdById: actorId,
      },
    });
    const invoice = await recomputeInvoiceBalance(booking.invoiceId!, tx);

    if (invoice.status === "PAID" && booking.status === "AWAITING_PAYMENT") {
      await tx.booking.update({ where: { id: bookingId }, data: { status: "PAYMENT_RECEIVED" } });
      await tx.bookingStatusHistory.create({
        data: { bookingId, fromStatus: "AWAITING_PAYMENT", toStatus: "PAYMENT_RECEIVED", changedById: actorId, note: "Invoice paid in full" },
      });
    }
  });

  const updated = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: bookingDetailInclude });
  void sendPaymentReceivedClientEmail(
    {
      bookingNumber: updated.bookingNumber,
      businessName: updated.businessName,
      contactPerson: updated.contactPerson,
      contactEmail: updated.contactEmail,
    },
    payment.amount,
    payment.currency,
  );
  return updated;
}

const CLIENT_PRIVATE_FIELDS = ["contactPerson", "contactEmail", "contactPhone", "businessWebsite"] as const;

// The influencer-facing booking detail response must never carry the
// client's personal contact info (brief §2) -- `bookingDetailInclude` is a
// Prisma `include`, which only controls relations, so these scalar fields
// ride along on every query built from it unless stripped here before the
// response leaves the route handler.
export function omitClientPrivateFields<T extends Record<string, unknown>>(booking: T): Omit<T, (typeof CLIENT_PRIVATE_FIELDS)[number]> {
  const clean = { ...booking };
  for (const field of CLIENT_PRIVATE_FIELDS) delete clean[field];
  return clean;
}

// "Request more details" (brief §10) -- the influencer isn't ready to
// accept/decline yet and wants clarification before deciding. This doesn't
// move the booking through the state machine (assertValidTransition is
// intentionally not called); it just logs a same-status audit row and pings
// staff, reusing the exact BookingStatusHistory/notifyStaffByPermission
// machinery every other booking event uses.
export async function requestBookingClarification(bookingId: string, influencerId: string, message: string): Promise<BookingWithDetail> {
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, influencerId } });
  if (!booking) throw new ApiError(404, "Booking not found.");
  if (booking.status !== "INFLUENCER_NOTIFIED") {
    throw new ApiError(409, "You can only request more details while a booking is awaiting your response.");
  }

  await prisma.bookingStatusHistory.create({
    data: {
      bookingId,
      fromStatus: booking.status,
      toStatus: booking.status,
      changedByInfluencerId: influencerId,
      note: `Requested more details: ${message}`,
    },
  });

  void notifyStaffByPermission("bookings", "view", {
    type: "booking.clarification_requested",
    title: "Influencer requested more details",
    body: `An influencer asked for more details on booking ${booking.bookingNumber}.`,
    linkUrl: `/influencers/bookings`,
  });

  return prisma.booking.findUniqueOrThrow({ where: { id: bookingId }, include: bookingDetailInclude });
}
