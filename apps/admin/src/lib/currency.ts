// Single source of truth for money formatting across the admin panel --
// callers pass the currency explicitly (either a record's own `currency`
// field, or the configured Finance Settings default for aggregate/rollup
// views that don't belong to one record) rather than ever hardcoding one.
export function formatMoney(value: number | string, currency: string, options?: Intl.NumberFormatOptions): string {
  const amount = Number(value);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2, ...options }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
