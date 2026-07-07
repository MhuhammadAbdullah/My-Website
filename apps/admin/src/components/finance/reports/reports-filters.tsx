"use client";

import { Search, X } from "lucide-react";
import {
  Button,
  Combobox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@agency/ui";

export const DATE_PRESET_OPTIONS = [
  { value: "", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7days", label: "Last 7 days" },
  { value: "last30days", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "thisQuarter", label: "This quarter" },
  { value: "thisYear", label: "This year" },
  { value: "custom", label: "Custom range" },
];

export const TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "QUOTATION", label: "Quotations" },
  { value: "INVOICE", label: "Invoices" },
  { value: "PAYMENT", label: "Payments" },
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "All payment statuses" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIALLY_PAID", label: "Partially paid" },
  { value: "PENDING", label: "Pending" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const INVOICE_STATUS_OPTIONS = [
  { value: "", label: "All invoice statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIALLY_PAID", label: "Partially paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "", label: "All payment methods" },
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "STRIPE", label: "Stripe" },
  { value: "PAYPAL", label: "PayPal" },
  { value: "WISE", label: "Wise" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "EASYPAISA", label: "EasyPaisa" },
  { value: "CUSTOM", label: "Custom" },
];

export interface ReportsFiltersValue {
  datePreset: string;
  dateFrom: string;
  dateTo: string;
  type: string;
  clientId: string;
  projectId: string;
  paymentStatus: string;
  invoiceStatus: string;
  paymentMethod: string;
  currency: string;
}

function FilterSelect({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <Select value={value || "__all__"} onValueChange={(v) => onChange(v === "__all__" ? "" : v)}>
      <SelectTrigger className={className ?? "h-9 w-auto min-w-[9.5rem]"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value || "__all__"} value={option.value || "__all__"}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function ReportsFilters({
  search,
  onSearchChange,
  filters,
  onFilterChange,
  hasActiveFilters,
  onClearFilters,
  clientOptions,
  projectOptions,
  currencyOptions,
  limit,
  onLimitChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  filters: ReportsFiltersValue;
  onFilterChange: (key: keyof ReportsFiltersValue, value: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  clientOptions: { value: string; label: string }[];
  projectOptions: { value: string; label: string }[];
  currencyOptions: { value: string; label: string }[];
  limit: number;
  onLimitChange: (limit: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search client, project, invoice #, quote #, transaction ID, notes…"
            className="pl-10"
          />
        </div>

        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="size-4" /> Clear filters
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect value={filters.datePreset} onChange={(v) => onFilterChange("datePreset", v)} options={DATE_PRESET_OPTIONS} />
        {filters.datePreset === "custom" && (
          <>
            <Input
              type="date"
              className="h-9 w-auto"
              value={filters.dateFrom}
              onChange={(e) => onFilterChange("dateFrom", e.target.value)}
            />
            <span className="text-body-sm text-neutral-400">to</span>
            <Input
              type="date"
              className="h-9 w-auto"
              value={filters.dateTo}
              onChange={(e) => onFilterChange("dateTo", e.target.value)}
            />
          </>
        )}

        <FilterSelect value={filters.type} onChange={(v) => onFilterChange("type", v)} options={TYPE_OPTIONS} />
        <FilterSelect
          value={filters.paymentStatus}
          onChange={(v) => onFilterChange("paymentStatus", v)}
          options={PAYMENT_STATUS_OPTIONS}
          className="h-9 w-auto min-w-[11rem]"
        />
        <FilterSelect
          value={filters.invoiceStatus}
          onChange={(v) => onFilterChange("invoiceStatus", v)}
          options={INVOICE_STATUS_OPTIONS}
          className="h-9 w-auto min-w-[11rem]"
        />
        <FilterSelect
          value={filters.paymentMethod}
          onChange={(v) => onFilterChange("paymentMethod", v)}
          options={PAYMENT_METHOD_OPTIONS}
          className="h-9 w-auto min-w-[11rem]"
        />
        <FilterSelect value={filters.currency} onChange={(v) => onFilterChange("currency", v)} options={currencyOptions} />

        <Combobox
          value={filters.clientId}
          onValueChange={(v) => onFilterChange("clientId", v)}
          options={clientOptions}
          placeholder="All clients"
          searchPlaceholder="Search clients…"
          className="h-9 w-auto min-w-[10rem]"
        />
        <Combobox
          value={filters.projectId}
          onValueChange={(v) => onFilterChange("projectId", v)}
          options={projectOptions}
          placeholder="All projects"
          searchPlaceholder="Search projects…"
          className="h-9 w-auto min-w-[10rem]"
        />

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
      </div>
    </div>
  );
}
