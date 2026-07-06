import type { PdfDocumentData } from "./finance-document-pdf";

interface SourceItem {
  name: string;
  description?: string | null;
  quantity: number | string;
  unitPrice: number | string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number | string;
  taxPercent: number | string;
  lineTotal: number | string;
}

interface SourceClient {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export function buildPdfData(params: {
  kind: "QUOTATION" | "INVOICE";
  number: string;
  status: string;
  issueDate: string;
  secondDate: string;
  secondDateLabel: string;
  currency: string;
  client: SourceClient;
  projectTitle?: string | null;
  items: SourceItem[];
  subtotal: number | string;
  discountTotal: number | string;
  taxTotal: number | string;
  grandTotal: number | string;
  amountPaid?: number | string;
  balance?: number | string;
  notes?: string | null;
  terms?: string | null;
  signatureText?: string | null;
}): PdfDocumentData {
  return {
    kind: params.kind,
    number: params.number,
    status: params.status,
    issueDate: params.issueDate,
    secondDate: params.secondDate,
    secondDateLabel: params.secondDateLabel,
    currency: params.currency,
    client: params.client,
    projectTitle: params.projectTitle,
    items: params.items.map((item) => ({
      name: item.name,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountType: item.discountType,
      discountValue: Number(item.discountValue),
      taxPercent: Number(item.taxPercent),
      lineTotal: Number(item.lineTotal),
    })),
    subtotal: Number(params.subtotal),
    discountTotal: Number(params.discountTotal),
    taxTotal: Number(params.taxTotal),
    grandTotal: Number(params.grandTotal),
    amountPaid: params.amountPaid !== undefined ? Number(params.amountPaid) : undefined,
    balance: params.balance !== undefined ? Number(params.balance) : undefined,
    notes: params.notes,
    terms: params.terms,
    signatureText: params.signatureText,
  };
}
