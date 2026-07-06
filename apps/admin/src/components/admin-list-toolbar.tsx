"use client";

import { Search, X } from "lucide-react";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@agency/ui";

export interface SortOption {
  value: string;
  label: string;
}

export interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function AdminListToolbar({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  sortBy,
  sortOrder,
  sortOptions,
  onSortChange,
  filters,
  filterOptions = [],
  onFilterChange,
  limit,
  onLimitChange,
  hasActiveFilters,
  onClearFilters,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  sortOptions: SortOption[];
  onSortChange: (field: string, order: "asc" | "desc") => void;
  filters: Record<string, string>;
  filterOptions?: FilterOption[];
  onFilterChange: (key: string, value: string) => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((filter) => (
          <Select
            key={filter.key}
            value={filters[filter.key] || "__all__"}
            onValueChange={(v) => onFilterChange(filter.key, v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="h-9 w-auto min-w-[8.5rem]">
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All {filter.label.toLowerCase()}</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}

        {sortOptions.length > 0 && (
          <Select
            value={`${sortBy}:${sortOrder}`}
            onValueChange={(v) => {
              const [field, order] = v.split(":");
              onSortChange(field!, order === "asc" ? "asc" : "desc");
            }}
          >
            <SelectTrigger className="h-9 w-auto min-w-[10rem]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.flatMap((option) => [
                <SelectItem key={`${option.value}:asc`} value={`${option.value}:asc`}>
                  {option.label} — Ascending
                </SelectItem>,
                <SelectItem key={`${option.value}:desc`} value={`${option.value}:desc`}>
                  {option.label} — Descending
                </SelectItem>,
              ])}
            </SelectContent>
          </Select>
        )}

        <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
          <SelectTrigger className="h-9 w-auto min-w-[8rem] shrink-0 whitespace-nowrap">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)} className="whitespace-nowrap">
                {size} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="size-4" /> Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

export function ListSummary({ meta }: { meta: { total: number; page: number; totalPages: number; limit: number } | null }) {
  if (!meta) return null;
  if (meta.total === 0) return <p className="text-body-sm text-neutral-400">No results.</p>;

  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  return (
    <p className="text-body-sm text-neutral-500">
      Showing {from}–{to} of {meta.total} · Page {meta.page} of {meta.totalPages}
    </p>
  );
}

export function EmptyState({ hasActiveFilters, label = "results" }: { hasActiveFilters: boolean; label?: string }) {
  return (
    <p className="text-center text-body-sm text-neutral-400">
      {hasActiveFilters ? `No ${label} match your search or filters.` : `No ${label} yet.`}
    </p>
  );
}
