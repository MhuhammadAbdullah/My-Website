import { prisma, type Prisma } from "@agency/database";
import type { Discount } from "@agency/database";
import { ApiError } from "../middleware/error-handler.js";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

interface BookingContext {
  influencerId: string;
  contactEmail: string;
  grossAmount: number;
}

// Scope/date/usage/minimum eligibility shared by both the explicit-code path
// (throws with a specific reason) and the automatic-discount scan (silently
// filters). `strict` picks which behavior a given caller wants. Every
// discount -- whatever its scope -- also requires an APPROVED
// DiscountInfluencerResponse for ctx.influencerId specifically: a
// platform-wide ALL/CATEGORY discount still needs *that* influencer's own
// buy-in, not just admin's, so scope/category matching itself is no longer
// checked here -- it was already baked into which influencers got a
// response row at all (see syncDiscountResponses).
async function checkEligibility(discount: Discount, ctx: BookingContext, strict: boolean): Promise<boolean> {
  const now = new Date();
  const fail = (message: string) => {
    if (strict) throw new ApiError(422, message);
    return false;
  };

  if (!discount.isActive) return fail("This promo code is invalid or no longer active.");

  const response = await prisma.discountInfluencerResponse.findUnique({
    where: { discountId_influencerId: { discountId: discount.id, influencerId: ctx.influencerId } },
  });
  if (!response || response.status === "PENDING") {
    return fail("This promo code is awaiting the influencer's approval and isn't active yet.");
  }
  if (response.status === "DECLINED") return fail("This promo code is invalid or no longer active.");

  if (discount.startsAt && now < discount.startsAt) return fail("This promo code isn't active yet.");
  if (discount.endsAt && now > discount.endsAt) return fail("This promo code has expired.");
  if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
    return fail("This promo code has reached its usage limit.");
  }
  if (discount.minBookingAmount !== null && ctx.grossAmount < Number(discount.minBookingAmount)) {
    return fail(`This promo code requires a minimum booking of ${Number(discount.minBookingAmount).toLocaleString()}.`);
  }
  if (discount.scope === "FIRST_BOOKING") {
    const priorBooking = await prisma.booking.findFirst({ where: { contactEmail: ctx.contactEmail } });
    if (priorBooking) return fail("This promo code is only valid on your first booking.");
  }
  return true;
}

function computeAmount(discount: Discount, grossAmount: number): number {
  return discount.type === "PERCENT" ? round2((grossAmount * Number(discount.value)) / 100) : Math.min(Number(discount.value), grossAmount);
}

interface ResolvedDiscount {
  discountId: string;
  discountAmount: number;
}

export interface DisplayDiscount {
  type: "PERCENT" | "FIXED";
  value: number;
  amountOff: number;
  color: string | null;
}

// After a Discount's terms (scope/influencerId/categoryId/isActive/etc) are
// written, (re)computes which influencers must individually approve it and
// fans out fresh PENDING response rows for them. Called from
// discounts.routes.ts's POST and PATCH, right after the Discount row
// itself is written. Any prior responses are wiped first: edited terms
// invalidate whatever was approved/declined before -- an influencer who
// approved "10% off" shouldn't be silently bound to "20% off" after an
// admin edit, and a scope change shouldn't leave stale rows for
// influencers who are no longer eligible.
export async function syncDiscountResponses(discount: Discount): Promise<string[]> {
  await prisma.discountInfluencerResponse.deleteMany({ where: { discountId: discount.id } });

  let influencerIds: string[];
  if (discount.scope === "INFLUENCER") {
    influencerIds = discount.influencerId ? [discount.influencerId] : [];
  } else if (discount.scope === "CATEGORY") {
    if (!discount.categoryId) {
      influencerIds = [];
    } else {
      const profiles = await prisma.influencerProfile.findMany({
        where: { categories: { some: { id: discount.categoryId } }, influencer: { status: "APPROVED" } },
        select: { influencerId: true },
      });
      influencerIds = profiles.map((p) => p.influencerId);
    }
  } else {
    // ALL, FIRST_BOOKING: platform-wide -- every currently-approved
    // influencer is eligible and gets asked.
    const influencers = await prisma.influencer.findMany({ where: { status: "APPROVED" }, select: { id: true } });
    influencerIds = influencers.map((i) => i.id);
  }

  if (influencerIds.length === 0) return [];
  await prisma.discountInfluencerResponse.createMany({
    data: influencerIds.map((influencerId) => ({ discountId: discount.id, influencerId })),
  });
  return influencerIds;
}

export interface ApprovedDiscountResponse {
  influencerId: string;
  discount: Discount;
}

