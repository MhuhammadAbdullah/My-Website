import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { PdfContext } from "./pdf-context";
import type { ReportRow, ReportSummary } from "../reports/types";

export interface FinanceReportPdfData {
  periodLabel: string;
  generatedAt: string;
  appliedFilters: string[];
  summary: ReportSummary;
  items: ReportRow[];
  truncated: boolean;
  currency: string;
}

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 8.5, fontFamily: "Helvetica", color: "#1f2937" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  logo: { width: 110, height: 44, objectFit: "contain" },
  brandName: { fontSize: 15, fontWeight: 700 },
  companyDetails: { marginTop: 4, fontSize: 8, color: "#4b5563", lineHeight: 1.4 },
  docTitleBlock: { alignItems: "flex-end" },
  docTitle: { fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 },
  docMetaRow: { marginTop: 6, fontSize: 8, color: "#4b5563" },
  metaLabel: { color: "#6b7280" },
  filtersBlock: { marginTop: 12, padding: 10, borderRadius: 4, backgroundColor: "#f9fafb" },
  filtersLabel: { fontSize: 7.5, textTransform: "uppercase", letterSpacing: 0.5, color: "#9ca3af", marginBottom: 3 },
  filtersText: { fontSize: 8, color: "#374151" },
  summaryGrid: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryCard: { width: "31.5%", padding: 8, borderWidth: 0.5, borderColor: "#e5e7eb", borderRadius: 4, marginBottom: 8 },
  summaryLabel: { fontSize: 7, textTransform: "uppercase", color: "#9ca3af", letterSpacing: 0.5 },
  summaryValue: { marginTop: 3, fontSize: 11, fontWeight: 700 },
  table: { marginTop: 14 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  colDate: { width: "11%" },
  colType: { width: "10%" },
  colRef: { width: "15%" },
  colClient: { width: "20%" },
  colStatus: { width: "12%" },
  colAmount: { width: "16%", textAlign: "right" },
  colBalance: { width: "16%", textAlign: "right" },
  thText: { fontSize: 7, fontWeight: 700, textTransform: "uppercase", color: "#6b7280" },
  cellText: { fontSize: 7.5 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 7,
    color: "#9ca3af",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  truncatedNote: { marginTop: 8, fontSize: 7.5, color: "#b45309" },
});

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function FinanceReportPdf({ data, branding }: { data: FinanceReportPdfData; branding: PdfContext }) {
  const { summary, currency } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {branding.displayMode === "LOGO" && branding.logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop
              <Image src={branding.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.brandName}>{branding.companyName}</Text>
            )}
            <View style={styles.companyDetails}>
              {branding.address && <Text>{branding.address}</Text>}
              {branding.email && <Text>{branding.email}</Text>}
              {branding.phone && <Text>{branding.phone}</Text>}
            </View>
          </View>
          <View style={styles.docTitleBlock}>
            <Text style={styles.docTitle}>Financial Report</Text>
            <View style={styles.docMetaRow}>
              <Text>
                <Text style={styles.metaLabel}>Period: </Text>
                {data.periodLabel}
              </Text>
              <Text>
                <Text style={styles.metaLabel}>Generated: </Text>
                {data.generatedAt}
              </Text>
            </View>
          </View>
        </View>

        {data.appliedFilters.length > 0 && (
          <View style={styles.filtersBlock}>
            <Text style={styles.filtersLabel}>Applied filters</Text>
            <Text style={styles.filtersText}>{data.appliedFilters.join("  ·  ")}</Text>
          </View>
        )}

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <Text style={styles.summaryValue}>{formatMoney(summary.totalRevenue, currency)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={styles.summaryValue}>{formatMoney(summary.totalPaymentsReceived, currency)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Outstanding Balance</Text>
            <Text style={styles.summaryValue}>{formatMoney(summary.outstandingBalance, currency)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pending Payments</Text>
            <Text style={styles.summaryValue}>{formatMoney(summary.pendingPayments, currency)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Overdue Invoices</Text>
            <Text style={styles.summaryValue}>{summary.overdueInvoices}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Quotations</Text>
            <Text style={styles.summaryValue}>{summary.totalQuotations}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Invoices</Text>
            <Text style={styles.summaryValue}>{summary.totalInvoices}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Clients</Text>
            <Text style={styles.summaryValue}>{summary.numberOfClients}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Avg. Invoice Value</Text>
            <Text style={styles.summaryValue}>{formatMoney(summary.averageInvoiceValue, currency)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDate, styles.thText]}>Date</Text>
            <Text style={[styles.colType, styles.thText]}>Type</Text>
            <Text style={[styles.colRef, styles.thText]}>Reference</Text>
            <Text style={[styles.colClient, styles.thText]}>Client</Text>
            <Text style={[styles.colStatus, styles.thText]}>Status</Text>
            <Text style={[styles.colAmount, styles.thText]}>Net Amount</Text>
            <Text style={[styles.colBalance, styles.thText]}>Balance Due</Text>
          </View>
          {data.items.map((row, i) => (
            <View key={`${row.type}-${row.id}-${i}`} style={styles.tableRow} wrap={false}>
              <Text style={[styles.colDate, styles.cellText]}>{formatDate(row.date)}</Text>
              <Text style={[styles.colType, styles.cellText]}>{row.type}</Text>
              <Text style={[styles.colRef, styles.cellText]}>{row.referenceNo}</Text>
              <Text style={[styles.colClient, styles.cellText]}>{row.clientName}</Text>
              <Text style={[styles.colStatus, styles.cellText]}>{row.status.replace(/_/g, " ")}</Text>
              <Text style={[styles.colAmount, styles.cellText]}>{formatMoney(row.netAmount, row.currency)}</Text>
              <Text style={[styles.colBalance, styles.cellText]}>
                {row.balanceDue !== null ? formatMoney(row.balanceDue, row.currency) : "—"}
              </Text>
            </View>
          ))}
        </View>

        {data.truncated && (
          <Text style={styles.truncatedNote}>
            This report was capped at {data.items.length.toLocaleString()} rows for performance. Narrow the filters to see every matching
            record.
          </Text>
        )}

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `${branding.footerNotes || branding.companyName}    ·    Page ${pageNumber} of ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
