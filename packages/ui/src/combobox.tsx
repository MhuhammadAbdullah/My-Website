"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown, Search } from "lucide-react";
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
  const listRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

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
  }, [query]);

  // keep the keyboard-highlighted row visible while arrowing through a long list
  React.useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${highlightedIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

  // open on the selected row so the current choice is in view
  React.useEffect(() => {
    if (!open) return;
    const i = options.findIndex((o) => o.value === value);
    if (i >= 0) setHighlightedIndex(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    } else if (event.key === "Home") {
      event.preventDefault();
      setHighlightedIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setHighlightedIndex(Math.max(0, filtered.length - 1));
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
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
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
          <ChevronDown className={cn("size-4 shrink-0 text-neutral-400 transition-transform", open && "rotate-180")} />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-(--radix-popover-trigger-width) min-w-[14rem] overflow-hidden rounded-xl border border-neutral-200 bg-surface shadow-soft-lg"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-1.5">
            <Search className="size-4 shrink-0 text-neutral-400" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              autoComplete="off"
              className="w-full border-none bg-transparent py-1.5 text-body-sm text-heading placeholder:text-neutral-400 focus:outline-none focus-visible:!outline-none"
            />
          </div>
          <div ref={listRef} id={listId} role="listbox" className="max-h-64 overflow-y-auto overscroll-contain p-1.5">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-body-sm text-neutral-400">{emptyText}</p>
            ) : (
              filtered.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  data-index={index}
                  onClick={() => selectOption(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "flex w-full cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-body-sm outline-none",
                    index === highlightedIndex && "bg-neutral-100",
                    option.value === value && "font-semibold text-heading",
                  )}
                >
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.secondary ? <span className="shrink-0 text-neutral-400">{option.secondary}</span> : null}
                  {option.value === value ? <Check className="size-4 shrink-0 text-accent-500" aria-hidden /> : null}
                </button>
              ))
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
