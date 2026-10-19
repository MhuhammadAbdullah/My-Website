"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@agency/ui";
import { INFLUENCER_SOCIAL_PLATFORMS } from "@agency/types";
import { CountrySelect } from "@/components/country-select";
import type { InfluencerCategoryRead } from "@/lib/influencer-types";
import { platformLabel } from "@/lib/influencer-format";

const SORT_OPTIONS = [
  { value: "", label: "Top performing" },
  { value: "ratingAverage:desc", label: "Highest rated" },
  { value: "ratingCount:desc", label: "Most reviewed" },
  { value: "createdAt:desc", label: "Newest" },
];

const EXTRA_FILTER_KEYS = [
  "platform",
  "country",
  "city",
  "language",
  "priceMin",
  "priceMax",
  "followersMin",
  "engagementMin",
  "verified",
  "featured",
  "availability",
];

export function InfluencerFilters({
  categories,
  labels = { searchPlaceholder: "Search by name, niche or city", sort: "Sort:", filters: "Filters", all: "All" },
}: {
  categories: InfluencerCategoryRead[];
  labels?: { searchPlaceholder: string; sort: string; filters: string; all: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("search") ?? "");
  const [open, setOpen] = React.useState(false);
  const activeCategory = searchParams.get("category") ?? "";
  const sortKey = searchParams.get("sortBy") && searchParams.get("sortOrder")
    ? `${searchParams.get("sortBy")}:${searchParams.get("sortOrder")}`
    : "";

  const [draft, setDraft] = React.useState(() => Object.fromEntries(EXTRA_FILTER_KEYS.map((k) => [k, searchParams.get(k) ?? ""])));
  const activeExtraCount = EXTRA_FILTER_KEYS.filter((k) => searchParams.get(k)).length;

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  React.useEffect(() => {
    const handle = setTimeout(() => {
      if (search !== (searchParams.get("search") ?? "")) updateParams({ search: search || null });
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function applyExtraFilters() {
    const next: Record<string, string | null> = {};
    for (const key of EXTRA_FILTER_KEYS) next[key] = draft[key] || null;
    updateParams(next);
    setOpen(false);
  }

  function clearExtraFilters() {
    const cleared = Object.fromEntries(EXTRA_FILTER_KEYS.map((k) => [k, ""]));
    setDraft(cleared);
    updateParams(Object.fromEntries(EXTRA_FILTER_KEYS.map((k) => [k, null])));
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => updateParams({ category: null })}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-label font-medium transition-colors sm:px-4 sm:py-2 sm:text-body-sm",
            !activeCategory ? "border border-accent-500 bg-accent-500 text-on-accent" : "border border-neutral-200 text-heading hover:border-accent-500",
          )}
        >
          {labels.all}
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => updateParams({ category: category.slug })}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-label font-medium transition-colors sm:px-4 sm:py-2 sm:text-body-sm",
              activeCategory === category.slug ? "border border-accent-500 bg-accent-500 text-on-accent" : "border border-neutral-200 text-heading hover:border-accent-500",
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={labels.searchPlaceholder} className="rounded-full pl-10 max-sm:text-body-sm" />
        </div>

        <Select value={sortKey || "top"} onValueChange={(v) => {
          if (v === "top") return updateParams({ sortBy: null, sortOrder: null });
          const [sortBy, sortOrder] = v.split(":");
          updateParams({ sortBy: sortBy ?? null, sortOrder: sortOrder ?? null });
        }}>
          <SelectTrigger aria-label={labels.sort} title={labels.sort} className="size-11 shrink-0 justify-center whitespace-nowrap rounded-full p-0 max-sm:[&>span:last-child]:hidden sm:h-auto sm:w-60 sm:justify-between sm:px-4">
            <ArrowUpDown className="size-4 sm:hidden" aria-hidden />
            <span className="hidden items-center sm:flex">
              <span className="mr-1 shrink-0 text-neutral-500">{labels.sort}</span>
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value || "top"}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" aria-label={labels.filters} title={labels.filters} className="relative shrink-0 max-sm:size-11 max-sm:px-0">
              <SlidersHorizontal /> <span className="hidden sm:inline">{labels.filters}</span>
              {activeExtraCount > 0 && <Badge variant="dark" className="max-sm:absolute max-sm:-right-1 max-sm:-top-1">{activeExtraCount}</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[22rem] p-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Platform</Label>
                  <Select value={draft.platform || "any"} onValueChange={(v) => setDraft((d) => ({ ...d, platform: v === "any" ? "" : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any platform</SelectItem>
                      {INFLUENCER_SOCIAL_PLATFORMS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {platformLabel(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Country</Label>
                  <CountrySelect value={draft.country ?? ""} onChange={(v) => setDraft((d) => ({ ...d, country: v }))} anyLabel="Any country" placeholder="Any" />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} placeholder="Lahore" />
                </div>
                <div>
                  <Label>Language</Label>
                  <Input value={draft.language} onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value }))} placeholder="English" />
                </div>
                <div>
                  <Label>Min price</Label>
                  <Input type="number" min={0} value={draft.priceMin} onChange={(e) => setDraft((d) => ({ ...d, priceMin: e.target.value }))} />
                </div>
                <div>
                  <Label>Max price</Label>
                  <Input type="number" min={0} value={draft.priceMax} onChange={(e) => setDraft((d) => ({ ...d, priceMax: e.target.value }))} />
                </div>
                <div>
                  <Label>Min followers</Label>
                  <Input type="number" min={0} value={draft.followersMin} onChange={(e) => setDraft((d) => ({ ...d, followersMin: e.target.value }))} />
                </div>
                <div>
                  <Label>Min engagement %</Label>
                  <Input type="number" min={0} step="0.1" value={draft.engagementMin} onChange={(e) => setDraft((d) => ({ ...d, engagementMin: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2 border-t border-neutral-100 pt-3">
                {[
                  { key: "availability", label: "Available for booking" },
                  { key: "verified", label: "Verified only" },
                  { key: "featured", label: "Featured only" },
                ].map((f) => (
                  <label key={f.key} className="flex items-center gap-2.5 text-body-sm text-body">
                    <Checkbox
                      checked={draft[f.key] === "true"}
                      onCheckedChange={(checked) => setDraft((d) => ({ ...d, [f.key]: checked ? "true" : "" }))}
                    />
                    {f.label}
                  </label>
                ))}
              </div>

              <div className="flex justify-between gap-2 border-t border-neutral-100 pt-3">
                <Button variant="ghost" onClick={clearExtraFilters}>
                  Clear
                </Button>
                <Button onClick={applyExtraFilters}>Apply filters</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
