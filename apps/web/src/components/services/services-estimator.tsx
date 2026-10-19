"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { cn } from "@agency/ui";
import { currencySymbol, formatAmount } from "@/lib/currency";
import { useCurrency } from "./currency-context";

export interface EstimatorService {
  id: string;
  name: string;
  price: { amount: number; currency: string } | null;
}

export interface EstimatorProps {
  services: EstimatorService[];
  heading: string;
  intro: string;
  cardLabel: string;
  note: string;
  emptyText: string;
  button: { label: string; href: string };
}

// "Estimate your project": pick services, see the combined starting price in the chosen currency.
export function ServicesEstimator({ services, heading, intro, cardLabel, note, emptyText, button }: EstimatorProps) {
  const { convert, selected } = useCurrency();
  const [picked, setPicked] = React.useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const chosen = services.filter((s) => picked.has(s.id));
  // Sum every priced service in the displayed currency (converted when rates exist).
  let total = 0;
  let code = selected;
  for (const s of chosen) {
    if (!s.price) continue;
    const c = convert(s.price.amount, s.price.currency);
    total += c.amount;
    code = c.code;
  }
  const noteText = note.replace("{count}", String(chosen.length));
  const query = chosen.length ? `?services=${encodeURIComponent(chosen.map((s) => s.name).join(", "))}` : "";

  return (
    <div className="grid gap-8 rounded-[var(--radius-2xl)] border border-neutral-200 bg-surface p-6 sm:p-10 lg:grid-cols-[1.5fr_1fr]">
      <div>
        {heading && <h2 className="font-heading text-[clamp(2rem,1.2rem+3vw,3.75rem)] font-extrabold leading-[0.95]">{heading}</h2>}
        {intro && <p className="mt-4 max-w-md text-body-sm text-neutral-500">{intro}</p>}
        <ul className="mt-6 grid gap-2 sm:grid-cols-3" aria-label="Services to include">
          {services.map((s) => {
            const on = picked.has(s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(s.id)}
                  className={cn(
                    "flex h-full w-full items-start justify-between gap-2 rounded-xl border px-3 py-3 text-left text-label font-semibold transition-colors",
                    on ? "border-transparent bg-[#f2f2ee] text-[#0b0b0c]" : "border-neutral-300 text-heading hover:border-accent-500",
                  )}
                >
                  <span>{s.name}</span>
                  {on ? <Check className="size-4 shrink-0" /> : <Plus className="size-4 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col justify-between rounded-[var(--radius-xl)] bg-accent-500 p-6 text-on-accent">
        <div>
          {cardLabel && <p className="font-mono text-label font-bold uppercase tracking-[0.1em]">{cardLabel}</p>}
          <p className="mt-3 font-heading text-[clamp(2.25rem,1.4rem+2.6vw,3.5rem)] font-extrabold leading-none tracking-[0.01em]" aria-live="polite">
            {chosen.length ? (
              <>
                <span className="currency-symbol">{currencySymbol(code)}</span>
                {formatAmount(total)}
              </>
            ) : (
              <span className="text-h3">{emptyText || "—"}</span>
            )}
          </p>
          {chosen.length > 0 && noteText && <p className="mt-3 text-body-sm">{noteText}</p>}
        </div>
        {button.label && (
          <Link href={`${button.href || "/contact"}${query}`} className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#0b0b0c] px-6 py-3.5 text-body-sm font-bold text-[#f2f2ee] hover:opacity-90">
            {button.label} <span aria-hidden>&rarr;</span>
          </Link>
        )}
      </div>
    </div>
  );
}
