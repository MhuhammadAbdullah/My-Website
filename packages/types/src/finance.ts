import { z } from "zod";
import { currencySchema, DEFAULT_CURRENCY } from "./settings";

export const quotationStatusSchema = z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]);
export type QuotationStatus = z.infer<typeof quotationStatusSchema>;

export const invoiceStatusSchema = z.enum(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const pricingTypeSchema = z.enum([
  "FIXED",
  "ONE_TIME",
  "HOURLY",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "RETAINER",
  "CUSTOM",
]);
export type PricingType = z.infer<typeof pricingTypeSchema>;

// Client-facing display labels -- used on quotation/invoice PDFs and the
// admin line-item editor so both stay in sync with the enum.
export const PRICING_TYPE_LABELS: Record<PricingType, string> = {
  FIXED: "Fixed Price",
  ONE_TIME: "One-time",
  HOURLY: "Hourly",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
  RETAINER: "Retainer",
  CUSTOM: "Custom",
};

export const discountTypeSchema = z.enum(["PERCENT", "FIXED"]);
export type DiscountType = z.infer<typeof discountTypeSchema>;

export const paymentMethodSchema = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "STRIPE",
  "PAYPAL",
  "WISE",
  "JAZZCASH",
  "EASYPAISA",
  "CUSTOM",
]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const clientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required").max(150),
  email: z.string().email("Enter a valid email").nullable().optional().or(z.literal("")),
  phone: z.string().max(40).nullable().optional(),
  company: z.string().max(150).nullable().optional(),
  address: z.string().nullable().optional(),
  currency: currencySchema.default(DEFAULT_CURRENCY),
  notes: z.string().nullable().optional(),
  isArchived: z.boolean().default(false),
});
export type ClientInput = z.infer<typeof clientSchema>;

// Shared by both Quotation and Invoice line items -- same fields either way.
export const lineItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().nullable().optional(),
  pricingType: pricingTypeSchema.default("FIXED"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative"),
  discountType: discountTypeSchema.default("PERCENT"),
  discountValue: z.coerce.number().min(0).default(0),
  taxPercent: z.coerce.number().min(0).default(0),
  order: z.number().int().default(0),
});
export type LineItemInput = z.infer<typeof lineItemSchema>;

// Base object (no cross-field refine) so routes can still `.partial()` a
// sub-slice if ever needed; the refine is applied separately below for the
// full create/update payload, since ZodEffects (the result of `.refine()`)
// doesn't support `.partial()`.
export const quotationBaseSchema = z.object({
  id: z.string().optional(),
  status: quotationStatusSchema.default("DRAFT"),
  issueDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().nullable().optional(),
  currency: currencySchema.default(DEFAULT_CURRENCY),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  signatureText: z.string().nullable().optional(),
  isArchived: z.boolean().default(false),
  items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});
export const quotationSchema = quotationBaseSchema.refine((data) => data.expiryDate > data.issueDate, {
  message: "Expiry date must be after issue date",
  path: ["expiryDate"],
});
export type QuotationInput = z.infer<typeof quotationSchema>;

export const invoiceBaseSchema = z.object({
  id: z.string().optional(),
  status: invoiceStatusSchema.default("DRAFT"),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().nullable().optional(),
  quotationId: z.string().nullable().optional(),
  currency: currencySchema.default(DEFAULT_CURRENCY),
  notes: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  signatureText: z.string().nullable().optional(),
  items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});
export const invoiceSchema = invoiceBaseSchema.refine((data) => data.dueDate > data.issueDate, {
  message: "Due date must be after issue date",
  path: ["dueDate"],
});
export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const paymentSchema = z.object({
  id: z.string().optional(),
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  currency: currencySchema.default(DEFAULT_CURRENCY),
  paymentDate: z.coerce.date(),
  method: paymentMethodSchema,
  transactionId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  attachmentId: z.string().nullable().optional(),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const financeSettingsSchema = z.object({
  defaultCurrency: currencySchema.default(DEFAULT_CURRENCY),
  supportedCurrencies: z.array(currencySchema).default([DEFAULT_CURRENCY]),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  invoicePrefix: z.string().min(1).default("INV"),
  quotePrefix: z.string().min(1).default("QUO"),
  invoiceNumberFormat: z.string().min(1).default("{PREFIX}-{YEAR}-{SEQ}"),
  quoteNumberFormat: z.string().min(1).default("{PREFIX}-{YEAR}-{SEQ}"),
  bankingDetails: z.record(z.string(), z.unknown()).nullable().optional(),
  paymentInstructions: z.string().nullable().optional(),
  footerNotes: z.string().nullable().optional(),
  termsAndConditions: z.string().nullable().optional(),
});
export type FinanceSettingsInput = z.infer<typeof financeSettingsSchema>;
