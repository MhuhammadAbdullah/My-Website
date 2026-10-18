"use client";

import * as React from "react";

// "10+" / "97%" / "1.5k" -> animates the numeric part from 0 when scrolled into
// view and keeps any prefix/suffix. The server-rendered markup already holds the
// final value, so no-JS / reduced-motion / crawlers always see the real number.
export function CountUp({ value, enabled }: { value: string; enabled: boolean }) {
  const match = value.match(/^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  const ref = React.useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled || !match || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = ref.current;
    if (!node) return;
    const target = parseFloat(match[2]!.replace(/,/g, ""));
    const decimals = match[2]!.includes(".") ? match[2]!.split(".")[1]!.length : 0;
    const useCommas = match[2]!.includes(",");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 1400;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          const n = target * eased;
          setDisplay(n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: useCommas }));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `match` is derived from `value`
  }, [enabled, value]);

  if (!match) return <span>{value}</span>;
  return (
    <span ref={ref} aria-label={value}>
      <span aria-hidden>
        {match[1]}
        {display ?? match[2]}
        <span className="text-accent-500 [.on-accent_&]:text-inherit">{match[3]}</span>
      </span>
    </span>
  );
}