// Live, auto-applying (codeless) discounts an influencer has personally
// approved -- eligible for public display on marketplace/pricing cards.
// Promo *codes* are deliberately excluded here since the discounted price
// they imply never actually applies until a client types the code in at
// booking time, so showing it up front would misrepresent the real price.
// One query for every influencer's approved discounts at once (not
// per-influencer) so a listing page can match them in-memory per card
// without N+1 queries.
export async function fetchApprovedDiscountResponses(): Promise<ApprovedDiscountResponse[]> {
  const now = new Date();
  const responses = await prisma.discountInfluencerResponse.findMany({
    where: {
      status: "APPROVED",
      discount: {
        code: null,
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
    },
    include: { discount: true },
  });
  // maxUses vs usedCount can't be compared column-to-column in a Prisma
  // where clause (same constraint noted on redeemDiscount below), so it's
  // filtered here instead -- fine at this scale since the whole point of
  // this query is "small set of currently-live, approved auto-apply
  // discounts".
  return responses
    .filter((r) => r.discount.maxUses === null || r.discount.usedCount < r.discount.maxUses)
    .map((r) => ({ influencerId: r.influencerId, discount: r.discount }));
}

// Picks the single best (largest-amount-off) live discount a given
// influencer has approved for a given price -- eligibility (scope,
// category, which influencer) is already baked into `responses` via
// syncDiscountResponses, so this only needs to check the price-dependent
// minBookingAmount rule.
export function pickBestDisplayDiscount(
  responses: ApprovedDiscountResponse[],
  ctx: { influencerId: string; amount: number },
): DisplayDiscount | null {
  const eligible = responses.filter((r) => {
    if (r.influencerId !== ctx.influencerId) return false;
    if (r.discount.minBookingAmount !== null && ctx.amount < Number(r.discount.minBookingAmount)) return false;
    return true;
  });
  if (eligible.length === 0) return null;

  const best = eligible
    .map((r) => ({ discount: r.discount, amountOff: computeAmount(r.discount, ctx.amount) }))
    .sort((a, b) => b.amountOff - a.amountOff)[0]!;
  return { type: best.discount.type, value: Number(best.discount.value), amountOff: best.amountOff, color: best.discount.color };
}

// Booking submission (brief §12): a client can type a specific promo code
// (validated strictly -- an invalid code is a hard error, not a silent
// no-op), or leave it blank, in which case the best-matching *codeless*
// discount (a "Seasonal Offer" or "First Booking Discount" admin set up to
// auto-apply, and this influencer has approved) is picked automatically.
// Returns null only in the blank-code path when nothing qualifies.
//
// Redemption happens IN HERE, awaited, rather than being left to the caller
// to fire-and-forget after the booking is already created: `checkEligibility`
// reading `usedCount < maxUses` and the booking being written are two
// separate steps, so without an awaited, result-checked redemption in
// between them, N concurrent requests against a `maxUses: 1` code could all
// pass the read-side check and all get the discount baked into their
// booking before any of them actually claims it. Gating the returned
// discount on `redeemDiscount()`'s atomic result closes that window: only
// the request(s) that actually win the atomic increment ever get a
// discount back.
export async function resolveBookingDiscount(code: string | undefined, ctx: BookingContext): Promise<ResolvedDiscount | null> {
  if (code) {
    const discount = await prisma.discount.findUnique({ where: { code: code.toUpperCase() } });
    if (!discount) throw new ApiError(422, "This promo code is invalid or no longer active.");
    await checkEligibility(discount, ctx, true);
    const redeemed = await redeemDiscount(discount.id);
    if (!redeemed) {
      // Lost the race for the last use between the read above and the
      // atomic increment -- an explicit, user-typed code, so this is a hard
      // error rather than a silent downgrade to full price.
      throw new ApiError(422, "This promo code just reached its usage limit. Please remove it and try again.");
    }
    return { discountId: discount.id, discountAmount: computeAmount(discount, ctx.grossAmount) };
  }

  const candidates = await prisma.discount.findMany({
    where: { code: null, isActive: true, responses: { some: { influencerId: ctx.influencerId, status: "APPROVED" } } },
  });
  const eligible: { discount: Discount; discountAmount: number }[] = [];
  for (const discount of candidates) {
    if (await checkEligibility(discount, ctx, false)) {
      eligible.push({ discount, discountAmount: computeAmount(discount, ctx.grossAmount) });
    }
  }
  // Best (largest) discount first -- if it loses its redemption race, fall
  // through to the next-best eligible one rather than giving up entirely,
  // since none of these were explicitly requested by the client.
  eligible.sort((a, b) => b.discountAmount - a.discountAmount);
  for (const candidate of eligible) {
    if (await redeemDiscount(candidate.discount.id)) {
      return { discountId: candidate.discount.id, discountAmount: candidate.discountAmount };
    }
  }
  return null;
}

// Conditional increment (skipped entirely when uncapped) so two concurrent
// bookings racing the last remaining use of a capped code can't both
// succeed -- filtering `usedCount: { lt: maxUses }` in the same UPDATE that
// performs the increment makes the check-and-increment atomic (Prisma has
// no cross-column comparison operator, so the bound has to be re-read and
// inlined as a literal rather than compared column-to-column in SQL).
// Callers MUST await the result and treat `false` as "not redeemed" --
// see resolveBookingDiscount, the only caller.
export async function redeemDiscount(discountId: string, tx: Prisma.TransactionClient = prisma): Promise<boolean> {
  const discount = await tx.discount.findUnique({ where: { id: discountId }, select: { maxUses: true } });
  if (!discount) return false;
  if (discount.maxUses === null) {
    await tx.discount.update({ where: { id: discountId }, data: { usedCount: { increment: 1 } } });
    return true;
  }
  const result = await tx.discount.updateMany({
    where: { id: discountId, usedCount: { lt: discount.maxUses } },
    data: { usedCount: { increment: 1 } },
  });
  return result.count > 0;
}
