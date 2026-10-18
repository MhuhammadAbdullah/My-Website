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
  google_maps_embed_code?: string;
  currency?: string;
  branding?: {
    brandName: string;
    logoMediaId: string | null;
    logoUrl: string | null;
    displayMode: "LOGO" | "TEXT";
    footerLogoMediaId?: string | null;
    footerLogoUrl?: string | null;
    logoDarkMediaId?: string | null;
    logoDarkUrl?: string | null;
    faviconMediaId?: string | null;
    faviconUrl?: string | null;
    footerTagline?: string;
    copyrightText?: string;
    emailSenderName?: string;
  };
  theme?: { accent: "lime" | "orange" | "blue" | "yellow" };
  header?: { ctaVisible: boolean; ctaLabel: string; ctaHref: string; ctaNewTab: boolean };
  footer_columns?: { title: string; links: { label: string; href: string; newTab: boolean }[] }[];
  legal_links?: { label: string; href: string; newTab: boolean }[];
  seo_defaults?: { titleTemplate: string; defaultTitle: string; description: string; ogImageUrl: string; twitterHandle: string };
  organization?: { legalName: string; description: string; foundingDate: string; areaServed: string };
  business_schedule?: Record<string, { closed: boolean; open: string; close: string }>;
  timezone?: string;
  whatsapp_message?: string;
  default_cta?: {
    headline: string;
    subheadline: string;
    ctaLabel: string;
    ctaHref: string;
  };
  faq_section_heading?: string;
  integrations?: IntegrationsSettings;
  influencer_flags?: InfluencerFlagsSettings;
  influencer_video_guide?: InfluencerVideoGuideSettings;
  influencer_insights_guide?: InfluencerInsightsGuideSettings;
  influencer_commission_notice?: InfluencerCommissionNoticeSettings;
  announcement_bar?: AnnouncementBarSettings;
}

export interface AnnouncementBarSettings {
  enabled: boolean;
  backgroundColor: string;
  textColor: string;
  messages: string[];
  link?: string;
  dismissible?: boolean;
}

export interface InfluencerFlagsSettings {
  marketplaceEnabled: boolean;
  registrationEnabled: boolean;
  bookingsEnabled: boolean;
  maintenanceNotice: string;
  registrationClosedMessage: string;
  bookingsDisabledMessage: string;
}

export interface InfluencerVideoGuideSettings {
  content: string;
}

export interface InfluencerCommissionNoticeSettings {
  enabled: boolean;
  content: string;
}

export interface InfluencerInsightsGuideSettings {
  instagram: string;
  tiktok: string;
  youtube: string;
  facebook: string;
  linkedin: string;
  x: string;
}

export interface IntegrationsSettings {
  gtmId?: string;
  ga4Id?: string;
  metaPixelId?: string;
  googleAdsId?: string;
  googleAdsConversionLabel?: string;
  clarityId?: string;
  googleSiteVerification?: string;
  turnstileSiteKey?: string;
  headScript?: string;
  bodyScript?: string;
  footerScript?: string;
}
