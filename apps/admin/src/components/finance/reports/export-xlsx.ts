import * as XLSX from "xlsx";
import { REPORT_EXPORT_COLUMNS } from "./export-csv";
import type { ReportRow } from "./types";

export function downloadReportXlsx(filename: string, rows: ReportRow[]) {
  const data = rows.map((row) => Object.fromEntries(REPORT_EXPORT_COLUMNS.map((c) => [c.label, row[c.key] ?? ""])));
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Financial Report");
  XLSX.writeFile(workbook, filename);
}
