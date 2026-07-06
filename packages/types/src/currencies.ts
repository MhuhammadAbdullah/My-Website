export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

// Well-known distinct symbols; anything not listed here falls back to its ISO
// code (matches how Stripe/most billing UIs render less-common currencies).
const SYMBOL_OVERRIDES: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  KRW: "₩",
  INR: "₹",
  PKR: "₨",
  NPR: "₨",
  LKR: "₨",
  BDT: "৳",
  IDR: "Rp",
  VND: "₫",
  THB: "฿",
  PHP: "₱",
  ILS: "₪",
  NGN: "₦",
  TRY: "₺",
  UAH: "₴",
  ZAR: "R",
  BRL: "R$",
  RUB: "₽",
  KZT: "₸",
  MNT: "₮",
  LAK: "₭",
  KHR: "៛",
  AZN: "₼",
  GEL: "₾",
  MXN: "$",
  ARS: "$",
  CLP: "$",
  COP: "$",
  UYU: "$U",
  PYG: "₲",
  CRC: "₡",
  NIO: "C$",
  HNL: "L",
  GTQ: "Q",
  DOP: "RD$",
  JMD: "J$",
  TTD: "TT$",
  BBD: "Bds$",
  BSD: "B$",
  KYD: "CI$",
  XCD: "EC$",
  ANG: "ƒ",
  AWG: "ƒ",
  SRD: "$",
  GYD: "G$",
  HKD: "HK$",
  TWD: "NT$",
  SGD: "S$",
  BND: "B$",
  CAD: "C$",
  AUD: "A$",
  NZD: "NZ$",
  CHF: "CHF",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  ISK: "kr",
  PLN: "zł",
  CZK: "Kč",
  HUF: "Ft",
  RON: "lei",
  BGN: "лв",
  EGP: "£",
  MAD: "د.م.",
};

function buildCurrencyOptions(): CurrencyOption[] {
  const codes = Intl.supportedValuesOf("currency");
  const displayNames = new Intl.DisplayNames(["en"], { type: "currency" });
  return codes
    .map((code) => ({
      code,
      name: displayNames.of(code) ?? code,
      symbol: SYMBOL_OVERRIDES[code] ?? code,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Computed once from the ICU currency table at module load — this is the
// full ISO 4217 list, so adding support for a new currency never requires a
// code change here (only a symbol override, optionally).
export const ALL_CURRENCIES: CurrencyOption[] = buildCurrencyOptions();
