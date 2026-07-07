"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import {
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
  Textarea,
  toast,
} from "@agency/ui";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY } from "@agency/types";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";
import { LineItemsEditor, EMPTY_LINE_ITEM, type LineItemRow } from "@/components/finance/line-items-editor";
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

interface QuotationDetail {
  id: string;
  quoteNumber: string;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  issueDate: string;
  expiryDate: string;
  clientId: string;
  projectId: string | null;
  currency: string;
  notes: string | null;
  terms: string | null;
  signatureText: string | null;
  isArchived: boolean;
  items: (LineItemRow & { id: string; lineTotal: string })[];
  client: { name: string; company: string | null; email: string | null; phone: string | null; address: string | null };
  project: { title: string } | null;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
}

interface FormState {
  status: QuotationDetail["status"];
  issueDate: string;
  expiryDate: string;
  clientId: string;
  projectId: string;
  currency: string;
  notes: string;
  terms: string;
  signatureText: string;
  isArchived: boolean;
  items: LineItemRow[];
}

function toDateInput(value: string) {
  return value ? value.slice(0, 10) : "";
}

const statusOptions = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];

export default function QuotationDetailPage() {
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
  const { data: quotation, loading } = useAsyncData<QuotationDetail | null>(
    () => (isNew ? Promise.resolve(null) : request<{ item: QuotationDetail }>(`/finance/quotations/${params.id}`).then((r) => r.item)),
    [params.id],
  );

  const [form, setForm] = React.useState<FormState>({
    status: "DRAFT",
    issueDate: new Date().toISOString().slice(0, 10),
    expiryDate: "",
    clientId: "",
    projectId: "",
    currency: DEFAULT_CURRENCY,
    notes: "",
    terms: "",
    signatureText: "",
    isArchived: false,
    items: [{ ...EMPTY_LINE_ITEM }],
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (quotation) {
      setForm({
        status: quotation.status,
        issueDate: toDateInput(quotation.issueDate),
        expiryDate: toDateInput(quotation.expiryDate),
        clientId: quotation.clientId,
        projectId: quotation.projectId ?? "",
        currency: quotation.currency,
        notes: quotation.notes ?? "",
        terms: quotation.terms ?? "",
        signatureText: quotation.signatureText ?? "",
        isArchived: quotation.isArchived,
        items: quotation.items.map((it) => ({
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
  }, [quotation]);

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
        expiryDate: form.expiryDate,
        clientId: form.clientId,
        projectId: form.projectId || null,
        currency: form.currency,
        notes: form.notes || null,
        terms: form.terms || null,
        signatureText: form.signatureText || null,
        isArchived: form.isArchived,
        items: form.items,
      };
      if (isNew) {
        const created = await request<{ item: QuotationDetail }>("/finance/quotations", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Quotation created");
        router.replace(`/finance/quotations/${created.item.id}`);
      } else {
        await request(`/finance/quotations/${params.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Quotation updated");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadPdf() {
    if (!quotation) return;
    try {
      await downloadFinancePdf(
        buildPdfData({
          kind: "QUOTATION",
          number: quotation.quoteNumber,
          issueDate: quotation.issueDate,
          secondDate: quotation.expiryDate,
          secondDateLabel: "Expiry date",
          currency: quotation.currency,
          client: quotation.client,
          projectTitle: quotation.project?.title,
          items: quotation.items,
          subtotal: quotation.subtotal,
          discountTotal: quotation.discountTotal,
          taxTotal: quotation.taxTotal,
          grandTotal: quotation.grandTotal,
          notes: quotation.notes,
          terms: quotation.terms,
          signatureText: quotation.signatureText,
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate PDF");
    }
  }

  if (!isNew && loading) return <Skeleton className="h-96 w-full" />;

  return (
    <div>
      <Link href="/finance/quotations" className="flex items-center gap-1.5 text-body-sm text-neutral-500 hover:text-heading">
        <ArrowLeft className="size-4" /> Back to quotations
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <Heading level={2}>{isNew ? "New quotation" : quotation?.quoteNumber}</Heading>
        <div className="flex gap-2">
          {!isNew && quotation && (
            <Button variant="outline" onClick={handleDownloadPdf}>
              <Download className="size-4" /> Download PDF
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

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
                    {s.charAt(0) + s.slice(1).toLowerCase()}
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
            <Label>Expiry date</Label>
            <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
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
      </div>
    </div>
  );
}
