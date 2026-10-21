"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Input, Popover, PopoverContent, PopoverTrigger, cn } from "@agency/ui";

// Multi-select dropdown with search; the chosen categories show as removable chips in the closed field.
export function CategoryPicker({ categories, value, onChange }: { categories: { id: string; name: string }[]; value: string[]; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const selected = categories.filter((c) => value.includes(c.id));
  const q = filter.trim().toLowerCase();
  const shown = categories.filter((c) => !q || c.name.toLowerCase().includes(q));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[var(--radius-xl)] border border-neutral-200 bg-background px-3 py-2 text-left transition-colors hover:border-accent-500"
        >
          <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {selected.length === 0 ? (
              <span className="px-1 text-body text-neutral-400">Select categories…</span>
            ) : (
              selected.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-accent-500 px-3 py-1 text-body-sm font-bold text-on-accent">
                  {c.name}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remove ${c.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(c.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        toggle(c.id);
                      }
                    }}
                    className="flex size-4 items-center justify-center rounded-full hover:bg-black/15"
                  >
                    <X className="size-3" aria-hidden />
                  </span>
                </span>
              ))
            )}
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-neutral-500 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
          <Input aria-label="Search categories" placeholder="Search categories…" className="h-10 pl-9" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <ul role="listbox" aria-multiselectable className="mt-2 max-h-60 overflow-y-auto">
          {shown.map((c) => {
            const active = value.includes(c.id);
            return (
              <li key={c.id} role="option" aria-selected={active}>
                <button type="button" onClick={() => toggle(c.id)} className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left text-body-sm font-semibold text-heading hover:bg-neutral-100">
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-[5px] border", active ? "border-accent-500 bg-accent-500 text-on-accent" : "border-neutral-300")}>
                    {active && <Check className="size-3.5" aria-hidden />}
                  </span>
                  {c.name}
                </button>
              </li>
            );
          })}
          {shown.length === 0 && <li className="px-3 py-4 text-body-sm text-neutral-500">No category matches “{filter}”.</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
