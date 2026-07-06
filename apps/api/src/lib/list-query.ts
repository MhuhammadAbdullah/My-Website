export interface ParsedListQuery {
  page: number;
  limit: number;
  skip: number;
  search?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Hard ceiling on `limit` — well above the UI's largest page-size option
// (100) so callers that need "every row" for cross-referencing (e.g. a
// project picker) can request it explicitly, without letting an
// unauthenticated-adjacent caller force an unbounded table scan.
const MAX_LIMIT = 100;

export function parseListQuery(
  query: Record<string, unknown>,
  options: { sortableFields: string[]; defaultSort?: string; defaultLimit?: number },
): ParsedListQuery {
  const page = Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1);
  const limitRaw = Number.parseInt(String(query.limit ?? options.defaultLimit ?? "10"), 10);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 10));

  const search = typeof query.search === "string" && query.search.trim() ? query.search.trim() : undefined;

  const defaultSort = options.defaultSort ?? "createdAt";
  const sortByRaw = typeof query.sortBy === "string" ? query.sortBy : defaultSort;
  const sortBy = options.sortableFields.includes(sortByRaw) ? sortByRaw : defaultSort;
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  return { page, limit, skip: (page - 1) * limit, search, sortBy, sortOrder };
}

export function paginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// Builds a case-insensitive OR-across-fields `contains` filter for the given
// search fields — the shared shape every module's search box needs.
export function searchFilter(search: string | undefined, fields: string[]): Record<string, unknown> {
  if (!search || fields.length === 0) return {};
  return { OR: fields.map((field) => ({ [field]: { contains: search, mode: "insensitive" as const } })) };
}

// Exact-match filter from a query string value — used for status/category/
// enum-style dropdown filters. Returns {} (no-op) when unset.
export function exactFilter(query: Record<string, unknown>, field: string, as: string = field): Record<string, unknown> {
  const value = query[field];
  return typeof value === "string" && value ? { [as]: value } : {};
}

// Tri-state boolean filter ("true"/"false"/unset) — for checkbox-style
// filters like "Featured only".
export function booleanFilter(query: Record<string, unknown>, field: string, as: string = field): Record<string, unknown> {
  const value = query[field];
  if (value === "true") return { [as]: true };
  if (value === "false") return { [as]: false };
  return {};
}
