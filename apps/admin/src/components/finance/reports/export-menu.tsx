"use client";

import * as React from "react";
import { pdf } from "@react-pdf/renderer";
import { Download, FileSpreadsheet, FileText, FileType } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, toast } from "@agency/ui";
import { request } from "@/lib/api";
import { downloadBlob } from "@/lib/download-blob";
import { getPdfContext } from "../pdf/pdf-context";
import { FinanceReportPdf } from "../pdf/finance-report-pdf";
import { downloadReportCsv } from "./export-csv";
import { downloadReportXlsx } from "./export-xlsx";
import type { ReportRow, ReportSummary } from "./types";
import type { ReportsFiltersValue } from "./reports-filters";
import { buildReportExportQuery } from "./report-query";

export function ExportMenu({
  search,
  filters,
  sortBy,
  sortOrder,
  periodLabel,
  appliedFilterLabels,
  summary,
  currency,
}: {
  search: string;
  filters: ReportsFiltersValue;
  sortBy: string;
  sortOrder: "asc" | "desc";
  periodLabel: string;
  appliedFilterLabels: string[];
  summary: ReportSummary | null;
  currency: string;
}) {
  const [exporting, setExporting] = React.useState<"csv" | "xlsx" | "pdf" | null>(null);

  async function fetchExportData() {
    const qs = buildReportExportQuery({ search, filters, sortBy, sortOrder });
    const { items, truncated } = await request<{ items: ReportRow[]; total: number; truncated: boolean }>(
      `/finance/reports/export?${qs}`,
    );
    if (truncated) toast.warning(`Export capped at ${items.length.toLocaleString()} rows — narrow your filters to see every record.`);
    return { items, truncated };
  }

  async function handleExport(format: "csv" | "xlsx" | "pdf") {
    setExporting(format);
    try {
      const { items, truncated } = await fetchExportData();
      const stamp = new Date().toISOString().slice(0, 10);

      if (format === "csv") {
        downloadReportCsv(`financial-report-${stamp}.csv`, items);
      } else if (format === "xlsx") {
        downloadReportXlsx(`financial-report-${stamp}.xlsx`, items);
      } else {
        const branding = await getPdfContext();
        const blob = await pdf(
          <FinanceReportPdf
            data={{
              periodLabel,
              generatedAt: new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
              appliedFilters: appliedFilterLabels,
              summary: summary ?? {
                totalRevenue: 0,
                totalPaymentsReceived: 0,
                pendingPayments: 0,
                outstandingBalance: 0,
                overdueInvoices: 0,
                totalQuotations: 0,
                totalInvoices: 0,
                numberOfClients: 0,
                averageInvoiceValue: 0,
              },
              items,
              truncated,
              currency,
            }}
            branding={branding}
          />,
        ).toBlob();
        downloadBlob(blob, `financial-report-${stamp}.pdf`);
      }
      toast.success("Export ready");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="secondary" disabled={exporting !== null}>
          <Download className="size-4" /> {exporting ? "Exporting…" : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => handleExport("pdf")}>
          <FileType className="size-4" /> Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleExport("xlsx")}>
          <FileSpreadsheet className="size-4" /> Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleExport("csv")}>
          <FileText className="size-4" /> Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
