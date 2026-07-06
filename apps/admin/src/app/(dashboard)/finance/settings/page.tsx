"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge, Button, Combobox, Heading, Input, Label, Skeleton, Textarea, toast } from "@agency/ui";
import { CURRENCY_OPTIONS, DEFAULT_CURRENCY, type FinanceSettingsInput } from "@agency/types";
import { request } from "@/lib/api";
import { useAsyncData } from "@/lib/use-resource";

interface BankingDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
}

const EMPTY_BANKING: BankingDetails = { bankName: "", accountName: "", accountNumber: "", iban: "", swiftCode: "" };

export default function FinanceSettingsPage() {
  const { data: settings, loading } = useAsyncData<FinanceSettingsInput>(
    () => request<{ item: FinanceSettingsInput }>("/finance/settings").then((r) => r.item),
    [],
  );

  const [defaultCurrency, setDefaultCurrency] = React.useState(DEFAULT_CURRENCY);
  const [supportedCurrencies, setSupportedCurrencies] = React.useState<string[]>([DEFAULT_CURRENCY]);
  const [taxRate, setTaxRate] = React.useState("0");
  const [invoicePrefix, setInvoicePrefix] = React.useState("INV");
  const [quotePrefix, setQuotePrefix] = React.useState("QUO");
  const [invoiceNumberFormat, setInvoiceNumberFormat] = React.useState("{PREFIX}-{YEAR}-{SEQ}");
  const [quoteNumberFormat, setQuoteNumberFormat] = React.useState("{PREFIX}-{YEAR}-{SEQ}");
  const [banking, setBanking] = React.useState<BankingDetails>(EMPTY_BANKING);
  const [paymentInstructions, setPaymentInstructions] = React.useState("");
  const [footerNotes, setFooterNotes] = React.useState("");
  const [termsAndConditions, setTermsAndConditions] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!settings) return;
    setDefaultCurrency(settings.defaultCurrency);
    setSupportedCurrencies(settings.supportedCurrencies.length ? settings.supportedCurrencies : [settings.defaultCurrency]);
    setTaxRate(String(settings.taxRate));
    setInvoicePrefix(settings.invoicePrefix);
    setQuotePrefix(settings.quotePrefix);
    setInvoiceNumberFormat(settings.invoiceNumberFormat);
    setQuoteNumberFormat(settings.quoteNumberFormat);
    setBanking({ ...EMPTY_BANKING, ...(settings.bankingDetails as Partial<BankingDetails> | null | undefined) });
    setPaymentInstructions(settings.paymentInstructions ?? "");
    setFooterNotes(settings.footerNotes ?? "");
    setTermsAndConditions(settings.termsAndConditions ?? "");
  }, [settings]);

  function addCurrency(code: string) {
    if (!code || supportedCurrencies.includes(code)) return;
    setSupportedCurrencies([...supportedCurrencies, code]);
  }

  function removeCurrency(code: string) {
    if (code === defaultCurrency) return;
    setSupportedCurrencies(supportedCurrencies.filter((c) => c !== code));
  }

  const isBankingEmpty = Object.values(banking).every((v) => !v);

  async function handleSave() {
    setSaving(true);
    try {
      await request("/finance/settings", {
        method: "PUT",
        body: JSON.stringify({
          defaultCurrency,
          supportedCurrencies: supportedCurrencies.includes(defaultCurrency) ? supportedCurrencies : [defaultCurrency, ...supportedCurrencies],
          taxRate: Number(taxRate) || 0,
          invoicePrefix,
          quotePrefix,
          invoiceNumberFormat,
          quoteNumberFormat,
          bankingDetails: isBankingEmpty ? null : banking,
          paymentInstructions: paymentInstructions || null,
          footerNotes: footerNotes || null,
          termsAndConditions: termsAndConditions || null,
        }),
      });
      toast.success("Finance settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full max-w-xl" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <Heading level={2}>Finance Settings</Heading>
      <p className="mt-1 text-body-sm text-neutral-500">Defaults used across quotations, invoices, and payments.</p>

      <div className="mt-8 grid max-w-2xl gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Default currency</Label>
            <Combobox
              value={defaultCurrency}
              onValueChange={(v) => {
                setDefaultCurrency(v);
                addCurrency(v);
              }}
              searchPlaceholder="Search currencies…"
              options={CURRENCY_OPTIONS.map((c) => ({ value: c.code, label: `${c.code} — ${c.label}`, secondary: c.symbol }))}
            />
          </div>
          <div>
            <Label>Default tax rate (%)</Label>
            <Input type="number" min={0} max={100} step="any" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Supported currencies</Label>
          <div className="flex flex-wrap gap-2">
            {supportedCurrencies.map((code) => (
              <Badge key={code} variant="neutral" className="flex items-center gap-1">
                {code}
                {code !== defaultCurrency && (
                  <button type="button" onClick={() => removeCurrency(code)} aria-label={`Remove ${code}`}>
                    <X className="size-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
          <div className="mt-2">
            <Combobox
              value=""
              onValueChange={addCurrency}
              placeholder="Add a currency…"
              searchPlaceholder="Search currencies…"
              options={CURRENCY_OPTIONS.filter((c) => !supportedCurrencies.includes(c.code)).map((c) => ({
                value: c.code,
                label: `${c.code} — ${c.label}`,
                secondary: c.symbol,
              }))}
            />
          </div>
        </div>

        <div className="mt-4 border-t border-neutral-200 pt-6">
          <Heading level={3}>Document numbering</Heading>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <Label>Invoice prefix</Label>
              <Input value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} />
            </div>
            <div>
              <Label>Quote prefix</Label>
              <Input value={quotePrefix} onChange={(e) => setQuotePrefix(e.target.value)} />
            </div>
            <div>
              <Label>Invoice number format</Label>
              <Input value={invoiceNumberFormat} onChange={(e) => setInvoiceNumberFormat(e.target.value)} />
            </div>
            <div>
              <Label>Quote number format</Label>
              <Input value={quoteNumberFormat} onChange={(e) => setQuoteNumberFormat(e.target.value)} />
            </div>
          </div>
          <p className="mt-2 text-body-sm text-neutral-500">
            Use <code>{"{PREFIX}"}</code>, <code>{"{YEAR}"}</code>, and <code>{"{SEQ}"}</code> as placeholders.
          </p>
        </div>

        <div className="mt-4 border-t border-neutral-200 pt-6">
          <Heading level={3}>Banking details</Heading>
          <p className="mt-1 text-body-sm text-neutral-500">Shown on invoices as payment instructions (follow-up: PDF rendering).</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <Label>Bank name</Label>
              <Input value={banking.bankName} onChange={(e) => setBanking({ ...banking, bankName: e.target.value })} />
            </div>
            <div>
              <Label>Account name</Label>
              <Input value={banking.accountName} onChange={(e) => setBanking({ ...banking, accountName: e.target.value })} />
            </div>
            <div>
              <Label>Account number</Label>
              <Input value={banking.accountNumber} onChange={(e) => setBanking({ ...banking, accountNumber: e.target.value })} />
            </div>
            <div>
              <Label>IBAN</Label>
              <Input value={banking.iban} onChange={(e) => setBanking({ ...banking, iban: e.target.value })} />
            </div>
            <div>
              <Label>SWIFT / BIC code</Label>
              <Input value={banking.swiftCode} onChange={(e) => setBanking({ ...banking, swiftCode: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-neutral-200 pt-6">
          <Heading level={3}>Document text</Heading>
          <div className="mt-5 grid gap-5">
            <div>
              <Label>Default payment instructions</Label>
              <Textarea value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} />
            </div>
            <div>
              <Label>Default terms &amp; conditions</Label>
              <Textarea value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} />
            </div>
            <div>
              <Label>Footer notes</Label>
              <Textarea value={footerNotes} onChange={(e) => setFooterNotes(e.target.value)} />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="mt-2 w-fit">
          {saving ? "Saving…" : "Save finance settings"}
        </Button>
      </div>
    </div>
  );
}
