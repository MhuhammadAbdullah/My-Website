"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import {
  Input,
  Checkbox,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
  cn,
} from "@agency/ui";

const SORT_OPTIONS = [
  { value: "recent", label: "Recently added", sortBy: "createdAt", sortOrder: "desc" },
  { value: "az", label: "Alphabetical (A–Z)", sortBy: "name", sortOrder: "asc" },
  { value: "za", label: "Alphabetical (Z–A)", sortBy: "name", sortOrder: "desc" },
] as const;

function sortValueFromParams(sortBy: string | null, sortOrder: string | null) {
  const match = SORT_OPTIONS.find((o) => o.sortBy === sortBy && o.sortOrder === sortOrder);
  return match?.value;
}

export function AffiliateFilters({
  categories,
}: {
  categories: { id: string; slug: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("search") ?? "");
  const activeCategory = searchParams.get("category") ?? "";
  const featured = searchParams.get("featured") === "true";
  const sortValue = sortValueFromParams(searchParams.get("sortBy"), searchParams.get("sortOrder"));

  const hasActiveFilters = !!(
    searchParams.get("search") ||
    activeCategory ||
    featured ||
    searchParams.get("sortBy")
  );

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    setSearch("");
    router.push(pathname);
  }

  React.useEffect(() => {
    const handle = setTimeout(() => {
      if (search !== (searchParams.get("search") ?? "")) {
        updateParams({ search: search || null });
      }
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto overscroll-x-contain scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => updateParams({ category: null })}
          className={cn(
            "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-body-sm font-medium transition-colors",
            !activeCategory ? "bg-heading text-white" : "bg-neutral-100 text-body hover:bg-neutral-200",
          )}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => updateParams({ category: category.slug })}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-body-sm font-medium transition-colors",
              activeCategory === category.slug
                ? "bg-heading text-white"
                : "bg-neutral-100 text-body hover:bg-neutral-200",
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tools…"
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <Checkbox checked={featured} onCheckedChange={(c) => updateParams({ featured: c === true ? "true" : null })} />
            <Label className="mb-0">Featured only</Label>
          </label>

          <Select
            value={sortValue}
            onValueChange={(value) => {
              const option = SORT_OPTIONS.find((o) => o.value === value);
              updateParams({ sortBy: option?.sortBy ?? null, sortOrder: option?.sortOrder ?? null });
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Sort by…" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              <X /> Clear filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
