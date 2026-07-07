export type ReportType = "QUOTATION" | "INVOICE" | "PAYMENT";

export interface ReportRow {
  id: string;
  type: ReportType;
  date: string;
  referenceNo: string;
  invoiceNumber: string | null;
  quotationNumber: string | null;
  projectId: string | null;
  projectName: string | null;
  clientId: string;
  clientName: string;
  transactionId: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  invoiceStatus: string | null;
  status: string;
  amount: number;
  tax: number;
  discount: number;
  netAmount: number;
  balanceDue: number | null;
  dueDate: string | null;
  expiryDate: string | null;
  paidDate: string | null;
  createdBy: string | null;
  notes: string | null;
  currency: string;
}

export interface ReportSummary {
  totalRevenue: number;
  totalPaymentsReceived: number;
  pendingPayments: number;
  outstandingBalance: number;
  overdueInvoices: number;
  totalQuotations: number;
  totalInvoices: number;
  numberOfClients: number;
  averageInvoiceValue: number;
}
