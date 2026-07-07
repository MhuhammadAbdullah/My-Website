"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge, Card, CardContent, Heading, Skeleton } from "@agency/ui";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";

interface ClientInfo {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}
interface ProjectInfo {
  id: string;
  title: string;
}
interface QuotationRef {
  id: string;
  quoteNumber: string;
}
interface InvoiceRef {
  id: string;
  invoiceNumber: string;
}
interface PaymentEntry {
  id: string;
  amount: string;
  currency: string;
  paymentDate: string;
  method: string;
  transactionId: string | null;
  notes: string | null;
}

interface QuotationDetail {
  id: string;
  quoteNumber: string;
  status: string;
  issueDate: string;
  expiryDate: string;
  currency: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  notes: string | null;
  client: ClientInfo;
  project: ProjectInfo | null;
  invoices: InvoiceRef[];
}
interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  amountPaid: string;
  balance: string;
  notes: string | null;
  client: ClientInfo;
  project: ProjectInfo | null;
  quotation: QuotationRef | null;
  payments: PaymentEntry[];
}
interface PaymentDetail {
  id: string;
  amount: string;
  currency: string;
  paymentDate: string;
  method: string;
  transactionId: string | null;
  notes: string | null;
  invoice: Omit<InvoiceDetail, "payments">;
}

type ReportDetailResponse =
  | { type: "QUOTATION"; item: QuotationDetail }
  | { type: "INVOICE"; item: InvoiceDetail }
  | { type: "PAYMENT"; item: PaymentDetail };

function formatMoney(value: string | number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));
  } catch {
    return `${currency} ${value}`;
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-body-sm font-medium text-neutral-500">{label}</p>
        <div className="mt-3 space-y-2 text-body-sm">{children}</div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-neutral-400">{label}</span>
      <span className="font-medium text-heading">{value}</span>
    </div>
  );
}

export default function ReportDetailPage() {
  const params = useParams<{ type: string; id: string }>();
  const { data, loading, error } = useAsyncData<ReportDetailResponse>(
    () => request<ReportDetailResponse>(`/finance/reports/${params.type}/${params.id}`),
    [params.type, params.id],
  );

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <p className="text-body-sm text-error-500">{error}</p>;
  if (!data) return null;

  const { type, item } = data;
  const client = type === "PAYMENT" ? item.invoice.client : item.client;
  const project = type === "PAYMENT" ? item.invoice.project : item.project;
  const currency = type === "PAYMENT" ? item.invoice.currency : item.currency;

  const referenceNo =
    type === "QUOTATION" ? item.quoteNumber : type === "INVOICE" ? item.invoiceNumber : item.transactionId || `PAY-${item.id}`;
  const status = type === "QUOTATION" ? item.status : type === "INVOICE" ? item.status : item.invoice.status;

  return (
    <div>
      <Link href="/finance/reports" className="flex items-center gap-1.5 text-body-sm text-neutral-500 hover:text-heading">
        <ArrowLeft className="size-4" /> Back to reports
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Heading level={2}>{referenceNo}</Heading>
        <Badge variant="accent">{type}</Badge>
        <Badge variant="neutral">{status.replace(/_/g, " ")}</Badge>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <InfoCard label="Client information">
          <Row label="Name" value={client.name} />
          <Row label="Email" value={client.email ?? "—"} />
          <Row label="Phone" value={client.phone ?? "—"} />
          <Row label="Company" value={client.company ?? "—"} />
        </InfoCard>

        <InfoCard label="Project information">
          <Row label="Project" value={project?.title ?? "—"} />
          {type === "QUOTATION" && (
            <Row
              label="Related invoice(s)"
              value={
                item.invoices.length
                  ? item.invoices.map((inv) => (
                      <Link key={inv.id} href={`/finance/reports/invoice/${inv.id}`} className="text-accent-600 hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    ))
                  : "—"
              }
            />
          )}
          {type === "INVOICE" && (
            <Row
              label="Related quotation"
              value={
                item.quotation ? (
                  <Link href={`/finance/reports/quotation/${item.quotation.id}`} className="text-accent-600 hover:underline">
                    {item.quotation.quoteNumber}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          )}
          {type === "PAYMENT" && (
            <Row
              label="Related invoice"
              value={
                <Link href={`/finance/reports/invoice/${item.invoice.id}`} className="text-accent-600 hover:underline">
                  {item.invoice.invoiceNumber}
                </Link>
              }
            />
          )}
        </InfoCard>

        <InfoCard label="Financial information">
          {type === "QUOTATION" && (
            <>
              <Row label="Amount" value={formatMoney(item.subtotal, currency)} />
              <Row label="Discount" value={formatMoney(item.discountTotal, currency)} />
              <Row label="Tax" value={formatMoney(item.taxTotal, currency)} />
              <Row label="Total" value={formatMoney(item.grandTotal, currency)} />
              <Row label="Expiry date" value={formatDate(item.expiryDate)} />
            </>
          )}
          {type === "INVOICE" && (
            <>
              <Row label="Invoice amount" value={formatMoney(item.subtotal, currency)} />
              <Row label="Discount" value={formatMoney(item.discountTotal, currency)} />
              <Row label="Tax" value={formatMoney(item.taxTotal, currency)} />
              <Row label="Paid amount" value={formatMoney(item.amountPaid, currency)} />
              <Row label="Remaining balance" value={formatMoney(item.balance, currency)} />
              <Row label="Due date" value={formatDate(item.dueDate)} />
            </>
          )}
          {type === "PAYMENT" && (
            <>
              <Row label="Invoice amount" value={formatMoney(item.invoice.subtotal, currency)} />
              <Row label="Discount" value={formatMoney(item.invoice.discountTotal, currency)} />
              <Row label="Tax" value={formatMoney(item.invoice.taxTotal, currency)} />
              <Row label="Paid amount" value={formatMoney(item.amount, currency)} />
              <Row label="Remaining balance" value={formatMoney(item.invoice.balance, currency)} />
              <Row label="Due date" value={formatDate(item.invoice.dueDate)} />
              <Row label="Paid date" value={formatDate(item.paymentDate)} />
            </>
          )}
        </InfoCard>

        {type === "PAYMENT" && (
          <InfoCard label="Payment information">
            <Row label="Transaction ID" value={item.transactionId ?? "—"} />
            <Row label="Payment method" value={item.method.replace(/_/g, " ")} />
            <Row label="Notes" value={item.notes ?? "—"} />
          </InfoCard>
        )}

        {type === "INVOICE" && item.payments.length > 0 && (
          <InfoCard label="Payment history">
            <div className="space-y-3">
              {item.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-4 border-b border-neutral-100 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-heading">{formatMoney(p.amount, p.currency)}</p>
                    <p className="text-neutral-400">
                      {formatDate(p.paymentDate)} · {p.method.replace(/_/g, " ")}
                      {p.transactionId ? ` · ${p.transactionId}` : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </InfoCard>
        )}
      </div>

      {item.notes && (
        <div className="mt-4">
          <InfoCard label="Notes">
            <p className="text-body text-heading">{item.notes}</p>
          </InfoCard>
        </div>
      )}
    </div>
  );
}
