// Shared by both the API (authoritative, server-side) and the admin form's
// live-preview totals, so the two can never drift apart -- one calculation,
// two consumers.
export interface FinanceLineItemInput {
  name: string;
  quantity: number;
  unitPrice: number;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  taxPercent: number;
}

// Round to 2dp at the point of calculation so floating-point line-item math
// never leaves stray fractions-of-a-cent in totals.
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeLineItemTotals(item: FinanceLineItemInput) {
  const base = item.quantity * item.unitPrice;
  const discountAmount = item.discountType === "PERCENT" ? base * (item.discountValue / 100) : item.discountValue;
  const afterDiscount = Math.max(0, base - discountAmount);
  const taxAmount = afterDiscount * (item.taxPercent / 100);
  const lineTotal = afterDiscount + taxAmount;
  return {
    base: round2(base),
    discountAmount: round2(discountAmount),
    taxAmount: round2(taxAmount),
    lineTotal: round2(lineTotal),
  };
}

export function computeDocumentTotals<T extends FinanceLineItemInput>(
  items: T[],
): {
  computedItems: (T & { lineTotal: number })[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
} {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let grandTotal = 0;

  const computedItems: (T & { lineTotal: number })[] = items.map((item) => {
    const totals = computeLineItemTotals(item);
    subtotal += totals.base;
    discountTotal += totals.discountAmount;
    taxTotal += totals.taxAmount;
    grandTotal += totals.lineTotal;
    return { ...item, lineTotal: totals.lineTotal };
  });

  return {
    computedItems,
    subtotal: round2(subtotal),
    discountTotal: round2(discountTotal),
    taxTotal: round2(taxTotal),
    grandTotal: round2(grandTotal),
  };
}
