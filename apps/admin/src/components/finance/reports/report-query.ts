import type { ReportsFiltersValue } from "./reports-filters";

// Builds the query string for /finance/reports/export -- same search/filter/
// sort params the table itself is using (via usePaginatedList), just without
// page/limit, so exports always match exactly what's on screen.
export function buildReportExportQuery(params: {
  search: string;
  filters: ReportsFiltersValue;
  sortBy: string;
  sortOrder: "asc" | "desc";
}): string {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  qs.set("sortBy", params.sortBy);
  qs.set("sortOrder", params.sortOrder);
  for (const [key, value] of Object.entries(params.filters)) {
    if (value) qs.set(key, value);
  }
  return qs.toString();
}
