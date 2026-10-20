"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { cn } from "@agency/ui";
import { adminNavGroups } from "@/lib/nav-config";
import { usePermissions } from "@/lib/use-permissions";

interface Target {
  label: string;
  hint: string;
  href: string;
}

// Record lists read ?search= from the URL (see lib/use-paginated-list.ts), so a query becomes a link into them.
const RECORD_TARGETS: { label: string; path: string; resource: string }[] = [
  { label: "Clients", path: "/finance/clients", resource: "clients" },
  { label: "Invoices", path: "/finance/invoices", resource: "invoices" },
  { label: "Quotations", path: "/finance/quotations", resource: "quotations" },
  { label: "Payments", path: "/finance/payments", resource: "payments" },
  { label: "Influencers", path: "/influencers", resource: "influencers" },
  { label: "Bookings", path: "/influencers/bookings", resource: "bookings" },
  { label: "Services", path: "/services", resource: "services" },
  { label: "Portfolio", path: "/portfolio", resource: "projects" },
  { label: "Messages", path: "/analytics", resource: "leads" },
];

export function GlobalSearch({ className }: { className?: string }) {
  const router = useRouter();
  const { can } = usePermissions();
  const [value, setValue] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const q = value.trim();
  const targets = React.useMemo<Target[]>(() => {
    if (!q) return [];
    const needle = q.toLowerCase();
    const pages = adminNavGroups
      .flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })))
      .filter((i) => i.label.toLowerCase().includes(needle) && (i.resource === null || can(i.resource, "view")))
      .slice(0, 4)
      .map((i) => ({ label: i.label, hint: `Open page · ${i.group}`, href: i.href }));
    const records = RECORD_TARGETS.filter((t) => can(t.resource, "view")).map((t) => ({
      label: `${t.label} matching “${q}”`,
      hint: "Search records",
      href: `${t.path}?search=${encodeURIComponent(q)}`,
    }));
    return [...records, ...pages];
  }, [q, can]);

  React.useEffect(() => setActive(0), [q]);

  React.useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function go(t: Target | undefined) {
    if (!t) return;
    setOpen(false);
    setValue("");
    inputRef.current?.blur();
    router.push(t.href);
  }

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" aria-hidden />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(targets.length - 1, a + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(targets[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        type="search"
        role="combobox"
        aria-expanded={open && targets.length > 0}
        aria-label="Search clients, invoices, creators"
        placeholder="Search clients, invoices, creators…"
        className="h-10 w-full rounded-full border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-[13px] text-heading outline-none transition-colors placeholder:text-neutral-400 focus:border-accent-500 [&::-webkit-search-cancel-button]:hidden"
      />
      {open && targets.length > 0 && (
        <div role="listbox" className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[14px] border border-neutral-200 bg-neutral-50 p-1.5 shadow-[var(--shadow-soft-lg)]">
          {targets.map((t, i) => (
            <button
              key={t.href + i}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(t)}
              className={cn("flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-left", i === active && "bg-neutral-100")}
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-heading">{t.label}</span>
                <span className="block text-label text-neutral-400">{t.hint}</span>
              </span>
              {i === active && <CornerDownLeft className="size-3.5 shrink-0 text-neutral-400" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
