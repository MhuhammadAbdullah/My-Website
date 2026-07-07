import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { PdfContext } from "./pdf-context";

export interface PdfLineItem {
  name: string;
  description?: string | null;
  pricingType: string;
  unitPrice: number;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  taxPercent: number;
  lineTotal: number;
}

export interface PdfClient {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface PdfDocumentData {
  kind: "QUOTATION" | "INVOICE";
  number: string;
  issueDate: string;
  secondDate: string;
  secondDateLabel: string;
  currency: string;
  client: PdfClient;
  projectTitle?: string | null;
  items: PdfLineItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  amountPaid?: number;
  balance?: number;
  notes?: string | null;
  terms?: string | null;
  signatureText?: string | null;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#1f2937" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  logo: { width: 120, height: 48, objectFit: "contain" },
  brandName: { fontSize: 16, fontWeight: 700 },
  companyDetails: { marginTop: 4, fontSize: 8.5, color: "#4b5563", lineHeight: 1.4 },
  docTitleBlock: { alignItems: "flex-end" },
  docTitle: { fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 },
  docMetaRow: { marginTop: 6, fontSize: 8.5, color: "#4b5563" },
  metaLabel: { color: "#6b7280" },
  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  partyBlock: { width: "48%" },
  partyLabel: { fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5, color: "#9ca3af", marginBottom: 4 },
  partyName: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  partyLine: { fontSize: 8.5, color: "#4b5563", lineHeight: 1.4 },
  table: { marginTop: 8 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  colName: { width: "30%" },
  colPricingType: { width: "16%", textAlign: "right" },
  colPrice: { width: "14%", textAlign: "right" },
  colDiscount: { width: "14%", textAlign: "right" },
  colTax: { width: "10%", textAlign: "right" },
  colTotal: { width: "16%", textAlign: "right" },
  thText: { fontSize: 8, fontWeight: 700, textTransform: "uppercase", color: "#6b7280" },
  itemDescription: { fontSize: 8, color: "#9ca3af", marginTop: 2 },
  totalsBlock: { marginTop: 12, marginLeft: "auto", width: "45%" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalsLabel: { color: "#6b7280" },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
  },
  grandTotalText: { fontSize: 11, fontWeight: 700 },
  section: { marginTop: 20 },
  sectionLabel: { fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5, color: "#9ca3af", marginBottom: 4 },
  sectionBody: { fontSize: 8.5, color: "#374151", lineHeight: 1.5 },
  bankGrid: { flexDirection: "row", flexWrap: "wrap" },
  bankRow: { width: "50%", flexDirection: "row", marginTop: 4 },
  bankLabel: { width: 90, fontSize: 8.5, color: "#6b7280" },
  bankValue: { fontSize: 8.5, color: "#374151", fontWeight: 700 },
  signatureRow: { marginTop: 40, flexDirection: "row", justifyContent: "flex-end" },
  signatureBlock: { width: 200, textAlign: "center" },
  signatureLine: { borderTopWidth: 1, borderTopColor: "#9ca3af", marginBottom: 4, paddingTop: 4 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: "#9ca3af",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Bank details are stored as free-form JSON, so any key is rendered here if
// present -- new fields added to Finance Settings later (e.g. "branch")
// appear on the PDF automatically without a template change.
const BANK_FIELD_LABELS: Record<string, string> = {
  bankName: "Bank Name",
  accountName: "Account Name",
  accountNumber: "Account Number",
  iban: "IBAN",
  swiftCode: "SWIFT / BIC",
  branch: "Branch",
};

function bankingDetailsRows(details: Record<string, unknown>): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const orderedKeys = [...Object.keys(BANK_FIELD_LABELS), ...Object.keys(details).filter((k) => !(k in BANK_FIELD_LABELS))];
  for (const key of orderedKeys) {
    const value = details[key];
    if (typeof value !== "string" || !value.trim()) continue;
    rows.push({ label: BANK_FIELD_LABELS[key] ?? key, value });
  }
  return rows;
}

export function FinanceDocumentPdf({ data, branding }: { data: PdfDocumentData; branding: PdfContext }) {
  const currency = data.currency;

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
            <Text style={styles.docTitle}>{data.kind === "QUOTATION" ? "Quotation" : "Invoice"}</Text>
            <View style={styles.docMetaRow}>
              <Text>
                <Text style={styles.metaLabel}>Number: </Text>
                {data.number}
              </Text>
              <Text>
                <Text style={styles.metaLabel}>Issue date: </Text>
                {formatDate(data.issueDate)}
              </Text>
              <Text>
                <Text style={styles.metaLabel}>{data.secondDateLabel}: </Text>
                {formatDate(data.secondDate)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Billed to</Text>
            <Text style={styles.partyName}>{data.client.name}</Text>
            {data.client.company && <Text style={styles.partyLine}>{data.client.company}</Text>}
            {data.client.email && <Text style={styles.partyLine}>{data.client.email}</Text>}
            {data.client.phone && <Text style={styles.partyLine}>{data.client.phone}</Text>}
            {data.client.address && <Text style={styles.partyLine}>{data.client.address}</Text>}
          </View>
          {data.projectTitle && (
            <View style={styles.partyBlock}>
              <Text style={styles.partyLabel}>Project</Text>
              <Text style={styles.partyName}>{data.projectTitle}</Text>
            </View>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colName, styles.thText]}>Service</Text>
            <Text style={[styles.colPricingType, styles.thText]}>Billing</Text>
            <Text style={[styles.colPrice, styles.thText]}>Amount</Text>
            <Text style={[styles.colDiscount, styles.thText]}>Discount</Text>
            <Text style={[styles.colTax, styles.thText]}>Tax</Text>
            <Text style={[styles.colTotal, styles.thText]}>Total</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={styles.tableRow} wrap={false}>
              <View style={styles.colName}>
                <Text>{item.name}</Text>
                {item.description && <Text style={styles.itemDescription}>{item.description}</Text>}
              </View>
              <Text style={styles.colPricingType}>{item.pricingType}</Text>
              <Text style={styles.colPrice}>{formatMoney(item.unitPrice, currency)}</Text>
              <Text style={styles.colDiscount}>
                {item.discountValue > 0 ? (item.discountType === "PERCENT" ? `${item.discountValue}%` : formatMoney(item.discountValue, currency)) : "—"}
              </Text>
              <Text style={styles.colTax}>{item.taxPercent > 0 ? `${item.taxPercent}%` : "—"}</Text>
              <Text style={styles.colTotal}>{formatMoney(item.lineTotal, currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text>{formatMoney(data.subtotal, currency)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Discount</Text>
            <Text>−{formatMoney(data.discountTotal, currency)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax</Text>
            <Text>+{formatMoney(data.taxTotal, currency)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalText}>Grand total</Text>
            <Text style={styles.grandTotalText}>{formatMoney(data.grandTotal, currency)}</Text>
          </View>
          {data.kind === "INVOICE" && (
            <>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Amount paid</Text>
                <Text>{formatMoney(data.amountPaid ?? 0, currency)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={[styles.totalsLabel, { fontWeight: 700, color: "#1f2937" }]}>Balance due</Text>
                <Text style={{ fontWeight: 700 }}>{formatMoney(data.balance ?? 0, currency)}</Text>
              </View>
            </>
          )}
        </View>

        {branding.bankingDetails &&
          (() => {
            const rows = bankingDetailsRows(branding.bankingDetails);
            return rows.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Bank details</Text>
                <View style={styles.bankGrid}>
                  {rows.map((row) => (
                    <View key={row.label} style={styles.bankRow}>
                      <Text style={styles.bankLabel}>{row.label}</Text>
                      <Text style={styles.bankValue}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null;
          })()}

        {branding.paymentInstructions && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Payment instructions</Text>
            <Text style={styles.sectionBody}>{branding.paymentInstructions}</Text>
          </View>
        )}

        {(data.terms || branding.termsAndConditions) && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Terms &amp; conditions</Text>
            <Text style={styles.sectionBody}>{data.terms || branding.termsAndConditions}</Text>
          </View>
        )}

        {data.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.sectionBody}>{data.notes}</Text>
          </View>
        )}

        {branding.footerNotes && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Footer notes</Text>
            <Text style={styles.sectionBody}>{branding.footerNotes}</Text>
          </View>
        )}

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLine}>{data.signatureText || "Authorized signature"}</Text>
          </View>
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `${branding.companyName}    ·    Page ${pageNumber} of ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
