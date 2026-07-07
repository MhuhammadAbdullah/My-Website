"use client";

import * as React from "react";
import { Heading, Skeleton } from "@agency/ui";
import { Pagination } from "@agency/ui";
import { ListSummary } from "@/components/admin-list-toolbar";
import { usePaginatedList } from "@/lib/use-paginated-list";
import { useAsyncData } from "@/lib/use-resource";
import { request } from "@/lib/api";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from "@agency/types";
import { ReportSummaryCards } from "@/components/finance/reports/summary-cards";
import { ReportsFilters, type ReportsFiltersValue } from "@/components/finance/reports/reports-filters";
import { ReportsTable } from "@/components/finance/reports/reports-table";
import { ExportMenu } from "@/components/finance/reports/export-menu";
import { describeAppliedFilters, describePeriod } from "@/components/finance/reports/describe-filters";
import type { ReportRow, ReportSummary } from "@/components/finance/reports/types";

interface Client {
  id: string;
  name: string;
}
interface Project {
  id: string;
  title: string;
}

const FILTER_KEYS = [
  "datePreset",
  "dateFrom",
  "dateTo",
  "type",
  "clientId",
  "projectId",
  "paymentStatus",
  "invoiceStatus",
  "paymentMethod",
  "currency",
];

const currencyFilterOptions = [{ value: "", label: "All currencies" }, ...CURRENCY_OPTIONS.map((c) => ({ value: c.code, label: c.code }))];

export default function FinanceReportsPage() {
  const list = usePaginatedList<ReportRow>({
    endpoint: "/finance/reports",
    defaultSortBy: "date",
    defaultSortOrder: "desc",
    defaultLimit: 25,
    filterKeys: FILTER_KEYS,
  });

  const filters = list.filters as unknown as ReportsFiltersValue;

  const { data: clients } = useAsyncData<Client[]>(() => request<{ items: Client[] }>("/finance/clients").then((r) => r.items), []);
  const { data: projects } = useAsyncData<Project[]>(
    () => request<{ items: Project[] }>("/projects/admin?limit=100").then((r) => r.items),
    [],
  );

  const clientOptions = React.useMemo(() => (clients ?? []).map((c) => ({ value: c.id, label: c.name })), [clients]);
  const projectOptions = React.useMemo(() => (projects ?? []).map((p) => ({ value: p.id, label: p.title })), [projects]);

  const { data: summary, loading: summaryLoading } = useAsyncData<ReportSummary>(() => {
    const qs = new URLSearchParams();
    if (filters.datePreset) qs.set("datePreset", filters.datePreset);
    if (filters.dateFrom) qs.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) qs.set("dateTo", filters.dateTo);
    if (filters.clientId) qs.set("clientId", filters.clientId);
    if (filters.projectId) qs.set("projectId", filters.projectId);
    if (filters.currency) qs.set("currency", filters.currency);
    return request<ReportSummary>(`/finance/reports/summary?${qs.toString()}`);
  }, [filters.datePreset, filters.dateFrom, filters.dateTo, filters.clientId, filters.projectId, filters.currency]);

  const reportCurrency = filters.currency || DEFAULT_CURRENCY;
  const appliedFilterLabels = React.useMemo(
    () => describeAppliedFilters({ search: list.search, filters, clientOptions, projectOptions }),
    [list.search, filters, clientOptions, projectOptions],
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Heading level={2}>Reports</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">
            A complete financial statement of quotations, invoices, and payments — searchable, filterable, and exportable.
          </p>
        </div>
        <ExportMenu
          search={list.search}
          filters={filters}
          sortBy={list.sortBy}
          sortOrder={list.sortOrder}
          periodLabel={describePeriod(filters)}
          appliedFilterLabels={appliedFilterLabels}
          summary={summary}
          currency={reportCurrency}
        />
      </div>

      <div className="mt-6">
        <ReportSummaryCards summary={summary} loading={summaryLoading} currency={reportCurrency} />
      </div>

      <div className="mt-8">
        <ReportsFilters
          search={list.search}
          onSearchChange={list.setSearch}
          filters={filters}
          onFilterChange={(key, value) => list.setFilter(key, value)}
          hasActiveFilters={list.hasActiveFilters}
          onClearFilters={list.clearFilters}
          clientOptions={clientOptions}
          projectOptions={projectOptions}
          currencyOptions={currencyFilterOptions}
          limit={list.limit}
          onLimitChange={list.setLimit}
        />
      </div>

      <div className="mt-4">
        {list.loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : list.error ? (
          <p className="text-center text-body-sm text-error-500">{list.error}</p>
        ) : (
          <ReportsTable
            items={list.data ?? []}
            loading={list.loading}
            hasActiveFilters={list.hasActiveFilters}
            sortBy={list.sortBy}
            sortOrder={list.sortOrder}
            onSort={list.setSort}
          />
        )}
      </div>

      {!list.loading && !list.error && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <ListSummary meta={list.meta} />
          <Pagination page={list.page} totalPages={list.meta?.totalPages ?? 1} onPageChange={list.setPage} />
        </div>
      )}
    </div>
  );
}
