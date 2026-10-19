"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Search } from "lucide-react";
import { cn } from "@agency/ui";
import { cloudinaryTransform } from "@/lib/cloudinary";

export interface WorkProject {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  image: { url: string; alt: string } | null;
  results: { value: string; label: string }[];
}

export interface WorkLabels {
  featured: string;
  all: string;
  searchPlaceholder: string;
  grid: string;
  list: string;
  loadMore: string;
  showing: string;
  readCaseStudy: string;
  noResults: string;
}

const img = (url: string, w: number) => cloudinaryTransform(url, `f_auto,q_auto,c_limit,w_${w}`);
const resultBadge = (p: WorkProject) => (p.results[0] ? `${p.results[0].value} ${p.results[0].label}`.trim() : "");

// ---------------------------------------------------------------- featured slider
function FeaturedSlider({ items, labels }: { items: WorkProject[]; labels: WorkLabels }) {
  const [index, setIndex] = React.useState(0);
  const count = items.length;
  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + count) % count);
  if (count === 0) return null;
  const active = Math.min(index, count - 1);

  return (
    <div role="group" aria-roledescription="carousel" aria-label={labels.featured} className="overflow-hidden rounded-[var(--radius-2xl)] border border-neutral-200 bg-surface">
      {/* every slide shares one grid cell, so the card never changes size */}
      <div className="grid">
        {items.map((p, i) => {
          const on = i === active;
          return (
            <article
              key={p.id}
              aria-hidden={!on}
              className={cn(
                "col-start-1 row-start-1 grid transition-opacity duration-500 ease-[var(--ease-premium)] motion-reduce:transition-none lg:grid-cols-[1.5fr_1fr]",
                on ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <div className="relative min-h-[18rem] bg-surface-2 lg:min-h-[26rem]">
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
                  <img src={img(p.image.url, 1400)} alt={p.image.alt} loading={i === 0 ? "eager" : "lazy"} className="absolute inset-0 size-full object-cover" />
                )}
              </div>
              <div className="flex flex-col justify-between gap-6 border-t border-neutral-200 p-6 sm:p-8 lg:border-l lg:border-t-0">
                <div>
                  <span className="inline-block rounded-full bg-accent-500 px-3 py-1 font-mono text-label font-bold uppercase tracking-[0.08em] text-on-accent">
                    {labels.featured}
                    {p.category && ` · ${p.category}`}
                  </span>
                  <h2 className="mt-5 font-heading text-[clamp(1.75rem,1.2rem+2.2vw,3rem)] font-extrabold leading-[1.02] text-heading">{p.title}</h2>
                  {p.summary && <p className="mt-4 text-body-sm text-neutral-500">{p.summary}</p>}
                  {p.results.length > 0 && (
                    <dl className="mt-6 flex gap-8 border-t border-neutral-200 pt-5">
                      {p.results.slice(0, 2).map((r, k) => (
                        <div key={k}>
                          <dd className="font-heading text-[clamp(1.5rem,1.1rem+1.4vw,2.25rem)] font-extrabold leading-none tracking-[0.01em] text-heading">{r.value}</dd>
                          <dt className="mt-1 text-label text-neutral-500">{r.label}</dt>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <Link href={`/portfolio/${p.slug}`} tabIndex={on ? 0 : -1} className="inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-5 py-3 text-body-sm font-bold text-on-accent hover:opacity-90">
                    {labels.readCaseStudy} <ArrowUpRight className="size-4" />
                  </Link>
                  {count > 1 && (
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => go(-1)} aria-label="Previous project" className="flex size-10 items-center justify-center rounded-full border border-neutral-300 text-heading hover:border-accent-500">
                        <ArrowLeft className="size-4" />
                      </button>
                      <span className="text-body-sm text-neutral-500" aria-hidden>
                        {active + 1} / {count}
                      </span>
                      <button type="button" onClick={() => go(1)} aria-label="Next project" className="flex size-10 items-center justify-center rounded-full bg-accent-500 text-on-accent hover:opacity-90">
                        <ArrowRight className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ project card
function Card({ p, wide }: { p: WorkProject; wide: boolean }) {
  const badge = resultBadge(p);
  return (
    <Link href={`/portfolio/${p.slug}`} className="group block">
      <div className={cn("relative overflow-hidden rounded-[var(--radius-xl)] border border-neutral-200 bg-surface", wide ? "aspect-[16/10]" : "aspect-[4/5]")}>
        {p.image && (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
          <img src={img(p.image.url, wide ? 1200 : 700)} alt={p.image.alt} loading="lazy" className="size-full object-cover transition-transform duration-slow ease-[var(--ease-premium)] group-hover:scale-[1.03]" />
        )}
        {p.category && <span className="absolute left-4 top-4 rounded-full bg-[#0b0b0c]/85 px-3 py-1 font-mono text-label font-bold uppercase tracking-[0.08em] text-[color:var(--accent)] backdrop-blur">{p.category}</span>}
        {badge && <span className="absolute bottom-4 right-4 rounded-full bg-accent-500 px-3 py-1 text-label font-extrabold text-on-accent">{badge}</span>}
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <h3 className="font-heading text-[clamp(1.125rem,1rem+0.7vw,1.5rem)] font-extrabold leading-tight text-heading">{p.title}</h3>
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-heading transition-colors group-hover:border-accent-500 group-hover:bg-accent-500 group-hover:text-on-accent">
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      {p.summary && <p className="mt-1.5 line-clamp-2 text-body-sm text-neutral-500">{p.summary}</p>}
    </Link>
  );
}

function Row({ p }: { p: WorkProject }) {
  const badge = resultBadge(p);
  return (
    <Link href={`/portfolio/${p.slug}`} className="group grid grid-cols-[6.5rem_1fr_auto] items-center gap-4 border-b border-neutral-200 py-4 sm:grid-cols-[10rem_1fr_auto]">
      <div className="aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] border border-neutral-200 bg-surface">
        {p.image && (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
          <img src={img(p.image.url, 400)} alt={p.image.alt} loading="lazy" className="size-full object-cover" />
        )}
      </div>
      <div className="min-w-0">
        {p.category && <p className="font-mono text-label uppercase tracking-[0.08em] text-neutral-400">{p.category}</p>}
        <h3 className="mt-1 font-heading text-h4 font-extrabold text-heading group-hover:text-accent-500">{p.title}</h3>
        {p.summary && <p className="mt-1 line-clamp-1 text-body-sm text-neutral-500">{p.summary}</p>}
      </div>
      <div className="flex items-center gap-3">
        {badge && <span className="hidden rounded-full bg-accent-500 px-3 py-1 text-label font-extrabold text-on-accent sm:inline">{badge}</span>}
        <ArrowUpRight className="size-5 text-neutral-400 group-hover:text-accent-500" aria-hidden />
      </div>
    </Link>
  );
}

// --------------------------------------------------------------------- explorer
const PATTERN = [2, 1, 1, 2, 1, 1, 1];

function gridSpans(n: number): number[] {
  return Array.from({ length: n }, (_, i) => PATTERN[i % PATTERN.length]!);
}

export function WorkExplorer({ projects, featured, labels, pageSize }: { projects: WorkProject[]; featured: WorkProject[]; labels: WorkLabels; pageSize: number }) {
  const categories = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of projects) if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return [...counts.entries()];
  }, [projects]);
  const [category, setCategory] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [visible, setVisible] = React.useState(pageSize);

  const q = query.trim().toLowerCase();
  const filtered = projects.filter((p) => (!category || p.category === category) && (!q || `${p.title} ${p.summary} ${p.category}`.toLowerCase().includes(q)));
  const shown = filtered.slice(0, visible);
  const reset = () => setVisible(pageSize);

  // Grid rhythm over 3 columns: 2+1, 1+2, 1+1+1, then repeat (cards keep their own size, never stretched).
  const spans = gridSpans(shown.length);

  return (
    <div>
      <FeaturedSlider items={featured} labels={labels} />

      <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter projects" className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[["", projects.length] as const, ...categories].map(([c, n]) => (
            <button
              key={c || "all"}
              type="button"
              aria-pressed={category === c}
              onClick={() => {
                setCategory(c);
                reset();
              }}
              className={cn("shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-body-sm font-bold transition-colors", category === c ? "border-transparent bg-accent-500 text-on-accent" : "border-neutral-300 text-heading hover:border-accent-500")}
            >
              {c || labels.all} <span className={cn("ml-1 font-normal", category === c ? "text-on-accent" : "text-neutral-400")}>{n}</span>
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <label className="relative">
            <span className="sr-only">{labels.searchPlaceholder}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                reset();
              }}
              placeholder={labels.searchPlaceholder}
              className="w-44 rounded-full border border-neutral-300 bg-transparent py-1.5 pl-9 pr-3 text-body-sm text-heading placeholder:text-neutral-400 focus:border-accent-500 focus:outline-none sm:w-56"
            />
          </label>
          <div role="group" aria-label="View" className="flex rounded-full border border-neutral-300 p-0.5">
            {(["grid", "list"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={cn("rounded-full px-3 py-1 text-label font-bold transition-colors", view === v ? "bg-accent-500 text-on-accent" : "text-neutral-500 hover:text-heading")}>
                {labels[v]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-body-lg text-neutral-400">{labels.noResults}</p>
      ) : view === "grid" ? (
        <div className="mt-6 grid items-start gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((p, i) => {
            const span = spans[i] ?? 1;
            return (
              <div key={p.id} className={cn(span >= 2 && "md:col-span-2", span === 2 && "lg:col-span-2", span === 3 && "lg:col-span-3")}>
                <Card p={p} wide={span >= 2} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 border-t border-neutral-200">
          {shown.map((p) => (
            <Row key={p.id} p={p} />
          ))}
        </div>
      )}

      {filtered.length > shown.length && (
        <div className="mt-12 text-center">
          <button type="button" onClick={() => setVisible((v) => v + pageSize)} className="rounded-full border border-neutral-300 px-6 py-3 text-body-sm font-bold text-heading hover:border-accent-500">
            {labels.loadMore} ↓
          </button>
        </div>
      )}
      {filtered.length > 0 && <p className="mt-4 text-center text-label text-neutral-400">{labels.showing.replace("{shown}", String(shown.length)).replace("{total}", String(filtered.length))}</p>}
    </div>
  );
}
