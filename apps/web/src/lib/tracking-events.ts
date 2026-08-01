declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    __googleAdsConversionSendTo?: string;
  }
}

// Fired on the one clear "lead" moment the site currently has -- a
// successful contact form submission. Each provider is only called if its
// script actually loaded (i.e. its ID was configured in the admin panel);
// the Google Ads conversion event additionally needs both a Conversion ID
// and Conversion Label to be set (see TrackingScripts), since a bare
// Conversion ID alone only installs the remarketing tag, not a reportable
// conversion action.
export function trackContactFormConversion(): void {
  if (typeof window === "undefined") return;

  if (typeof window.gtag === "function") {
    window.gtag("event", "generate_lead", { event_category: "contact_form" });
    if (window.__googleAdsConversionSendTo) {
      window.gtag("event", "conversion", { send_to: window.__googleAdsConversionSendTo });
    }
  }

  if (typeof window.fbq === "function") {
    window.fbq("track", "Lead");
  }
}
