import * as React from "react";
import { cn } from "@agency/ui";

// "Home page" -> "Home <accent>page.</accent>"
function Title({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const last = words.pop() ?? "";
  return (
    <>
      {words.join(" ")}
      {words.length > 0 && " "}
      <span className="text-accent-500">{last}.</span>
    </>
  );
}

export function PageTabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="inline-flex gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn("rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors", value === t.value ? "bg-accent-500 text-on-accent" : "text-neutral-500 hover:text-heading")}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function StatusChip({ tone, children }: { tone: "saved" | "unsaved" | "todo"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em]",
        tone === "saved" && "bg-accent-500/15 text-accent-500",
        tone === "unsaved" && "bg-warning-500/15 text-warning-500",
        tone === "todo" && "border border-warning-500/60 text-warning-500",
      )}
    >
      {children}
    </span>
  );
}

export function HomeHeader({ title, description, tabs, chips, actions }: { title: string; description: string; tabs?: React.ReactNode; chips?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h1 className="font-heading font-extrabold tracking-tight text-heading" style={{ fontSize: "clamp(2rem, 1rem + 2.8vw, 3.25rem)", lineHeight: 0.95 }}>
          <Title text={title} />
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {chips}
          {actions}
        </div>
      </div>
      <p className="mt-3 text-[14px] text-neutral-500">{description}</p>
      {tabs && <div className="mt-5 max-w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{tabs}</div>}
    </header>
  );
}
