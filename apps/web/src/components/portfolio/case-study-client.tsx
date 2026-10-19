"use client";

import * as React from "react";

// Chapter tabs: the pill list on the left switches which chapter is shown on the right.
export function ChapterTabs({ title, chapters, panels }: { title: string; chapters: { id: string; title: string }[]; panels: React.ReactNode[] }) {
  const [active, setActive] = React.useState(0);
  const progress = chapters.length > 0 ? (active + 1) / chapters.length : 0;

  return (
    <>
      <nav aria-label={title} className="lg:sticky lg:top-28 lg:self-start">
        <p className="eyebrow">{title}</p>
        <div role="tablist" aria-orientation="vertical" className="mt-5 flex gap-2.5 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {chapters.map((c, i) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              id={`chapter-tab-${c.id}`}
              aria-selected={active === i}
              aria-controls={`chapter-${c.id}`}
              onClick={() => setActive(i)}
              className={`flex shrink-0 items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-3 text-left text-body-sm font-semibold transition-colors ${active === i ? "border-accent-500 bg-accent-500 text-on-accent" : "border-neutral-200 text-heading hover:border-accent-500"}`}
            >
              <span className="font-heading text-label font-extrabold">{String(i + 1).padStart(2, "0")}</span>
              {c.title}
            </button>
          ))}
        </div>
        <div className="mt-6 hidden h-0.5 w-full max-w-[14rem] rounded-full bg-neutral-200 lg:block" aria-hidden>
          <div className="h-full rounded-full bg-accent-500 transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </nav>
      <div>
        {chapters.map((c, i) => (
          <div key={c.id} id={`chapter-${c.id}`} role="tabpanel" aria-labelledby={`chapter-tab-${c.id}`} hidden={active !== i} className={active === i ? "animate-[chapter-in_0.35s_ease-out]" : undefined}>
            {panels[i]}
          </div>
        ))}
      </div>
    </>
  );
}

// Before → After image slider.
export function BeforeAfter({
  before,
  after,
  labels,
}: {
  before: { url: string; alt: string };
  after: { url: string; alt: string };
  labels: { compare: string; before: string; after: string };
}) {
  const [pos, setPos] = React.useState(50);
  return (
    <div>
      <div className="relative aspect-[16/9] w-full select-none overflow-hidden rounded-[var(--radius-xl)] border border-neutral-200 bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after.url} alt={after.alt} className="absolute inset-0 size-full object-cover" draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={before.url} alt={before.alt} className="absolute inset-0 size-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} draggable={false} />
        <span className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-label font-semibold text-white">{labels.before}</span>
        <span className="absolute right-4 top-4 rounded-full bg-accent-500 px-3 py-1 text-label font-semibold text-on-accent">{labels.after}</span>
        <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-accent-500" style={{ left: `${pos}%` }}>
          <span className="absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent-500 text-on-accent" aria-hidden>
            ↔
          </span>
        </div>
      </div>
      <label className="mt-4 flex items-center gap-4 text-label text-neutral-500">
        <span className="uppercase tracking-wider">{labels.compare}</span>
        <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label={labels.compare} className="h-1 w-full max-w-md cursor-pointer accent-[var(--accent)]" />
      </label>
    </div>
  );
}
