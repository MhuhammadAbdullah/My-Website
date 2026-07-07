"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "./lib/cn";
import { fieldBaseClass } from "./input";

export interface IconPickerProps {
  value: string;
  onValueChange: (name: string) => void;
  options: Record<string, LucideIcon>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

// Generic icon picker -- takes a curated `options` map (name -> component)
// from the caller rather than the full lucide-react catalog, so each usage
// can offer whichever icon set actually fits its content.
export function IconPicker({
  value,
  onValueChange,
  options,
  placeholder = "Choose an icon…",
  searchPlaceholder = "Search icons…",
  emptyText = "No matching icons.",
  className,
}: IconPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const SelectedIcon = options[value];
  const names = Object.keys(options);
  const filtered = query.trim() ? names.filter((n) => n.toLowerCase().includes(query.trim().toLowerCase())) : names;

  function select(name: string) {
    onValueChange(name);
    setOpen(false);
    setQuery("");
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
          className={cn(fieldBaseClass, "flex items-center justify-between gap-2 text-left", !SelectedIcon && "text-neutral-400", className)}
        >
          <span className="flex items-center gap-2 truncate">
            {SelectedIcon ? (
              <>
                <SelectedIcon className="size-4 shrink-0" /> {value}
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronDown className="size-4 shrink-0 text-neutral-400" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-80 overflow-hidden rounded-xl border border-neutral-200 bg-background shadow-soft-lg"
          onOpenAutoFocus={(event: Event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div className="border-b border-neutral-200 p-1.5">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border-none bg-transparent px-2.5 py-1.5 text-body-sm text-heading placeholder:text-neutral-400 focus:outline-none"
            />
          </div>
          <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="col-span-6 px-3 py-2 text-center text-body-sm text-neutral-400">{emptyText}</p>
            ) : (
              filtered.map((name) => {
                const Icon = options[name]!;
                const active = name === value;
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => select(name)}
                    className={cn(
                      "flex size-11 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-heading",
                      active && "bg-accent-50 text-accent-600",
                    )}
                  >
                    <Icon className="size-5" />
                  </button>
                );
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
