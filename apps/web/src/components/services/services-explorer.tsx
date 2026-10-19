"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Minus, Plus } from "lucide-react";
import { cn } from "@agency/ui";
import { cloudinaryTransform } from "@/lib/cloudinary";
import { useCurrency } from "./currency-context";

export interface ExplorerService {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  timeline: string;
  benefits: string[];
  image: { url: string; alt: string } | null;
  price: { amount: number; currency: string; perMonth: boolean } | null;
}

export interface ExplorerLabels {
  all: string;
  pricesIn: string;
  from: string;
  perMonth: string;
  getQuote: string;
  details: string;
  whatYouGet: string;
  timeline: string;
  onRequest: string;
}

// Numbered accordion list of services: filter chips, price-currency switcher,
// and one row open at a time showing the description, what you get and a related image.
export function ServicesExplorer({ services, labels }: { services: ExplorerService[]; labels: ExplorerLabels }) {
  const { rates, selected, select, format } = useCurrency();
  const categories = React.useMemo(() => Array.from(new Set(services.map((s) => s.category).filter(Boolean))), [services]);
  const [filter, setFilter] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(services[0]?.id ?? null);

  const shown = filter ? services.filter((s) => s.category === filter) : services;

  return (
    <div>
      <div className="flex flex-col gap-4 border-y border-neutral-200 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter services" className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["", ...categories].map((c) => (
            <button
              key={c || "all"}
              type="button"
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-body-sm font-bold transition-colors",
                filter === c ? "border-transparent bg-accent-500 text-on-accent" : "border-neutral-300 text-heading hover:border-accent-500",
              )}
            >
              {c || labels.all}
            </button>
          ))}
        </div>
        {rates.length > 1 && (
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-body-sm text-neutral-500">{labels.pricesIn}</span>
            <div role="group" aria-label={labels.pricesIn} className="flex rounded-full border border-neutral-300 p-0.5">
              {rates.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  aria-pressed={selected === r.code}
                  onClick={() => select(r.code)}
                  className={cn("rounded-full px-3 py-1 text-label font-bold transition-colors", selected === r.code ? "bg-accent-500 text-on-accent" : "text-neutral-500 hover:text-heading")}
                >
                  {r.code}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ul>
        {shown.map((s, i) => {
          const open = openId === s.id;
          const panelId = `svc-${s.id}`;
          return (
            <li key={s.id} className="border-b border-neutral-200">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : s.id)}
                className="grid w-full grid-cols-[2rem_1fr_2.75rem] items-center gap-x-4 gap-y-1 py-7 text-left md:grid-cols-[3.5rem_1fr_auto_auto_2.75rem] md:gap-x-6"
              >
                <span className="font-mono text-body-sm text-neutral-400">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 font-heading text-[clamp(1.375rem,1rem+2vw,2.75rem)] font-extrabold leading-tight text-heading">{s.name}</span>
                <span className="hidden font-mono text-label uppercase tracking-[0.08em] text-neutral-400 md:block">{s.category}</span>
                <span className="hidden whitespace-nowrap text-body-sm text-neutral-500 md:block">
                  {s.price ? (
                    <>
                      {labels.from} <strong className="font-bold text-heading">{format(s.price.amount, s.price.currency)}</strong>
                      {s.price.perMonth && ` ${labels.perMonth}`}
                    </>
                  ) : (
                    <span className="text-neutral-400">{labels.onRequest}</span>
                  )}
                </span>
                <span
                  aria-hidden
                  className={cn("flex size-10 items-center justify-center justify-self-end rounded-full border transition-colors", open ? "border-transparent bg-accent-500 text-on-accent" : "border-neutral-300 text-heading")}
                >
                  {open ? <Minus className="size-4" /> : <Plus className="size-4" />}
                </span>
              </button>

              {/* animated open/close: grid rows 0fr -> 1fr */}
              <div id={panelId} role="region" className={cn("grid transition-[grid-template-rows,opacity] duration-500 ease-[var(--ease-premium)] motion-reduce:transition-none", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                <div className="overflow-hidden" inert={!open}>
                  <div className="grid gap-5 pb-8 md:grid-cols-[1.2fr_1fr_1fr] md:pl-[calc(3.5rem+1.5rem)]">
                    <div>
                      {s.description && <p className="text-body text-neutral-500">{s.description}</p>}
                      {s.timeline && (
                        <p className="mt-5 text-body-sm">
                          <span className="block font-mono text-label uppercase tracking-[0.1em] text-neutral-400">{labels.timeline}</span>
                          <span className="font-bold text-heading">{s.timeline}</span>
                        </p>
                      )}
                      <div className="mt-6 flex flex-wrap gap-3">
                        <Link href="/contact" className="rounded-full bg-accent-500 px-5 py-2.5 text-body-sm font-bold text-on-accent hover:opacity-90">
                          {labels.getQuote}
                        </Link>
                        <Link href={`/services/${s.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-5 py-2.5 text-body-sm font-bold text-heading hover:border-accent-500">
                          {labels.details} <ArrowUpRight className="size-4" />
                        </Link>
                      </div>
                    </div>

                    {s.benefits.length > 0 && (
                      <div className="rounded-[var(--radius-xl)] border border-neutral-200 bg-surface p-5">
                        <p className="font-mono text-label uppercase tracking-[0.1em] text-neutral-400">{labels.whatYouGet}</p>
                        <ul className="mt-4 space-y-2.5 text-body-sm text-heading">
                          {s.benefits.slice(0, 6).map((b) => (
                            <li key={b} className="flex items-start gap-2.5">
                              <Check className="mt-0.5 size-4 shrink-0 text-accent-500" aria-hidden />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {s.image && (
                      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-neutral-200 bg-surface">
                        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL */}
                        <img src={cloudinaryTransform(s.image.url, "f_auto,q_auto,c_fill,w_700,h_480")} alt={s.image.alt} loading="lazy" className="size-full min-h-[10rem] object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
