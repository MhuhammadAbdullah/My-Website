"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface ShortlistItem {
  id: string;
  name: string;
  username: string;
}

interface ShortlistContextValue {
  items: ShortlistItem[];
  has: (id: string) => boolean;
  toggle: (item: ShortlistItem) => void;
}

const ShortlistContext = React.createContext<ShortlistContextValue | null>(null);
const KEY = "creator-shortlist";

export function useShortlist(): ShortlistContextValue {
  const ctx = React.useContext(ShortlistContext);
  if (!ctx) throw new Error("useShortlist must be used inside <ShortlistProvider>");
  return ctx;
}

// Saved creators live in this browser only (localStorage) until the visitor sends the quote request.
export function ShortlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ShortlistItem[]>([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ShortlistItem[];
        if (Array.isArray(parsed)) setItems(parsed.filter((i) => i && typeof i.id === "string"));
      }
    } catch {
      /* storage unavailable or corrupt: start empty */
    }
  }, []);

  const toggle = React.useCallback((item: ShortlistItem) => {
    setItems((prev) => {
      const next = prev.some((p) => p.id === item.id) ? prev.filter((p) => p.id !== item.id) : [...prev, item];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = React.useMemo<ShortlistContextValue>(() => ({ items, has: (id) => items.some((i) => i.id === id), toggle }), [items, toggle]);
  return <ShortlistContext.Provider value={value}>{children}</ShortlistContext.Provider>;
}

// Floating bar at the bottom of the screen while at least one creator is saved.
export function ShortlistBar({ text, button }: { text: string; button: string }) {
  const { items } = useShortlist();
  if (items.length === 0) return null;
  const creators = items.map((i) => `${i.name} (@${i.username})`).join(", ");
  const href = `/contact?type=${encodeURIComponent("Influencer campaign")}&creators=${encodeURIComponent(creators)}`;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-xl items-center justify-between gap-4 rounded-full bg-[var(--inv-bg,#f2f2ee)] py-2 pl-6 pr-2 text-[var(--inv-fg,#0b0b0c)] shadow-soft-lg">
        <p role="status" className="text-body-sm font-medium">
          {text.replace("{n}", String(items.length))}
        </p>
        <Link href={href} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--inv-fg,#0b0b0c)] px-5 py-2.5 text-body-sm font-bold text-[var(--inv-bg,#f2f2ee)] hover:opacity-90">
          {button} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
