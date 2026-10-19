"use client";

import * as React from "react";
import { currencySymbol, formatAmount } from "@/lib/currency";

export interface CurrencyRate {
  code: string;
  rate: number;
}

interface Ctx {
  rates: CurrencyRate[];
  selected: string;
  select: (code: string) => void;
  /** Converts from the price's own currency into the selected one (unchanged when rates are missing). */
  convert: (amount: number, from: string) => { amount: number; code: string };
  format: (amount: number, from: string) => string;
}

const CurrencyContext = React.createContext<Ctx | null>(null);

export function CurrencyProvider({ rates, initial, children }: { rates: CurrencyRate[]; initial: string; children: React.ReactNode }) {
  const [selected, setSelected] = React.useState(rates.some((r) => r.code === initial) ? initial : (rates[0]?.code ?? initial));

  const value = React.useMemo<Ctx>(() => {
    const rateOf = (code: string) => rates.find((r) => r.code === code)?.rate;
    const convert = (amount: number, from: string) => {
      const fromRate = rateOf(from);
      const toRate = rateOf(selected);
      if (!fromRate || !toRate || from === selected) return { amount, code: from };
      return { amount: Math.round((amount / fromRate) * toRate), code: selected };
    };
    return {
      rates,
      selected,
      select: setSelected,
      convert,
      format: (amount, from) => {
        const c = convert(amount, from);
        return `${currencySymbol(c.code)}${formatAmount(c.amount)}`;
      },
    };
  }, [rates, selected]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = React.useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
