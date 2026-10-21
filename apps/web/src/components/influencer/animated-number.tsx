"use client";

import * as React from "react";

// Runs once the element is on screen (or straight away when the visitor prefers reduced motion).
function useInView<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

// "10K", "4.0%", "1,250": counts up from zero, keeping the text around the number.
export function AnimatedNumber({ value, duration = 1200 }: { value: string; duration?: number }) {
  const match = value.match(/^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  const [ref, seen] = useInView<HTMLSpanElement>();
  const [shown, setShown] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!seen || !match || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = parseFloat(match[2]!.replace(/,/g, ""));
    const decimals = match[2]!.includes(".") ? match[2]!.split(".")[1]!.length : 0;
    const grouped = match[2]!.includes(",");
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const n = target * eased;
      setShown(grouped ? n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : n.toFixed(decimals));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, value]);

  if (!match) return <span>{value}</span>;
  return (
    <span ref={ref} aria-label={value}>
      <span aria-hidden>
        {match[1]}
        {shown ?? match[2]}
        {match[3]}
      </span>
    </span>
  );
}
