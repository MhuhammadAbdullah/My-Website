import { prisma, type Prisma } from "@agency/database";
import { ApiError } from "../middleware/error-handler.js";
import { sendPayoutSentEmail } from "./influencer-mailer.js";
import { notifyInfluencer } from "./notify.js";
import { getInfluencerSettings } from "./booking.js";

function formatDocumentNumber(format: string, prefix: string, seq: number): string {
  return format
    .replaceAll("{PREFIX}", prefix)
    .replaceAll("{YEAR}", String(new Date().getFullYear()))
    .replaceAll("{SEQ}", String(seq).padStart(4, "0"));
}

// Mirrors generateBookingNumber() in lib/booking.ts -- its own short
// transaction so two concurrent payout batches never collide on the same
// sequence number.
export async function generatePayoutNumber(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.influencerSettings.findFirst();
    const settings = existing ?? (await tx.influencerSettings.create({ data: {} }));
    const seq = settings.nextPayoutSeq;
    await tx.influencerSettings.update({ where: { id: settings.id }, data: { nextPayoutSeq: seq + 1 } });
    return formatDocumentNumber(settings.payoutNumberFormat, settings.payoutPrefix, seq);
  });
}

// A booking is payable once (COMPLETED, positive earning, and not already
// sitting in a payout that hasn't failed/been cancelled) -- `none` here is
// what lets a booking become payable again if its one prior payout attempt
// was marked FAILED or CANCELLED.
export function eligibleBookingsWhere(influencerId: string): Prisma.BookingWhereInput {
  return {
    influencerId,
    status: "COMPLETED",
    netInfluencerEarning: { gt: 0 },
    payoutBookings: { none: { payout: { status: { notIn: ["FAILED", "CANCELLED"] } } } },
  };
}

export async function getEligibleBookingsForPayout(influencerId: string) {
  return prisma.booking.findMany({
    where: eligibleBookingsWhere(influencerId),
    select: { id: true, bookingNumber: true, businessName: true, netInfluencerEarning: true, completedAt: true },
    orderBy: { completedAt: "asc" },
  });
}

// Single source of truth for every earnings figure shown to an influencer --
// both the /earnings tab and the dashboard Overview page need the exact same
// numbers, so this is computed once and reused rather than duplicating the
// aggregate queries in two route handlers.
export async function getEarningsSummary(influencerId: string) {
  const [completedAgg, paidAgg, pendingPayoutAgg, eligible] = await Promise.all([
    prisma.booking.aggregate({
      where: { influencerId, status: "COMPLETED" },
      _sum: { grossAmount: true, netInfluencerEarning: true },
      _count: true,
    }),
    prisma.influencerPayout.aggregate({ where: { influencerId, status: "PAID" }, _sum: { totalAmount: true } }),
    prisma.influencerPayout.aggregate({ where: { influencerId, status: { in: ["PENDING", "PROCESSING"] } }, _sum: { totalAmount: true } }),
    getEligibleBookingsForPayout(influencerId),
  ]);
  const availableBalance = eligible.reduce((sum, b) => sum + Number(b.netInfluencerEarning), 0);

  return {
    completedCampaigns: completedAgg._count,
    // Gross campaign value vs. take-home after commission/fees -- two real,
    // distinct numbers, not a duplicate shown under two labels.
    totalEarnings: Number(completedAgg._sum.grossAmount ?? 0),
    lifetimeEarnings: Number(completedAgg._sum.netInfluencerEarning ?? 0),
    // Earned and already bundled into a payout batch, but not yet paid, vs.
    // earned and not yet in any batch at all.
    pendingEarnings: Number(pendingPayoutAgg._sum.totalAmount ?? 0),
    availableBalance,
    totalPaidOut: Number(paidAgg._sum.totalAmount ?? 0),
  };
}

export const payoutDetailInclude = {
  influencer: { select: { id: true, name: true, email: true, profile: { select: { username: true } } } },
  processedBy: { select: { name: true } },
  bookings: { include: { booking: { select: { id: true, bookingNumber: true, businessName: true, netInfluencerEarning: true, completedAt: true } } } },
};

type PayoutWithDetail = Prisma.InfluencerPayoutGetPayload<{ include: typeof payoutDetailInclude }>;

