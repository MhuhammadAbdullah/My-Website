"use client";

import * as React from "react";
import { SocialIcon, cn } from "@agency/ui";

export interface GuidePlatform {
  key: string;
  label: string;
  icon: "instagram" | "tiktok" | "youtube" | "facebook" | "linkedin" | "x";
  html: string;
}

// One platform at a time: pick it from the row, read its steps below.
export function InsightsGuideTabs({ platforms }: { platforms: GuidePlatform[] }) {
  const [active, setActive] = React.useState(platforms[0]?.key ?? "");
  const current = platforms.find((p) => p.key === active) ?? platforms[0];
  if (!current) return null;

  return (
    <div>
      <div role="tablist" aria-label="Platform" className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {platforms.map((p) => {
          const on = p.key === current.key;
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(p.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-body-sm font-bold transition-colors",
                on ? "border-accent-500 bg-accent-500 text-on-accent" : "border-neutral-300 text-heading hover:border-accent-500",
              )}
            >
              <SocialIcon platform={p.icon} className="size-4" />
              {p.label.replace(/ (Insights|Analytics|Studio)$/, "")}
            </button>
          );
        })}
      </div>

      <section role="tabpanel" className="fade-up mt-5 rounded-[var(--radius-xl)] border border-neutral-200 bg-neutral-50 p-6 sm:p-8" key={current.key}>
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-[var(--radius-lg)] bg-accent-500/15 text-heading">
            <SocialIcon platform={current.icon} className="size-6" />
          </span>
          <div>
            <h2 className="font-heading text-[1.5rem] font-extrabold leading-tight tracking-tight text-heading">{current.label}</h2>
            <p className="text-body-sm text-neutral-500">Where to find your numbers, step by step</p>
          </div>
        </div>
        <div
          className="mt-6 text-body text-neutral-600 [&_li]:pl-2 [&_li::marker]:font-extrabold [&_li::marker]:text-accent-500 [&_ol]:list-decimal [&_ol]:space-y-4 [&_ol]:pl-6"
          dangerouslySetInnerHTML={{ __html: current.html }}
        />
      </section>
    </div>
  );
}
