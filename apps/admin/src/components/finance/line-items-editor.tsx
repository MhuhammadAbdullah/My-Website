"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@agency/ui";
import { computeDocumentTotals, type FinanceLineItemInput } from "@agency/utils";
import { PRICING_TYPE_LABELS, pricingTypeSchema, type PricingType } from "@agency/types";

export interface LineItemRow extends FinanceLineItemInput {
  description: string;
  pricingType: PricingType;
}

export const EMPTY_LINE_ITEM: LineItemRow = {
  name: "",
  description: "",
  pricingType: "FIXED",
  quantity: 1,
  unitPrice: 0,
  discountType: "PERCENT",
  discountValue: 0,
  taxPercent: 0,
};

function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function LineItemsEditor({
  items,
  onChange,
  currency,
}: {
  items: LineItemRow[];
  onChange: (items: LineItemRow[]) => void;
  currency: string;
}) {
  const totals = computeDocumentTotals(items);

  function updateItem(index: number, patch: Partial<LineItemRow>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    onChange([...items, { ...EMPTY_LINE_ITEM }]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="mb-0">Line items</Label>
        <Button type="button" variant="ghost" size="sm" onClick={addItem}>
          <Plus className="size-4" /> Add item
        </Button>
      </div>

      <div className="mt-2 space-y-4">
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-200 p-4 text-center text-body-sm text-neutral-400">
            No line items yet — add at least one.
          </p>
        )}

        {items.map((item, index) => {
          const rowTotals = computeDocumentTotals([item]);
          return (
            <div key={index} className="space-y-3 rounded-xl border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Name</Label>
                    <Input value={item.name} onChange={(e) => updateItem(index, { name: e.target.value })} placeholder="Service or product" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} />
                  </div>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} aria-label="Remove item">
                  <Trash2 className="size-4 text-error-500" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <div>
                  <Label>Pricing type</Label>
                  <Select value={item.pricingType} onValueChange={(v) => updateItem(index, { pricingType: v as PricingType })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {pricingTypeSchema.options.map((value) => (
                        <SelectItem key={value} value={value}>
                          {PRICING_TYPE_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Unit price</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Discount type</Label>
                  <Select value={item.discountType} onValueChange={(v) => updateItem(index, { discountType: v as LineItemRow["discountType"] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENT">Percent</SelectItem>
                      <SelectItem value="FIXED">Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discount value</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={item.discountValue}
                    onChange={(e) => updateItem(index, { discountValue: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Tax %</Label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    value={item.taxPercent}
                    onChange={(e) => updateItem(index, { taxPercent: Number(e.target.value) })}
                  />
                </div>
              </div>

              <p className="text-right text-body-sm text-neutral-500">
                Line total: <span className="font-semibold text-heading">{formatMoney(rowTotals.grandTotal, currency)}</span>
              </p>
            </div>
          );
        })}
      </div>

      {items.length > 0 && (
        <div className="mt-4 ml-auto max-w-xs space-y-1.5 rounded-xl bg-neutral-50 p-4 text-body-sm">
          <div className="flex justify-between text-neutral-500">
            <span>Subtotal</span>
            <span>{formatMoney(totals.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-neutral-500">
            <span>Discount</span>
            <span>−{formatMoney(totals.discountTotal, currency)}</span>
          </div>
          <div className="flex justify-between text-neutral-500">
            <span>Tax</span>
            <span>+{formatMoney(totals.taxTotal, currency)}</span>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-1.5 font-semibold text-heading">
            <span>Grand total</span>
            <span>{formatMoney(totals.grandTotal, currency)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
