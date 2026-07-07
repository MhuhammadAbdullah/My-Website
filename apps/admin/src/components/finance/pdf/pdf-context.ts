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

// Always fetched fresh (no module-level caching) -- Finance Settings can be
// edited at any time from the admin panel, and a stale in-memory cache would
// keep serving old banking details / payment instructions to every PDF
// generated in the same session until a full page reload cleared it.
export async function getPdfContext(): Promise<PdfContext> {
  const [settings, financeSettings] = await Promise.all([
    request<{ settings: SiteSettings }>("/settings").then((r) => r.settings),
    request<{ item: FinanceSettingsInput }>("/finance/settings").then((r) => r.item),
  ]);

  return {
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
}
