"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, Bookmark, Rocket, Search } from "lucide-react";
import { cn } from "@agency/ui";
import { useAuthModal } from "./auth-modal-provider";

// "I am a brand | I am a creator" switch: the creator side opens the login form first (it has a link to sign up).
export function AudienceToggle({ brand, creator, registrationEnabled }: { brand: string; creator: string; registrationEnabled: boolean }) {
  const { openAuthModal } = useAuthModal();
  return (
    <div role="tablist" className="inline-flex rounded-full border border-neutral-200 bg-neutral-50 p-1">
      <span role="tab" aria-selected className="rounded-full bg-accent-500 px-4 py-1.5 text-body-sm font-bold text-on-accent">
        {brand}
      </span>
      <button type="button" role="tab" aria-selected={false} onClick={() => openAuthModal("login")} className="rounded-full px-4 py-1.5 text-body-sm font-semibold text-heading hover:text-accent-500">
        {creator}
      </button>
    </div>
  );
}

export function HeroButtons({ browse, brief, briefHref }: { browse: string; brief: string; briefHref: string }) {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {browse && (
        <a href="#creators" className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-body-sm font-bold text-on-accent hover:opacity-90">
          {browse} <ArrowDown className="size-4" aria-hidden />
        </a>
      )}
      {brief && (
        <Link href={briefHref || "/contact"} className="inline-flex items-center rounded-full border border-neutral-300 px-6 py-3 text-body-sm font-semibold text-heading hover:border-accent-500">
          {brief}
        </Link>
      )}
    </div>
  );
}

const STEP_ICONS = [Search, Bookmark, Rocket, ArrowRight];

export function StepCards({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
      {steps.map((s, i) => {
        const Icon = STEP_ICONS[i % STEP_ICONS.length]!;
        return (
          <div key={i} className="flex items-start gap-4 rounded-[14px] border border-neutral-200 bg-neutral-50 p-4 sm:flex-col sm:gap-3 lg:flex-row lg:gap-4 lg:rounded-[var(--radius-xl)]">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-500 text-on-accent">
              <Icon className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-body-sm font-bold text-heading">{s.title}</p>
              <p className="mt-0.5 text-label text-neutral-500">{s.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CreatorCtaButton({ label, registrationEnabled }: { label: string; registrationEnabled: boolean }) {
  const { openAuthModal } = useAuthModal();
  if (!registrationEnabled) return null;
  return (
    <button type="button" onClick={() => openAuthModal("register")} className={cn("mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--inv-bg,#f2f2ee)] px-6 py-3 text-body-sm font-bold text-[var(--inv-fg,#0b0b0c)] hover:opacity-90")}>
      {label} <ArrowRight className="size-4" aria-hidden />
    </button>
  );
}
