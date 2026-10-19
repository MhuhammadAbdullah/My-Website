"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Search } from "lucide-react";
import { cn } from "@agency/ui";
import { cloudinaryTransform } from "@/lib/cloudinary";

export interface AffiliateItem {
  id: string;
  name: string;
  category: string;
  categorySlug: string;
  description: string;
  benefits: string[];
  badge: string;
  code: string;
  why: string;
  url: string;
  ctaLabel: string;
  isFeatured: boolean;
  logo: string | null;
}

export interface AffiliateLabels {
  all: string;
  searchPlaceholder: string;
  featuredOnly: string;
  showing: string;
  why: string;
  copyCode: string;
  copied: string;
  noResults: string;
}

function CopyCode({ code, label, copiedLabel }: { code: string; label: string; copiedLabel: string }) {
  const [done, setDone] = React.useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      /* clipboard unavailable: ignore */
    }
  }
  return (
    <button type="button" onClick={copy} className="inline-flex items-center justify-center gap-2 rounded-full border border-accent-500 px-5 py-2.5 text-body-sm font-semibold text-accent-500 hover:bg-accent-500/10">
      {done ? copiedLabel : `${label} ${code}`}
    </button>
  );
}

function ToolCard({ tool, labels }: { tool: AffiliateItem; labels: AffiliateLabels }) {
  return (
    <article className="flex h-full flex-col rounded-[var(--radius-2xl)] border border-neutral-200 bg-neutral-50 p-6">
      <p className="text-label font-semibold uppercase tracking-wider text-neutral-500">{tool.category}</p>
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-neutral-100 font-heading text-body font-extrabold text-heading">
            {tool.logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL
              <img src={cloudinaryTransform(tool.logo, "f_auto,q_auto,c_fit,w_80,h_80")} alt="" className="size-full object-contain" />
            ) : (
              tool.name.charAt(0)
            )}
          </span>
          <h3 className="font-heading font-extrabold leading-tight text-heading" style={{ fontSize: "1.0625rem" }}>{tool.name}</h3>
        </div>
        {tool.badge && <span className="shrink-0 rounded-full bg-accent-500 px-2.5 py-1 text-label font-bold text-on-accent">{tool.badge}</span>}
      </div>
      <p className="mt-4 text-body-sm text-neutral-500">{tool.description}</p>
      {tool.benefits.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2">
          {tool.benefits.map((b) => (
            <li key={b} className="flex items-start gap-1.5 text-label text-heading">
              <Check className="mt-0.5 size-3.5 shrink-0 text-accent-500" aria-hidden />
              {b}
            </li>
          ))}
        </ul>
      )}
      <div className="flex-1" />
      {tool.why && (
        <p className="mt-5 rounded-[var(--radius-lg)] border border-neutral-200 bg-background p-3 text-label text-neutral-500">
          <strong className="text-heading">{labels.why}</strong> {tool.why}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        {tool.code && <CopyCode code={tool.code} label={labels.copyCode} copiedLabel={labels.copied} />}
        <Link href={tool.url} target="_blank" rel="noreferrer sponsored" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--inv-bg,#f2f2ee)] px-5 py-2.5 text-body-sm font-bold text-[var(--inv-fg,#0b0b0c)] hover:opacity-90">
          {tool.ctaLabel} <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

// Filter pills (with counts), search, "featured only" switch and the cards: all filtering happens instantly in the browser.
export function AffiliateExplorer({ tools, labels }: { tools: AffiliateItem[]; labels: AffiliateLabels }) {
  const [cat, setCat] = React.useState("all");
  const [q, setQ] = React.useState("");
  const [featured, setFeatured] = React.useState(false);

  const cats = React.useMemo(() => {
    const m = new Map<string, { name: string; n: number }>();
    for (const t of tools) m.set(t.categorySlug, { name: t.category, n: (m.get(t.categorySlug)?.n ?? 0) + 1 });
    return [...m.entries()];
  }, [tools]);

  const term = q.trim().toLowerCase();
  const list = tools.filter((t) => (cat === "all" || t.categorySlug === cat) && (!featured || t.isFeatured) && (!term || `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(term)));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {[["all", labels.all, tools.length] as const, ...cats.map(([slug, c]) => [slug, c.name, c.n] as const)].map(([slug, name, n]) => (
            <button
              key={slug}
              type="button"
              onClick={() => setCat(slug)}
              className={cn("rounded-full border px-4 py-2 text-body-sm font-semibold transition-colors", cat === slug ? "border-accent-500 bg-accent-500 text-on-accent" : "border-neutral-200 text-heading hover:border-accent-500")}
            >
              {name} <span className="ml-1 opacity-70">{n}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2 text-body-sm text-neutral-500">
            <Search className="size-4" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.searchPlaceholder} aria-label={labels.searchPlaceholder} className="w-36 bg-transparent text-heading outline-none placeholder:text-neutral-500" />
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-body-sm text-heading">
            <button
              type="button"
              role="switch"
              aria-checked={featured}
              onClick={() => setFeatured((v) => !v)}
              className={cn("relative h-5 w-9 rounded-full border transition-colors", featured ? "border-accent-500 bg-accent-500" : "border-neutral-300 bg-neutral-100")}
            >
              <span className={cn("absolute top-0.5 size-3.5 rounded-full bg-[#f2f2ee] transition-all", featured ? "left-[1.1rem] bg-[#0b0b0c]" : "left-0.5")} />
            </button>
            {labels.featuredOnly}
          </label>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mt-16 text-center text-body-lg text-neutral-500">{labels.noResults}</p>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => (
            <ToolCard key={t.id} tool={t} labels={labels} />
          ))}
        </div>
      )}
      <p className="mt-8 text-label text-neutral-500">{labels.showing.replace("{shown}", String(list.length)).replace("{total}", String(tools.length))}</p>
    </div>
  );
}
