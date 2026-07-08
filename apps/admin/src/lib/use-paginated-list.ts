"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ApiError, request } from "./api";

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UsePaginatedListOptions {
  /** e.g. "/faqs/admin" */
  endpoint: string;
  defaultSortBy?: string;
  defaultSortOrder?: "asc" | "desc";
  defaultLimit?: number;
  /** Query-string keys treated as exact-match filters (e.g. ["status", "categoryId"]). */
  filterKeys?: string[];
  searchDebounceMs?: number;
  /** Namespaces this instance's URL keys (e.g. "svc") — for pages with more
   *  than one independent paginated list (like Categories' three tabs), so
   *  they don't fight over the same "page"/"search" query params. */
  paramPrefix?: string;
}

/**
 * Drives a server-paginated admin list: page/limit/search/sort/filters all
 * live in the URL's query string (so refresh + back/forward preserve state),
 * with the search box debounced before it touches the URL or fires a request.
 */
export function usePaginatedList<T>({
  endpoint,
  defaultSortBy = "createdAt",
  defaultSortOrder = "desc",
  defaultLimit = 10,
  filterKeys = [],
  searchDebounceMs = 400,
  paramPrefix,
}: UsePaginatedListOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filterKeysStable = filterKeys.join(",");
  const prefix = paramPrefix ? `${paramPrefix}_` : "";
  const k = React.useCallback((name: string) => `${prefix}${name}`, [prefix]);

  const page = Math.max(1, Number.parseInt(searchParams.get(k("page")) ?? "1", 10) || 1);
  const limit = Number.parseInt(searchParams.get(k("limit")) ?? "", 10) || defaultLimit;
  const urlSearch = searchParams.get(k("search")) ?? "";
  const sortBy = searchParams.get(k("sortBy")) ?? defaultSortBy;
  const sortOrderParam = searchParams.get(k("sortOrder"));
  const sortOrder: "asc" | "desc" = sortOrderParam === "asc" || sortOrderParam === "desc" ? sortOrderParam : defaultSortOrder;
  const filters = React.useMemo(
    () => Object.fromEntries(filterKeysStable.split(",").filter(Boolean).map((name) => [name, searchParams.get(k(name)) ?? ""])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, filterKeysStable, prefix],
  );

  const [searchInput, setSearchInput] = React.useState(urlSearch);
  React.useEffect(() => setSearchInput(urlSearch), [urlSearch]);

  const updateParams = React.useCallback(
    (next: Record<string, string | number | null | undefined>, preservePage = false) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!preservePage) params.delete(k("page"));
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === undefined || value === "") params.delete(k(key));
        else params.set(k(key), String(value));
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, pathname, searchParams, prefix],
  );

  // Debounce the search box before it becomes a URL change / network request.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== urlSearch) updateParams({ search: searchInput || null });
    }, searchDebounceMs);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const [data, setData] = React.useState<T[] | null>(null);
  const [meta, setMeta] = React.useState<PaginationMeta | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const queryString = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (urlSearch) params.set("search", urlSearch);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    return params.toString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, urlSearch, sortBy, sortOrder, JSON.stringify(filters)]);

  const reload = React.useCallback(() => {
    setLoading(true);
    setError(null);
    request<{ items: T[] } & PaginationMeta>(`${endpoint}?${queryString}`)
      .then((res) => {
        setData(res.items);
        setMeta({
          total: res.total,
          page: res.page,
          limit: res.limit,
          totalPages: res.totalPages,
          hasNextPage: res.hasNextPage,
          hasPrevPage: res.hasPrevPage,
        });
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Something went wrong"))
      .finally(() => setLoading(false));
     
  }, [endpoint, queryString]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  return {
    data,
    meta,
    loading,
    error,
    reload,
    page,
    limit,
    search: searchInput,
    sortBy,
    sortOrder,
    filters,
    hasActiveFilters: Boolean(urlSearch) || Object.values(filters).some(Boolean),
    setSearch: setSearchInput,
    setPage: (p: number) => updateParams({ page: p }, true),
    setLimit: (l: number) => updateParams({ limit: l }),
    setSort: (field: string, order: "asc" | "desc") => updateParams({ sortBy: field, sortOrder: order }),
    setFilter: (key: string, value: string) => updateParams({ [key]: value }),
    clearFilters: () => updateParams({ search: null, ...Object.fromEntries(filterKeysStable.split(",").filter(Boolean).map((name) => [name, null])) }),
  };
}