// One admin action bundles N completed, unpaid bookings for a single
// influencer into a payout batch -- snapshots the influencer's current
// default (APPROVED) payout method so a later change to their bank details
// never rewrites the record of what was actually paid out against.
export async function createPayoutBatch(influencerId: string, bookingIds: string[], notes: string | undefined): Promise<PayoutWithDetail> {
  const defaultMethod = await prisma.influencerPayoutMethod.findFirst({
    where: { influencerId, status: "APPROVED", isDefault: true },
  });
  const anyApprovedMethod =
    defaultMethod ?? (await prisma.influencerPayoutMethod.findFirst({ where: { influencerId, status: "APPROVED" } }));
  if (!anyApprovedMethod) throw new ApiError(409, "This influencer has no approved payout method on file yet.");

  const bookings = await prisma.booking.findMany({ where: { id: { in: bookingIds }, ...eligibleBookingsWhere(influencerId) } });
  if (bookings.length !== bookingIds.length) {
    throw new ApiError(422, "One or more selected bookings are no longer eligible for payout.");
  }

  const totalAmount = bookings.reduce((sum, b) => sum + Number(b.netInfluencerEarning), 0);

  const settings = await getInfluencerSettings();
  if (settings.payoutMinimumAmount !== null && totalAmount < Number(settings.payoutMinimumAmount)) {
    throw new ApiError(422, `Payout total (${totalAmount.toLocaleString()}) is below the configured minimum of ${Number(settings.payoutMinimumAmount).toLocaleString()}.`);
  }

  const currency = await prisma.financeSettings.findFirst().then((s) => s?.defaultCurrency ?? "PKR");
  const payoutNumber = await generatePayoutNumber();

  const payoutId = await prisma.$transaction(async (tx) => {
    const payout = await tx.influencerPayout.create({
      data: {
        payoutNumber,
        influencerId,
        totalAmount,
        currency,
        method: anyApprovedMethod.type,
        payoutDetailsSnapshot: anyApprovedMethod.details as Prisma.InputJsonValue,
        notes: notes || null,
        bookings: { create: bookings.map((b) => ({ bookingId: b.id, amount: b.netInfluencerEarning })) },
      },
    });
    return payout.id;
  });

  return prisma.influencerPayout.findUniqueOrThrow({ where: { id: payoutId }, include: payoutDetailInclude });
}

const PAYOUT_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["PAID", "FAILED", "CANCELLED"],
  PAID: [],
  FAILED: ["PROCESSING", "CANCELLED"],
  CANCELLED: [],
};

export function nextAllowedPayoutStatuses(from: string): string[] {
  return PAYOUT_TRANSITIONS[from] ?? [];
}

export async function transitionPayout(payoutId: string, toStatus: string, actorId: string, notes: string | undefined): Promise<PayoutWithDetail> {
  const payout = await prisma.influencerPayout.findUnique({ where: { id: payoutId }, include: payoutDetailInclude });
  if (!payout) throw new ApiError(404, "Payout not found.");
  if (!PAYOUT_TRANSITIONS[payout.status]?.includes(toStatus)) {
    throw new ApiError(409, `Cannot move a payout from ${payout.status} to ${toStatus}.`);
  }

  const updated = await prisma.influencerPayout.update({
    where: { id: payoutId },
    data: {
      status: toStatus as Prisma.EnumPayoutStatusFieldUpdateOperationsInput["set"],
      notes: notes || payout.notes,
      ...(toStatus === "PAID" ? { processedAt: new Date(), processedById: actorId } : {}),
    },
    include: payoutDetailInclude,
  });

  if (toStatus === "PAID") {
    void sendPayoutSentEmail(
      { name: updated.influencer.name, email: updated.influencer.email },
      { payoutNumber: updated.payoutNumber, totalAmount: Number(updated.totalAmount), currency: updated.currency, method: updated.method },
    );
    void notifyInfluencer(updated.influencerId, {
      type: "payout.sent",
      title: "Payout sent",
      body: `Your payout ${updated.payoutNumber} for ${updated.currency} ${Number(updated.totalAmount).toLocaleString()} has been sent.`,
      linkUrl: "/influencer/dashboard/earnings",
    });
  }

  return updated;
}

// Admin's "fix a mistake" escape hatch, mirrors overrideBookingStatus() in
// lib/booking.ts: any status to any status, bypassing PAYOUT_TRANSITIONS
// (which -- unlike this -- never allows going back to PENDING). Reversing
// OUT of PAID (e.g. mistakenly marked paid when the transfer never actually
// went through) clears processedAt/processedById since those specifically
// assert "this was sent." Moving to PENDING or CANCELLED also releases every
// bundled booking (deletes the InfluencerPayoutBooking join rows) -- those
// bookings' netInfluencerEarning was only ever "spoken for" by this payout,
// so releasing them is what makes them eligible for a fresh payout batch
// again (see eligibleBookingsWhere's `payoutBookings: { none: ... } }` check).
export async function overridePayoutStatus(payoutId: string, toStatus: string, actorId: string, notes: string | undefined): Promise<PayoutWithDetail> {
  const payout = await prisma.influencerPayout.findUnique({ where: { id: payoutId } });
  if (!payout) throw new ApiError(404, "Payout not found.");
  if (payout.status === toStatus) throw new ApiError(409, "Payout is already in this status.");

  const releasesBookings = toStatus === "PENDING" || toStatus === "CANCELLED";
  const wasPaid = payout.status === "PAID";

  await prisma.$transaction(async (tx) => {
    if (releasesBookings) {
      await tx.influencerPayoutBooking.deleteMany({ where: { payoutId } });
    }
    await tx.influencerPayout.update({
      where: { id: payoutId },
      data: {
        status: toStatus as Prisma.EnumPayoutStatusFieldUpdateOperationsInput["set"],
        notes: notes || payout.notes,
        ...(toStatus === "PAID" ? { processedAt: new Date(), processedById: actorId } : {}),
        ...(wasPaid && toStatus !== "PAID" ? { processedAt: null, processedById: null } : {}),
      },
    });
  });

  return prisma.influencerPayout.findUniqueOrThrow({ where: { id: payoutId }, include: payoutDetailInclude });
}
