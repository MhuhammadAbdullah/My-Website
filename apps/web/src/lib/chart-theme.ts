// Series colours: the site accent (e.g. orange) first, then black/white text colour, then greys and orange shades.
const tint = (accentPercent: number, other: string) => `color-mix(in oklab, var(--accent) ${accentPercent}%, ${other})`;
export const CHART_PALETTE = [
  "var(--accent)",
  "var(--color-heading)",
  "var(--color-neutral-500)",
  tint(65, "white"),
  "var(--color-neutral-400)",
  tint(75, "black"),
  "var(--color-neutral-300)",
  "var(--color-neutral-700)",
  tint(40, "white"),
];
export const GRID = "var(--color-neutral-200)";
export const AXIS_TICK = { fill: "var(--color-neutral-500)", fontSize: 11 };
export const LEGEND_STYLE = { fontSize: 11, color: "var(--color-neutral-500)" };
export const TOOLTIP = {
  contentStyle: { background: "var(--color-neutral-100)", border: "1px solid var(--color-neutral-300)", borderRadius: 8, fontSize: 12, color: "var(--color-heading)" },
  labelStyle: { color: "var(--color-heading)", fontWeight: 700 },
  itemStyle: { color: "var(--color-heading)" },
  cursor: { fill: "color-mix(in oklab, var(--color-neutral-400) 16%, transparent)" },
} as const;
