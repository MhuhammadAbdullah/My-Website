"use client";

import * as React from "react";
import { cn } from "./lib/cn";

export function Progress({
  value,
  className,
  label,
}: {
  value: number;
  className?: string;
  label?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-neutral-100", className)}
    >
      <div
        className="h-full rounded-full bg-accent-500 transition-[width] duration-slow ease-[var(--ease-premium)]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
