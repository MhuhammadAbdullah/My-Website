export interface SiteSettings {
  company_name?: string;
  contact_email?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  address?: string;
  business_hours?: Record<string, string>;
  socials?: Record<string, string>;
  calendly_url?: string;
  google_maps_embed?: string;
  currency?: string;
  branding?: {
    brandName: string;
    logoMediaId: string | null;
    logoUrl: string | null;
    displayMode: "LOGO" | "TEXT";
  };
}
