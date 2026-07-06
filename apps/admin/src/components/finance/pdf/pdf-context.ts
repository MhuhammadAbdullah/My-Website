import { request } from "@/lib/api";
import type { SiteSettings } from "@/lib/types";
import type { FinanceSettingsInput } from "@agency/types";

export interface PdfContext {
  companyName: string;
  logoUrl: string | null;
  displayMode: "LOGO" | "TEXT";
  address: string;
  email: string;
  phone: string;
  paymentInstructions: string;
  footerNotes: string;
  termsAndConditions: string;
  bankingDetails: Record<string, unknown> | null;
}

let cached: PdfContext | null = null;

// Branding + finance defaults change rarely, so a single in-memory cache per
// admin session avoids two extra network round-trips on every PDF download.
export async function getPdfContext(): Promise<PdfContext> {
  if (cached) return cached;

  const [settings, financeSettings] = await Promise.all([
    request<{ settings: SiteSettings }>("/settings").then((r) => r.settings),
    request<{ item: FinanceSettingsInput }>("/finance/settings").then((r) => r.item),
  ]);

  cached = {
    companyName: settings.branding?.brandName || settings.company_name || "Company",
    logoUrl: settings.branding?.logoUrl ?? null,
    displayMode: settings.branding?.displayMode ?? "TEXT",
    address: settings.address ?? "",
    email: settings.contact_email ?? "",
    phone: settings.contact_phone ?? "",
    paymentInstructions: financeSettings.paymentInstructions ?? "",
    footerNotes: financeSettings.footerNotes ?? "",
    termsAndConditions: financeSettings.termsAndConditions ?? "",
    bankingDetails: (financeSettings.bankingDetails as Record<string, unknown> | null) ?? null,
  };
  return cached;
}
