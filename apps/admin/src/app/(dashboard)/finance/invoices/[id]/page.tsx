"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet, Trash2, Download } from "lucide-react";
import {
  Badge,
  Button,
  Combobox,
  Heading,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  toast,
} from "@agency/ui";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from "@agency/types";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { LineItemsEditor, EMPTY_LINE_ITEM, type LineItemRow } from "@/components/finance/line-items-editor";
import { RecordPaymentDialog } from "@/components/finance/record-payment-dialog";
import { buildPdfData } from "@/components/finance/pdf/map-to-pdf-data";
import { downloadFinancePdf } from "@/components/finance/pdf/download-pdf";

interface Client {
  id: string;
  name: string;
}
interface Project {
  id: string;
  title: string;
}

interface PaymentRecord {
  id: string;
  amount: string;
  currency: string;
  paymentDate: string;
  method: string;
  transactionId: string | null;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  status: "DRAFT" | "SENT" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED";
  issueDate: string;
  dueDate: string;
  clientId: string;
  projectId: string | null;
  quotation: { id: string; quoteNumber: string } | null;
  currency: string;
  notes: string | null;
  terms: string | null;
  signatureText: string | null;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  amountPaid: string;
  balance: string;
  items: (LineItemRow & { id: string; lineTotal: string })[];
  payments: PaymentRecord[];
  client: { name: string; company: string | null; email: string | null; phone: string | null; address: string | null };
  project: { title: string } | null;
}

interface FormState {
  status: InvoiceDetail["status"];
  issueDate: string;
  dueDate: string;
  clientId: string;
  projectId: string;
  currency: string;
  notes: string;
  terms: string;
  signatureText: string;
  items: LineItemRow[];
}

function toDateInput(value: string) {
  return value ? value.slice(0, 10) : "";
}

function formatMoney(value: string, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));
  } catch {
    return `${currency} ${value}`;
  }
}

