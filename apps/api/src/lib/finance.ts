import { prisma, type Prisma } from "@agency/database";
import { computeDocumentTotals } from "@agency/utils";
import type { LineItemInput, PricingType, DiscountType } from "@agency/types";

// Re-exported so route files only need one import path for both the
// calculation helpers and the document/balance helpers below. The actual
// calculation lives in @agency/utils, shared with the admin form's
// live-preview totals so the two can never drift apart.
export { computeLineItemTotals, computeDocumentTotals } from "@agency/utils";

// Vercel's separate type-check pass (distinct from -- and additional to --
// this project's own passing `tsc --noEmit`) repeatedly loses the
// required-ness of Zod-inferred object fields (LineItemInput's `name` in
// particular) once that type flows through computeDocumentTotals's generic
// <T> parameter at a quotations/invoices route call site -- even when the
// array is reconstructed field-by-field through an explicitly-return-typed
// helper immediately beforehand. The common factor in every failed attempt
// was still asking Vercel's checker to *infer* T for a generic call from a
// Zod-derived type. A hand-written interface with no Zod chain in its own
// definition, consumed through a fixed (non-generic) wrapper, removes that
// inference step entirely: callers never invoke computeDocumentTotals's
// generic directly, only this concrete-typed wrapper.
export interface FinanceDocumentLineItem {
  id?: string;
  name: string;
  description?: string | null;
  pricingType: PricingType;
  quantity: number;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  taxPercent: number;
  order: number;
}

export function toFinanceLineItems(items: readonly LineItemInput[]): FinanceDocumentLineItem[] {
  return items.map((it) => ({
    id: it.id,
    name: it.name,
    description: it.description,
    pricingType: it.pricingType,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    discountType: it.discountType,
    discountValue: it.discountValue,
    taxPercent: it.taxPercent,
    order: it.order,
  }));
}

export function computeQuoteOrInvoiceTotals(items: FinanceDocumentLineItem[]): {
  computedItems: (FinanceDocumentLineItem & { lineTotal: number })[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
} {
  return computeDocumentTotals(items);
}

// Round to 2dp -- used below for balance recomputation (the calculation
// helpers already round internally).
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function getOrCreateFinanceSettings(tx: Prisma.TransactionClient) {
  const existing = await tx.financeSettings.findFirst();
  if (existing) return existing;
  return tx.financeSettings.create({ data: {} });
}

function formatDocumentNumber(format: string, prefix: string, seq: number): string {
  return format
    .replaceAll("{PREFIX}", prefix)
    .replaceAll("{YEAR}", String(new Date().getFullYear()))
    .replaceAll("{SEQ}", String(seq).padStart(4, "0"));
}

// Both generators run inside their own short transaction so two concurrent
// creates can never be handed the same sequence number.
export async function generateQuoteNumber(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const settings = await getOrCreateFinanceSettings(tx);
    const seq = settings.nextQuoteSeq;
    await tx.financeSettings.update({ where: { id: settings.id }, data: { nextQuoteSeq: seq + 1 } });
    return formatDocumentNumber(settings.quoteNumberFormat, settings.quotePrefix, seq);
  });
}

export async function generateInvoiceNumber(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const settings = await getOrCreateFinanceSettings(tx);
    const seq = settings.nextInvoiceSeq;
    await tx.financeSettings.update({ where: { id: settings.id }, data: { nextInvoiceSeq: seq + 1 } });
    return formatDocumentNumber(settings.invoiceNumberFormat, settings.invoicePrefix, seq);
  });
}

// Re-derives amountPaid/balance/status from the invoice's actual Payment rows
// -- called after every payment create/update/delete so an invoice's balance
// can never drift from what's actually been recorded against it. Manual
// states (Draft/Sent/Cancelled) are left alone unless payments actually move
// the needle, so recording/removing a payment can't silently un-cancel or
// un-draft an invoice.
export async function recomputeInvoiceBalance(invoiceId: string, tx: Prisma.TransactionClient) {
  const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { payments: true } });
  const amountPaid = round2(invoice.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0));
  const grandTotal = invoice.grandTotal.toNumber();
  const balance = round2(Math.max(0, grandTotal - amountPaid));

  let status = invoice.status;
  if (status !== "CANCELLED") {
    if (amountPaid <= 0) {
      if (status === "PAID" || status === "PARTIALLY_PAID") status = "SENT";
    } else if (amountPaid >= grandTotal) {
      status = "PAID";
    } else {
      status = "PARTIALLY_PAID";
    }
  }

  return tx.invoice.update({ where: { id: invoiceId }, data: { amountPaid, balance, status } });
}
