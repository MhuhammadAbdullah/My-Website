import {
  DATE_PRESET_OPTIONS,
  TYPE_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  type ReportsFiltersValue,
} from "./reports-filters";

function labelFor(options: { value: string; label: string }[], value: string): string | undefined {
  return options.find((o) => o.value === value)?.label;
}

export function describePeriod(filters: ReportsFiltersValue): string {
  if (filters.datePreset === "custom") {
    if (filters.dateFrom || filters.dateTo) return `${filters.dateFrom || "…"} to ${filters.dateTo || "…"}`;
    return "Custom range";
  }
  return labelFor(DATE_PRESET_OPTIONS, filters.datePreset) ?? "All time";
}

export function describeAppliedFilters(params: {
  search: string;
  filters: ReportsFiltersValue;
  clientOptions: { value: string; label: string }[];
  projectOptions: { value: string; label: string }[];
}): string[] {
  const { search, filters, clientOptions, projectOptions } = params;
  const parts: string[] = [`Period: ${describePeriod(filters)}`];

  if (search) parts.push(`Search: "${search}"`);
  if (filters.type) parts.push(`Type: ${labelFor(TYPE_OPTIONS, filters.type) ?? filters.type}`);
  if (filters.clientId) parts.push(`Client: ${labelFor(clientOptions, filters.clientId) ?? filters.clientId}`);
  if (filters.projectId) parts.push(`Project: ${labelFor(projectOptions, filters.projectId) ?? filters.projectId}`);
  if (filters.paymentStatus) parts.push(`Payment status: ${labelFor(PAYMENT_STATUS_OPTIONS, filters.paymentStatus) ?? filters.paymentStatus}`);
  if (filters.invoiceStatus) parts.push(`Invoice status: ${labelFor(INVOICE_STATUS_OPTIONS, filters.invoiceStatus) ?? filters.invoiceStatus}`);
  if (filters.paymentMethod) parts.push(`Payment method: ${labelFor(PAYMENT_METHOD_OPTIONS, filters.paymentMethod) ?? filters.paymentMethod}`);
  if (filters.currency) parts.push(`Currency: ${filters.currency}`);

  return parts;
}
