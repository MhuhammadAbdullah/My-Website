"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronDown, Star, X } from "lucide-react";
import { cn } from "./lib/cn";
import { fieldBaseClass } from "./input";
import { ALL_ICON_NAMES } from "./icons/dynamic-icon-imports";
import { normalizeIconName } from "./icons/name-map";
import { ICON_CATEGORIES, categorizeIcon, type IconCategory } from "./icons/categories";
import { getRecentIcons, pushRecentIcon } from "./icons/recent-icons";
import { getFavoriteIcons, toggleFavoriteIcon } from "./icons/favorite-icons";
import { DynamicIcon } from "./icons/dynamic-icon";

export interface IconPickerProps {
  value: string | null;
  onValueChange: (name: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}

type FilterTab = "all" | "recent" | "favorites" | IconCategory;

const COLUMNS = 6;
const PAGE_SIZE = 120;
const SORTED_ICON_NAMES = [...ALL_ICON_NAMES].sort();

function iconLabel(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Generic icon picker over the full Lucide catalog (1,500+ icons) --
// search-first, with heuristic category grouping, recents, and favorites.
// Accepts and normalizes both canonical kebab-case names and legacy
// PascalCase component names already stored from before this rewrite.
export function IconPicker({
  value,
  onValueChange,
  placeholder = "Choose an icon…",
  searchPlaceholder = "Search icons…",
  className,
}: IconPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [tab, setTab] = React.useState<FilterTab>("all");
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const [recents, setRecents] = React.useState<string[]>([]);
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cellRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const resolvedValue = normalizeIconName(value);

  React.useEffect(() => {
    if (!open) return;
    setRecents(getRecentIcons());
    setFavorites(getFavoriteIcons());
  }, [open]);

  const favoriteSet = React.useMemo(() => new Set(favorites), [favorites]);

  const sourceNames = React.useMemo((): string[] => {
    if (tab === "recent") return recents;
    if (tab === "favorites") return favorites;
    if (tab === "all") return SORTED_ICON_NAMES;
    return SORTED_ICON_NAMES.filter((name) => categorizeIcon(name) === tab);
  }, [tab, recents, favorites]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sourceNames;
    return sourceNames.filter((name) => name.includes(q) || name.split("-").some((token) => token.startsWith(q)));
  }, [sourceNames, query]);

  const visible = filtered.slice(0, visibleCount);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setHighlightedIndex(0);
  }, [query, tab, open]);

  React.useEffect(() => {
    cellRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  function selectIcon(name: string) {
    onValueChange(name);
    setRecents(pushRecentIcon(name));
    setOpen(false);
    setQuery("");
  }

  function handleFavoriteToggle(event: React.MouseEvent, name: string) {
    event.stopPropagation();
    setFavorites(toggleFavoriteIcon(name));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, visible.length - 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((i) => Math.min(i + COLUMNS, visible.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((i) => Math.max(i - COLUMNS, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const name = visible[highlightedIndex];
      if (name) selectIcon(name);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "recent", label: "Recent" },
    { key: "favorites", label: "Favorites" },
    ...ICON_CATEGORIES.map((category) => ({ key: category, label: category })),
  ];

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
          className={cn(fieldBaseClass, "flex items-center justify-between gap-2 text-left", !resolvedValue && "text-neutral-400", className)}
        >
          <span className="flex items-center gap-2 truncate">
            {resolvedValue ? (
              <>
                <DynamicIcon name={resolvedValue} size={16} className="shrink-0" /> {iconLabel(resolvedValue)}
              </>
            ) : (
              placeholder
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {resolvedValue && (
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  onValueChange(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onValueChange(null);
                  }
                }}
                aria-label="Clear icon"
                className="rounded-full p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-heading"
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronDown className="size-4 text-neutral-400" />
          </span>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[min(92vw,26rem)] overflow-hidden rounded-xl border border-neutral-200 bg-background shadow-soft-lg"
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
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border-none bg-transparent px-2.5 py-1.5 text-body-sm text-heading placeholder:text-neutral-400 focus:outline-none"
            />
          </div>

          <div className="flex max-w-full flex-nowrap gap-1 overflow-x-auto border-b border-neutral-200 p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-body-sm font-medium text-body transition-colors",
                  tab === t.key ? "bg-accent-50 text-accent-600" : "hover:bg-neutral-100",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {visible.length === 0 ? (
              <p className="px-3 py-6 text-center text-body-sm text-neutral-400">
                {tab === "recent" ? "No recently used icons yet." : tab === "favorites" ? "No favorites yet." : "No matching icons."}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-6 gap-1">
                  {visible.map((name, index) => (
                    <button
                      key={name}
                      ref={(el) => {
                        cellRefs.current[index] = el;
                      }}
                      type="button"
                      title={iconLabel(name)}
                      onClick={() => selectIcon(name)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        "group relative flex size-11 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-heading",
                        (name === resolvedValue || index === highlightedIndex) && "bg-accent-50 text-accent-600",
                      )}
                    >
                      <DynamicIcon name={name} size={20} />
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(event) => handleFavoriteToggle(event, name)}
                        aria-label={favoriteSet.has(name) ? "Remove from favorites" : "Add to favorites"}
                        className={cn(
                          "absolute -right-1 -top-1 hidden rounded-full bg-background p-0.5 text-neutral-300 shadow-soft-sm hover:text-warning-500 group-hover:block",
                          favoriteSet.has(name) && "block text-warning-500",
                        )}
                      >
                        <Star className="size-3" fill={favoriteSet.has(name) ? "currentColor" : "none"} />
                      </span>
                    </button>
                  ))}
                </div>
                {visibleCount < filtered.length && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="mt-2 w-full rounded-lg py-2 text-center text-body-sm font-medium text-accent-600 hover:bg-neutral-100"
                  >
                    Show more ({filtered.length - visibleCount} left)
                  </button>
                )}
              </>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