const statusOptions = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === "new";

  const { data: clients } = useAsyncData<Client[]>(
    () => request<{ items: Client[] }>("/finance/clients").then((r) => r.items),
    [],
  );
  const { data: projects } = useAsyncData<Project[]>(
    () => request<{ items: Project[] }>("/projects/admin?limit=100").then((r) => r.items),
    [],
  );
  const {
    data: invoice,
    loading,
    reload,
  } = useAsyncData<InvoiceDetail | null>(
    () => (isNew ? Promise.resolve(null) : request<{ item: InvoiceDetail }>(`/finance/invoices/${params.id}`).then((r) => r.item)),
    [params.id],
  );

  const [form, setForm] = React.useState<FormState>({
    status: "DRAFT",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    clientId: "",
    projectId: "",
    currency: DEFAULT_CURRENCY,
    notes: "",
    terms: "",
    signatureText: "",
    items: [{ ...EMPTY_LINE_ITEM }],
  });
  const [saving, setSaving] = React.useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = React.useState(false);

  React.useEffect(() => {
    if (invoice) {
      setForm({
        status: invoice.status,
        issueDate: toDateInput(invoice.issueDate),
        dueDate: toDateInput(invoice.dueDate),
        clientId: invoice.clientId,
        projectId: invoice.projectId ?? "",
        currency: invoice.currency,
        notes: invoice.notes ?? "",
        terms: invoice.terms ?? "",
        signatureText: invoice.signatureText ?? "",
        items: invoice.items.map((it) => ({
          name: it.name,
          description: it.description ?? "",
          pricingType: it.pricingType,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          discountType: it.discountType,
          discountValue: Number(it.discountValue),
          taxPercent: Number(it.taxPercent),
        })),
      });
    }
  }, [invoice]);

  async function handleSave() {
    if (!form.clientId) {
      toast.error("Select a client");
      return;
    }
    if (form.items.length === 0) {
      toast.error("At least one line item is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        status: form.status,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        clientId: form.clientId,
        projectId: form.projectId || null,
        currency: form.currency,
        notes: form.notes || null,
        terms: form.terms || null,
        signatureText: form.signatureText || null,
        items: form.items,
      };
      if (isNew) {
        const created = await request<{ item: InvoiceDetail }>("/finance/invoices", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Invoice created");
        router.replace(`/finance/invoices/${created.item.id}`);
      } else {
        await request(`/finance/invoices/${params.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Invoice updated");
        reload();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!confirm("Delete this payment? The invoice balance will be recalculated.")) return;
    try {
      await request(`/finance/payments/${paymentId}`, { method: "DELETE" });
      toast.success("Payment deleted");
      reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    }
  }

  async function handleDownloadPdf() {
    if (!invoice) return;
    try {
      await downloadFinancePdf(
        buildPdfData({
          kind: "INVOICE",
          number: invoice.invoiceNumber,
          status: invoice.status,
          issueDate: invoice.issueDate,
          secondDate: invoice.dueDate,
          secondDateLabel: "Due date",
          currency: invoice.currency,
          client: invoice.client,
          projectTitle: invoice.project?.title,
          items: invoice.items,
          subtotal: invoice.subtotal,
          discountTotal: invoice.discountTotal,
          taxTotal: invoice.taxTotal,
          grandTotal: invoice.grandTotal,
          amountPaid: invoice.amountPaid,
          balance: invoice.balance,
          notes: invoice.notes,
          terms: invoice.terms,
          signatureText: invoice.signatureText,
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate PDF");
    }
  }

  if (!isNew && loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div>
      <Link href="/finance/invoices" className="flex items-center gap-1.5 text-body-sm text-neutral-500 hover:text-heading">
        <ArrowLeft className="size-4" /> Back to invoices
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heading level={2}>{isNew ? "New invoice" : invoice?.invoiceNumber}</Heading>
          {invoice?.quotation && (
            <Badge variant="neutral">From {invoice.quotation.quoteNumber}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          {!isNew && invoice && (
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Download className="size-4" /> Download PDF
            </Button>
          )}
          {!isNew && Number(invoice?.balance ?? 0) > 0 && (
            <Button variant="outline" onClick={() => setShowPaymentDialog(true)}>
              <Wallet className="size-4" /> Record payment
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {!isNew && invoice && (
        <div className="mt-4 grid max-w-3xl grid-cols-3 gap-3">
          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-body-sm text-neutral-500">Total</p>
            <p className="text-h5 font-semibold text-heading">{formatMoney(invoice.grandTotal, invoice.currency)}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-body-sm text-neutral-500">Paid</p>
            <p className="text-h5 font-semibold text-success-600">{formatMoney(invoice.amountPaid, invoice.currency)}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 p-3">
            <p className="text-body-sm text-neutral-500">Balance</p>
            <p className="text-h5 font-semibold text-heading">{formatMoney(invoice.balance, invoice.currency)}</p>
          </div>
        </div>
      )}

      <div className="mt-6 grid max-w-3xl gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Client</Label>
            <Combobox
              value={form.clientId}
              onValueChange={(v) => setForm({ ...form, clientId: v })}
              placeholder="Select client"
              searchPlaceholder="Search clients…"
              options={(clients ?? []).map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div>
            <Label>Project (optional)</Label>
            <Combobox
              value={form.projectId}
              onValueChange={(v) => setForm({ ...form, projectId: v })}
              placeholder="No project"
              searchPlaceholder="Search projects…"
              options={(projects ?? []).map((p) => ({ value: p.id, label: p.title }))}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as FormState["status"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Issue date</Label>
            <Input type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
          </div>
          <div>
            <Label>Due date</Label>
            <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
        </div>

        <div>
          <Label>Currency</Label>
          <Combobox
            value={form.currency}
            onValueChange={(v) => setForm({ ...form, currency: v })}
            searchPlaceholder="Search currencies…"
            options={CURRENCY_OPTIONS.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}`, secondary: c.symbol }))}
          />
        </div>

        <LineItemsEditor items={form.items} onChange={(items) => setForm({ ...form, items })} currency={form.currency} />

        <div>
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div>
          <Label>Terms &amp; conditions</Label>
          <Textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
        </div>
        <div>
          <Label>Authorized signature (optional)</Label>
          <Input value={form.signatureText} onChange={(e) => setForm({ ...form, signatureText: e.target.value })} placeholder="e.g. a name or title" />
        </div>

        {!isNew && invoice && invoice.payments.length > 0 && (
          <div>
            <Label>Payment history</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                    <TableCell>{formatMoney(p.amount, p.currency)}</TableCell>
                    <TableCell>{p.method.replace("_", " ")}</TableCell>
                    <TableCell>{p.transactionId ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePayment(p.id)} aria-label="Delete payment">
                        <Trash2 className="size-4 text-error-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {showPaymentDialog && invoice && (
        <RecordPaymentDialog
          invoiceId={invoice.id}
          invoiceOptions={[{ id: invoice.id, invoiceNumber: invoice.invoiceNumber, currency: invoice.currency, balance: invoice.balance, client: { name: "" } }]}
          onClose={() => setShowPaymentDialog(false)}
          onSuccess={() => {
            setShowPaymentDialog(false);
            reload();
          }}
        />
      )}
    </div>
  );
}
