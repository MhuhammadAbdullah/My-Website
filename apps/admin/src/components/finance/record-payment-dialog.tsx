"use client";

import * as React from "react";
import {
  Button,
  Combobox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from "@agency/ui";
import { request } from "@/lib/api";
import { LogoField, type LogoValue } from "@/components/logo-field";

const paymentMethods = ["CASH", "BANK_TRANSFER", "STRIPE", "PAYPAL", "WISE", "JAZZCASH", "EASYPAISA", "CUSTOM"];

interface InvoiceOption {
  id: string;
  invoiceNumber: string;
  currency: string;
  balance: string;
  client: { name: string };
}

export function RecordPaymentDialog({
  invoiceId,
  invoiceOptions,
  onClose,
  onSuccess,
}: {
  invoiceId?: string;
  invoiceOptions?: InvoiceOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState(invoiceId ?? "");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState("");
  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = React.useState("BANK_TRANSFER");
  const [transactionId, setTransactionId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [attachment, setAttachment] = React.useState<LogoValue>({ mediaId: null, url: null });
  const [saving, setSaving] = React.useState(false);

  const selectedInvoice = invoiceOptions?.find((inv) => inv.id === selectedInvoiceId);

  React.useEffect(() => {
    if (selectedInvoice) setCurrency(selectedInvoice.currency);
  }, [selectedInvoice]);

  async function handleSave() {
    if (!selectedInvoiceId) {
      toast.error("Select an invoice");
      return;
    }
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      await request("/finance/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          amount: amountNum,
          currency: currency || selectedInvoice?.currency || "USD",
          paymentDate,
          method,
          transactionId: transactionId || null,
          notes: notes || null,
          attachmentId: attachment.mediaId,
        }),
      });
      toast.success("Payment recorded");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-lg flex-col p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-neutral-200 px-5 py-4">
          <DialogTitle>Record payment</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {invoiceOptions && (
            <div>
              <Label>Invoice</Label>
              <Combobox
                value={selectedInvoiceId}
                onValueChange={setSelectedInvoiceId}
                placeholder="Select invoice"
                searchPlaceholder="Search invoices…"
                options={invoiceOptions.map((inv) => ({
                  value: inv.id,
                  label: `${inv.invoiceNumber} — ${inv.client.name}`,
                  secondary: `Balance: ${inv.balance} ${inv.currency}`,
                }))}
              />
            </div>
          )}
          {selectedInvoice && (
            <p className="text-body-sm text-neutral-500">
              Remaining balance: <span className="font-medium text-heading">{selectedInvoice.balance} {selectedInvoice.currency}</span>
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Amount</Label>
              <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Payment date</Label>
              <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.charAt(0) + m.slice(1).toLowerCase().replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transaction ID (optional)</Label>
              <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <LogoField label="Receipt (optional)" value={attachment} folder="agency-website/payments" onChange={setAttachment} />
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-neutral-200 px-5 py-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Record payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
