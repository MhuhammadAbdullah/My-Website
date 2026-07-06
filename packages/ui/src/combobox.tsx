"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "./lib/cn";
import { fieldBaseClass } from "./input";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Secondary text shown alongside the label, e.g. "USD · $" */
  secondary?: string;
  /** Extra terms to match against when filtering, e.g. [code, symbol] */
  keywords?: string[];
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selected = React.useMemo(() => options.find((o) => o.value === value), [options, value]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const haystack = [o.label, o.value, ...(o.keywords ?? [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  React.useEffect(() => {
    setHighlightedIndex(0);
  }, [query, open]);

  function selectOption(option: ComboboxOption) {
    onValueChange(option.value);
    setOpen(false);
    setQuery("");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[highlightedIndex];
      if (option) selectOption(option);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            fieldBaseClass,
            "flex items-center justify-between gap-2 text-left",
            !selected && "text-neutral-400",
            className,
          )}
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
            {selected?.secondary ? (
              <span className="ml-1.5 text-neutral-400">{selected.secondary}</span>
            ) : null}
          </span>
          <ChevronDown className="size-4 shrink-0 text-neutral-400" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[--radix-popover-trigger-width] overflow-hidden rounded-xl border border-neutral-200 bg-background shadow-soft-lg"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div className="border-b border-neutral-200 p-1.5">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border-none bg-transparent px-2.5 py-1.5 text-body-sm text-heading placeholder:text-neutral-400 focus:outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-body-sm text-neutral-400">{emptyText}</p>
            ) : (
              filtered.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectOption(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-lg py-2 pl-8 pr-3 text-left text-body-sm outline-none",
                    index === highlightedIndex && "bg-neutral-100",
                  )}
                >
                  <span className="relative flex-1 truncate">
                    <span className="absolute -left-6 flex size-4 items-center justify-center">
                      {option.value === value ? <Check className="size-4" /> : null}
                    </span>
                    {option.label}
                  </span>
                  {option.secondary ? (
                    <span className="shrink-0 text-neutral-400">{option.secondary}</span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
