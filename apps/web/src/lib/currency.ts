import { CURRENCY_OPTIONS, type CurrencyCode } from "@agency/types";

const SYMBOLS: Record<string, string> = Object.fromEntries(CURRENCY_OPTIONS.map((c) => [c.code, c.symbol]));

export function currencySymbol(code: string): string {
  return SYMBOLS[code] ?? code;
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function billingSuffix(billingType: string | null): string {
  switch (billingType) {
    case "HOURLY":
      return "/hr";
    case "MONTHLY":
      return "/mo";
    case "YEARLY":
      return "/yr";
    default:
      return "";
  }
}

export type { CurrencyCode };
