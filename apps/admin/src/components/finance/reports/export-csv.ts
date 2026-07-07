import { downloadBlob } from "@/lib/download-blob";
import type { ReportRow } from "./types";

const COLUMNS: { key: keyof ReportRow; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "type", label: "Type" },
  { key: "referenceNo", label: "Statement / Reference No." },
  { key: "invoiceNumber", label: "Invoice Number" },
  { key: "quotationNumber", label: "Quotation Number" },
  { key: "projectName", label: "Project" },
  { key: "clientName", label: "Client" },
  { key: "transactionId", label: "Transaction ID" },
  { key: "paymentMethod", label: "Payment Method" },
  { key: "status", label: "Status" },
  { key: "amount", label: "Amount" },
  { key: "tax", label: "Tax" },
  { key: "discount", label: "Discount" },
  { key: "netAmount", label: "Net Amount" },
  { key: "balanceDue", label: "Balance Due" },
  { key: "dueDate", label: "Due Date" },
  { key: "expiryDate", label: "Expiry Date" },
  { key: "paidDate", label: "Paid Date" },
  { key: "createdBy", label: "Created By" },
  { key: "notes", label: "Notes" },
  { key: "currency", label: "Currency" },
];

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function reportRowsToCsv(rows: ReportRow[]): string {
  const header = COLUMNS.map((c) => csvCell(c.label)).join(",");
  const lines = rows.map((row) => COLUMNS.map((c) => csvCell(row[c.key])).join(","));
  return [header, ...lines].join("\r\n");
}

export function downloadReportCsv(filename: string, rows: ReportRow[]) {
  const blob = new Blob([reportRowsToCsv(rows)], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

export { COLUMNS as REPORT_EXPORT_COLUMNS };
