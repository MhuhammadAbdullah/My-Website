"use client";

import * as React from "react";
import { Heading } from "@agency/ui";

// Mission / Vision / Philosophy tabs with one big numbered card.
export function MissionTabs({ tabs }: { tabs: { label: string; heading: string; text: string }[] }) {
  const [active, setActive] = React.useState(0);
  const tab = tabs[active];
  if (!tab) return null;
  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-2">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`rounded-full border px-5 py-2 text-body-sm font-semibold transition-colors ${active === i ? "border-accent-500 bg-accent-500 text-on-accent" : "border-neutral-200 text-heading hover:border-accent-500"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div key={active} className="mt-6 grid animate-[chapter-in_0.35s_ease-out] items-center gap-8 rounded-[var(--radius-2xl)] border border-neutral-200 bg-neutral-50 p-8 sm:p-12 lg:grid-cols-[16rem_1fr] lg:gap-12">
        <p className="font-heading font-extrabold leading-none text-accent-500" style={{ fontSize: "clamp(3.5rem, 2rem + 5vw, 7rem)" }}>
          {String(active + 1).padStart(2, "0")}
        </p>
        <div>
          {tab.heading && (
            <Heading level={2} style={{ fontSize: "clamp(1.5rem, 1rem + 2.4vw, 3.25rem)" }}>
              {tab.heading}
            </Heading>
          )}
          <p className="mt-5 max-w-2xl whitespace-pre-line text-body-sm text-neutral-500">{tab.text}</p>
        </div>
      </div>
    </div>
  );
}

// Values: one card is accent-filled at a time; hovering or focusing another card moves the highlight.
export function ValueCards({ values }: { values: { title: string; description: string }[] }) {
  const [active, setActive] = React.useState(0);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {values.map((v, i) => (
        <div
          key={i}
          tabIndex={0}
          onMouseEnter={() => setActive(i)}
          onFocus={() => setActive(i)}
          className={`rounded-[var(--radius-xl)] border p-6 outline-none transition-colors duration-300 ${active === i ? "border-transparent bg-accent-500 text-on-accent" : "border-neutral-200 bg-neutral-50 text-heading"}`}
        >
          <p className={`font-mono text-label ${active === i ? "text-on-accent" : "text-neutral-400"}`}>{String(i + 1).padStart(2, "0")}</p>
          <h3 className={`mt-4 font-heading text-h4 font-extrabold ${active === i ? "text-on-accent" : "text-heading"}`}>{v.title}</h3>
          <p className={`mt-3 text-body-sm ${active === i ? "text-on-accent" : "text-neutral-500"}`}>{v.description}</p>
        </div>
      ))}
    </div>
  );
}
