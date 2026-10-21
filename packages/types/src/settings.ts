import { z } from "zod";
import { ALL_CURRENCIES } from "./currencies.js";

// Keep in sync with SOCIAL_PLATFORMS in @agency/ui/social-icons.tsx (the icon
// set lives there since it's presentation-only; this package stays React-free).
export const SOCIAL_PLATFORM_IDS = [
  "facebook",
  "instagram",
  "linkedin",
  "x",
  "youtube",
  "behance",
  "dribbble",
  "tiktok",
  "pinterest",
  "github",
  "threads",
  "medium",
  "whatsapp",
  "telegram",
] as const;
export type SocialPlatformId = (typeof SOCIAL_PLATFORM_IDS)[number];

const optionalUrl = z.string().url().optional().or(z.literal(""));

export const socialLinksSchema = z.object({
  facebook: optionalUrl,
  instagram: optionalUrl,
  linkedin: optionalUrl,
  x: optionalUrl,
  youtube: optionalUrl,
  behance: optionalUrl,
  dribbble: optionalUrl,
  tiktok: optionalUrl,
  pinterest: optionalUrl,
  github: optionalUrl,
  threads: optionalUrl,
  medium: optionalUrl,
  whatsapp: optionalUrl,
  telegram: optionalUrl,
});
export type SocialLinksInput = z.infer<typeof socialLinksSchema>;

// Sourced from Intl's ISO 4217 table (see ./currencies.ts) — all ~160
// internationally recognized currencies, not a hardcoded shortlist.
export const CURRENCY_OPTIONS = ALL_CURRENCIES.map((c) => ({
  code: c.code,
  symbol: c.symbol,
  label: c.name,
}));
export const CURRENCY_CODES = CURRENCY_OPTIONS.map((c) => c.code);
export type CurrencyCode = string;

const CURRENCY_CODE_SET = new Set(CURRENCY_CODES);
export const currencySchema = z.string().refine((val) => CURRENCY_CODE_SET.has(val), {
  message: "Invalid currency code",
});

export const DEFAULT_CURRENCY: CurrencyCode = "PKR";

export const BRANDING_DISPLAY_MODES = ["LOGO", "TEXT"] as const;
export type BrandingDisplayMode = (typeof BRANDING_DISPLAY_MODES)[number];

export const brandingSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  logoMediaId: z.string().nullable(),
  logoUrl: z.string().nullable(),
  displayMode: z.enum(BRANDING_DISPLAY_MODES),
  // Independent from the header logo above -- null means "reuse the header
  // logo in the footer too" (see resolveBranding() in apps/web), not "show
  // no logo in the footer".
  footerLogoMediaId: z.string().nullable(),
  footerLogoUrl: z.string().nullable(),
  // Noir Lime additions -- all optional so payloads from before this change
  // (and rows already stored) still validate untouched.
  // Logo variant designed for the dark theme; the header/footer prefer it
  // over `logoUrl` and warn in admin when it is missing.
  logoDarkMediaId: z.string().nullable().optional().default(null),
  logoDarkUrl: z.string().nullable().optional().default(null),
  faviconMediaId: z.string().nullable().optional().default(null),
  faviconUrl: z.string().nullable().optional().default(null),
  footerTagline: z.string().trim().max(240).optional().default(""),
  // Supports {year} and {brand} tokens. Empty = "(c) {year} {brand}. All rights reserved."
  copyrightText: z.string().trim().max(240).optional().default(""),
  // Display name on outgoing email ("Name <address>"). Empty = brand name.
  emailSenderName: z.string().trim().max(80).optional().default(""),
});
export type BrandingInput = z.infer<typeof brandingSchema>;

export const TECH_STACK_DISPLAY_MODES = ["TAGS", "MARQUEE"] as const;
export type TechStackDisplayMode = (typeof TECH_STACK_DISPLAY_MODES)[number];

export const techStackDisplaySchema = z.enum(TECH_STACK_DISPLAY_MODES);

// Each ID is independently optional -- every tracking integration on the
// frontend only loads when its own field is non-empty, so validation here
// only needs to reject a *non-empty* value that doesn't look like the ID
// format the given provider actually issues. Custom scripts are allowed
// through mostly as-is (trusted admin input, gated behind the "settings"
// RBAC resource, which only Super Admin holds -- see seed.ts) but are
// length-capped to stop accidental multi-MB pastes from bloating every page.
const optionalPattern = (regex: RegExp, message: string) =>
  z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => v === "" || regex.test(v), { message });

export const integrationsSchema = z.object({
  gtmId: optionalPattern(/^GTM-[A-Z0-9]+$/i, "Enter a valid GTM container ID, e.g. GTM-XXXXXXX."),
  ga4Id: optionalPattern(/^G-[A-Z0-9]+$/i, "Enter a valid GA4 Measurement ID, e.g. G-XXXXXXXXXX."),
  metaPixelId: optionalPattern(/^\d{5,20}$/, "Enter a numeric Meta Pixel ID, e.g. 123456789123456."),
  googleAdsId: optionalPattern(/^AW-\d{5,15}$/i, "Enter a valid Google Ads Conversion ID, e.g. AW-123456789."),
  googleAdsConversionLabel: z.string().trim().max(100).optional().default(""),
  clarityId: optionalPattern(/^[a-zA-Z0-9]{5,20}$/, "Enter a valid Microsoft Clarity Project ID."),
  googleSiteVerification: z.string().trim().max(300).optional().default(""),
  // Cloudflare Turnstile SITE key (public). The secret key is the
  // TURNSTILE_SECRET_KEY env var on apps/api -- never stored here.
  turnstileSiteKey: z.string().trim().max(100).optional().default(""),
  headScript: z.string().max(20_000, "Head script is too long (max 20,000 characters).").optional().default(""),
  bodyScript: z.string().max(20_000, "Body script is too long (max 20,000 characters).").optional().default(""),
  footerScript: z.string().max(20_000, "Footer script is too long (max 20,000 characters).").optional().default(""),
});
export type IntegrationsInput = z.infer<typeof integrationsSchema>;

// Influencer Marketplace kill-switches (brief §29) -- reuses the exact same
// SiteSetting-blob mechanism as `integrations` above: `GET /settings` is
// public/unauthenticated, so apps/web reads this key directly to gate
// listing/detail/booking routes with zero extra API surface and zero
// redeploy required to flip a toggle.
export const influencerFlagsSchema = z.object({
  marketplaceEnabled: z.boolean().default(true),
  registrationEnabled: z.boolean().default(true),
  bookingsEnabled: z.boolean().default(true),
  // Rich-text (HTML from the admin's rich-text editor), shown in place of
  // the marketplace when marketplaceEnabled is false.
  maintenanceNotice: z.string().max(5000).optional().default(""),
  registrationClosedMessage: z
    .string()
    .max(2000)
    .optional()
    .default("Influencer registrations are currently closed. Please check back later."),
  bookingsDisabledMessage: z
    .string()
    .max(2000)
    .optional()
    .default("Bookings are temporarily unavailable right now. Please check back later."),
});
export type InfluencerFlagsInput = z.infer<typeof influencerFlagsSchema>;

// Admin-manageable copy for the "Video Guide" modal on the registration
// form's Introduction Video field -- rich-text (HTML from the admin's
// rich-text editor) so admin can rewrite the steps/wording without a code
// change, same mechanism as `influencerFlagsSchema.maintenanceNotice`.
export const influencerVideoGuideSchema = z.object({
  content: z.string().max(10_000).optional().default(""),
});
export type InfluencerVideoGuideInput = z.infer<typeof influencerVideoGuideSchema>;

// Admin-manageable copy for the dashboard's "Platform Insights Guide" page --
// one rich-text field per platform (same mechanism/pattern as
// influencerVideoGuideSchema above), so admin can rewrite where-to-find-your-
// analytics instructions without a code change. Empty string per platform
// means "not customized yet" -- the web app falls back to a sensible default
// in that case, same convention as influencer_flags' maintenanceNotice.
// Admin-manageable copy for the commission notice banner shown at the top of
// the influencer dashboard's Earnings page -- same content-blob mechanism as
// influencerVideoGuideSchema, but plain text (not rich text) since it's a
// one-line disclosure rather than a multi-step guide, and an `enabled` flag
// so admin can hide the banner entirely without clearing the saved copy.
export const influencerCommissionNoticeSchema = z.object({
  enabled: z.boolean().default(true),
  content: z
    .string()
    .max(2000)
    .optional()
    .default(
      "Admin charges a commission on every completed booking before it's paid out to you. The amounts shown below are your net earnings after commission.",
    ),
});
export type InfluencerCommissionNoticeInput = z.infer<typeof influencerCommissionNoticeSchema>;

// Sitewide scrolling announcement bar shown above the header on every public
// page (SiteChrome). Same SiteSetting-blob mechanism as `influencer_flags`
// above -- `enabled` lets admin hide it instantly without losing saved
// colors/messages, `messages` is one marquee loop of N items (the web app
// duplicates the array once and translates -50% for a seamless CSS-only
// loop, same technique as TechMarquee/ReviewsMarquee).
// Internal paths ("/about", "#faq"), absolute URLs, mailto:/tel: -- never "javascript:".
export const linkHrefSchema = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^(\/|#|https?:\/\/|mailto:|tel:)/i.test(v), {
    message: "Use a path like /contact, a full https:// URL, mailto: or tel:.",
  });

const hexColor = (fallback: string) =>
  z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Enter a valid hex color, e.g. #111111.")
    .default(fallback);

export const announcementBarSchema = z.object({
  enabled: z.boolean().default(false),
  backgroundColor: hexColor("#111111"),
  textColor: hexColor("#ffffff"),
  messages: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  link: linkHrefSchema.optional().default(""),
  dismissible: z.boolean().optional().default(false),
});
export type AnnouncementBarInput = z.infer<typeof announcementBarSchema>;

export const influencerInsightsGuideSchema = z.object({
  instagram: z.string().max(10_000).optional().default(""),
  tiktok: z.string().max(10_000).optional().default(""),
  youtube: z.string().max(10_000).optional().default(""),
  facebook: z.string().max(10_000).optional().default(""),
  linkedin: z.string().max(10_000).optional().default(""),
  x: z.string().max(10_000).optional().default(""),
});
export type InfluencerInsightsGuideInput = z.infer<typeof influencerInsightsGuideSchema>;

// ---------------------------------------------------------------------------
// Site Settings (Noir Lime foundation)
//
// Each of these is one `SiteSetting` row, same blob mechanism as the keys
// above. `GET /settings` is public, so nothing secret may live in these --
// see PRIVATE_SETTING_KEYS for the keys that are withheld from it.
// ---------------------------------------------------------------------------

export const ACCENT_OPTIONS = ["lime", "orange", "blue", "yellow"] as const;
export type AccentId = (typeof ACCENT_OPTIONS)[number];
export const ACCENT_HEX: Record<AccentId, string> = {
  lime: "#C8F25A",
  orange: "#FF7A3D",
  blue: "#7AA2FF",
  yellow: "#F5D547",
};

// Text on the accent colour is always near-black, so a custom colour must be light/medium enough to read it.
// WCAG contrast of a #rrggbb colour against the site's near-black (#0b0b0c).
export function accentContrast(hex: string): number {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lum = 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
  return (lum + 0.05) / (0.0036 + 0.05);
}
export const CUSTOM_ACCENT_MIN_CONTRAST = 4.5;

export const themeSchema = z
  .object({
    accent: z.enum([...ACCENT_OPTIONS, "custom"]).default("lime"),
    // Used when accent is "custom": any #rrggbb colour the owner picks.
    customColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Enter the colour as #RRGGBB")
      .optional(),
    // The look first-time visitors get; they can switch with the sun/moon button in the header.
    mode: z.enum(["dark", "light"]).default("dark"),
    // Show the "Install app" banner (Android/desktop install prompt, iPhone "Add to Home Screen" guide).
    installPrompt: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.accent !== "custom") return;
    if (!v.customColor) {
      ctx.addIssue({ code: "custom", path: ["customColor"], message: "Pick a custom colour first" });
    } else if (accentContrast(v.customColor) < CUSTOM_ACCENT_MIN_CONTRAST) {
      ctx.addIssue({ code: "custom", path: ["customColor"], message: "That colour is too dark: the dark text on buttons would be hard to read. Pick a lighter shade." });
    }
  });
export type ThemeInput = z.infer<typeof themeSchema>;

export const headerSettingsSchema = z.object({
  ctaVisible: z.boolean().default(true),
  ctaLabel: z.string().trim().max(40).default("Book a call"),
  ctaHref: linkHrefSchema.default("/contact"),
  ctaNewTab: z.boolean().default(false),
});
export type HeaderSettingsInput = z.infer<typeof headerSettingsSchema>;

const footerLinkSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: linkHrefSchema,
  newTab: z.boolean().default(false),
});
export const footerColumnsSchema = z
  .array(
    z.object({
      title: z.string().trim().min(1).max(60),
      links: z.array(footerLinkSchema).max(12),
    }),
  )
  .max(6);
export type FooterColumnsInput = z.infer<typeof footerColumnsSchema>;

export const legalLinksSchema = z.array(footerLinkSchema).max(8);
export type LegalLinksInput = z.infer<typeof legalLinksSchema>;

export const SOCIAL_FOOTER_PLATFORMS = ["facebook", "instagram", "linkedin", "x", "youtube", "github"] as const;

export const seoDefaultsSchema = z.object({
  // `%s` = page title, `{brand}` = brand name from Branding.
  titleTemplate: z.string().trim().max(120).default("%s | {brand}"),
  defaultTitle: z.string().trim().max(120).default("{brand}"),
  description: z.string().trim().max(300).default(""),
  ogImageUrl: z.string().trim().max(500).default(""),
  twitterHandle: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || /^@?\w{1,15}$/.test(v), { message: "Enter a valid handle, e.g. @yourbrand." }),
});
export type SeoDefaultsInput = z.infer<typeof seoDefaultsSchema>;

export const organizationSchema = z.object({
  legalName: z.string().trim().max(120).default(""),
  description: z.string().trim().max(500).default(""),
  foundingDate: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || /^\d{4}(-\d{2}(-\d{2})?)?$/.test(v), { message: "Use YYYY, YYYY-MM or YYYY-MM-DD." }),
  areaServed: z.string().trim().max(120).default(""),
});
export type OrganizationInput = z.infer<typeof organizationSchema>;

export const BUSINESS_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type BusinessDay = (typeof BUSINESS_DAYS)[number];
const timeOrEmpty = z.string().refine((v) => v === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), { message: "Use HH:MM." });
const businessDaySchema = z.object({
  closed: z.boolean().default(false),
  open: timeOrEmpty.default("09:00"),
  close: timeOrEmpty.default("18:00"),
});
export const businessHoursSchema = z.object({
  mon: businessDaySchema,
  tue: businessDaySchema,
  wed: businessDaySchema,
  thu: businessDaySchema,
  fri: businessDaySchema,
  sat: businessDaySchema,
  sun: businessDaySchema,
});
export type BusinessHoursInput = z.infer<typeof businessHoursSchema>;

export const timezoneSchema = z.string().refine(
  (tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  },
  { message: "Enter a valid IANA timezone, e.g. Asia/Karachi." },
);
export const DEFAULT_TIMEZONE = "Asia/Karachi";

export const whatsappNumberSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\+?[0-9 ()-]{7,20}$/.test(v), { message: "Enter a valid phone number, e.g. +923001234567." });

/** Builds the wa.me link; returns "" when there is no usable number. */
export function buildWhatsAppLink(number: string | undefined, message?: string): string {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 7) return "";
  const text = message?.trim();
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

// Private (never in the public GET /settings): where admin alerts go.
export const PRIVATE_SETTING_KEYS = ["notifications"] as const;
export const notificationsSchema = z.object({
  emails: z.array(z.string().trim().email()).max(10).default([]),
});
export type NotificationsInput = z.infer<typeof notificationsSchema>;

// Services page: everything below the hero that is not a service itself. One
// SiteSetting blob (`services_page`), edited in Admin > Services > Page Sections.
const text = (max: number, fallback = "") => z.string().trim().max(max).default(fallback);

// Reviews slider (infinite marquee) -- shared by the Services page and the creator profile page.
export const reviewsMarqueeSchema = z
  .object({
    enabled: z.boolean().default(true),
    // seconds for the track to travel one loop (higher = slower)
    speed: z.number().int().min(10).max(200).default(50),
    pauseOnHover: z.boolean().default(true),
  })
  .prefault({});
export type ReviewsMarquee = z.infer<typeof reviewsMarqueeSchema>;

// Labels of the "Write a review" block (used for reviews of our service on the Services page).
export const serviceReviewsSchema = z
  .object({
    heading: text(80, "What clients say about us"),
    empty: text(200, "No reviews yet — be the first to share your experience."),
    reviewsCount: text(40, "{n} reviews"),
    write: text(40, "Write a review"),
    formTitle: text(80, "Review our service"),
    formIntro: text(200, "Worked with us? Tell us how it went. Your review goes live right away."),
    yourRating: text(40, "Your rating"),
    yourName: text(40, "Your name"),
    yourCompany: text(40, "Company (optional)"),
    yourReview: text(40, "Your review"),
    submit: text(40, "Submit review"),
    thanks: text(200, "Thank you! Your review is now live."),
    showMore: text(40, "Show more reviews"),
    marquee: reviewsMarqueeSchema,
  })
  .prefault({});

export const servicesPageSchema = z.object({
  reviews: serviceReviewsSchema,
  labels: z
    .object({
      all: text(30, "All"),
      pricesIn: text(30, "Prices in"),
      from: text(20, "From"),
      perMonth: text(10, "/mo"),
      getQuote: text(40, "Get a quote"),
      details: text(40, "Service details"),
      whatYouGet: text(40, "What you get"),
      timeline: text(30, "Timeline"),
      onRequest: text(30, "On request"),
    })
    .prefault({}),
  // How many units of each currency equal one unit of your reference currency (e.g. USD 1, PKR 280).
  // Two or more rows turn on the "Prices in" switcher; a price is converted from its own currency.
  currencies: z.array(z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter code, e.g. USD"), rate: z.number().positive() })).max(6).default([]),
  engagement: z
    .object({
      heading: text(120),
      intro: text(300),
      models: z
        .array(z.object({ label: text(40), title: text(100), description: text(300), highlighted: z.boolean().default(false) }))
        .max(4)
        .default([]),
    })
    .prefault({}),
  estimate: z
    .object({
      heading: text(120),
      intro: text(300),
      cardLabel: text(60),
      note: text(300),
      emptyText: text(120),
      button: z.object({ label: text(40), href: linkHrefSchema.default("/contact") }).prefault({}),
    })
    .prefault({}),
});
export type ServicesPageSettings = z.infer<typeof servicesPageSchema>;

// Portfolio (Work) page: labels, the closing call-to-action and the grid step.
// One SiteSetting blob (`portfolio_page`), edited in Admin > Portfolio > Page Sections.
export const portfolioPageSchema = z.object({
  labels: z
    .object({
      featured: text(30, "Featured"),
      all: text(30, "All"),
      searchPlaceholder: text(40, "Search projects"),
      grid: text(20, "Grid"),
      list: text(20, "List"),
      loadMore: text(40, "Load more projects"),
      // {shown} and {total} are replaced with numbers
      showing: text(60, "Showing {shown} of {total}"),
      readCaseStudy: text(40, "Read case study"),
      projectsShipped: text(40, "Projects shipped"),
      industriesServed: text(40, "Industries served"),
      noResults: text(120, "No projects match your filters yet."),
    })
    .prefault({}),
  pageSize: z.number().int().min(3).max(24).default(7),
  // The single project (case study) page.
  detail: z
    .object({
      visitSite: text(40, "Visit live site"),
      viewCode: text(40, "View code"),
      readStory: text(40, "Read the story"),
      client: text(30, "Client"),
      industry: text(30, "Industry"),
      timeline: text(30, "Timeline"),
      stack: text(30, "Stack"),
      numbersTitle: text(80, "The numbers after launch"),
      chapters: text(30, "Chapters"),
      beforeAfter: text(60, "Before → After"),
      beforeAfterHint: text(120, "Drag the slider to compare the old site with the rebuild."),
      compare: text(30, "Compare"),
      before: text(20, "Before"),
      after: text(20, "After"),
      screens: text(40, "Screens"),
      nextProject: text(40, "Next project"),
      // Chapters group the project's sections (matched by title, comma separated) into the story blocks.
      chapterGroups: z
        .array(z.object({ title: text(60), lead: text(300), sections: text(300) }))
        .max(12)
        .default([
          { title: "The brief", lead: "", sections: "Overview, Client Problem" },
          { title: "The approach", lead: "", sections: "Research, Strategy, Planning" },
          { title: "The build", lead: "", sections: "Wireframes, Design, Development" },
          { title: "The hard part", lead: "", sections: "Challenges, Solutions" },
        ]),
      ctaHeading: text(160, "Want results like these for **your** product?"),
      ctaButton: z.object({ label: text(40, "Start a project"), href: linkHrefSchema.default("/contact") }).prefault({}),
    })
    .prefault({}),
  cta: z
    .object({
      heading: text(120),
      button: z.object({ label: text(40), href: linkHrefSchema.default("/contact") }).prefault({}),
    })
    .prefault({}),
});
export type PortfolioPageSettings = z.infer<typeof portfolioPageSchema>;

// About page: everything around the story/team/values/timeline records (those stay in their own admin tabs).
// One SiteSetting blob (`about_page`), edited in Admin > About > Page Sections.
export const aboutPageSchema = z.object({
  stats: z
    .array(z.object({ value: text(20), label: text(60) }))
    .max(6)
    .default([
      { value: "3+", label: "Years in business" },
      { value: "10+", label: "Projects shipped" },
      { value: "85%", label: "Client retention" },
      { value: "3", label: "Core team members" },
    ]),
  tabHeadings: z
    .object({
      mission: text(160, "Help businesses grow through thoughtful digital solutions."),
      vision: text(160, "Quality, creativity and technology within reach of every business."),
      philosophy: text(160, "Purpose first. Then pixels."),
    })
    .prefault({}),
  timelineSubtitle: text(160, "Milestones from our first idea to the partnerships we build today."),
  teamSubtitle: text(160, "Small team. Senior hands on every project."),
  careers: z
    .object({
      heading: text(80, "Join the team"),
      text: text(200, "We're always looking for people who care about craft."),
      roles: z
        .array(z.object({ title: text(100), meta: text(60), href: linkHrefSchema.default("/contact") }))
        .max(12)
        .default([
          { title: "[Open role — e.g. Frontend Developer]", meta: "Remote · Full-time", href: "/contact" },
          { title: "[Open role]", meta: "Karachi · Internship", href: "/contact" },
        ]),
    })
    .prefault({}),
  cta: z
    .object({
      heading: text(160, "Let's build something **inevitable.**"),
      button: z.object({ label: text(40, "Start a project"), href: linkHrefSchema.default("/contact") }).prefault({}),
    })
    .prefault({}),
});
export type AboutPageSettings = z.infer<typeof aboutPageSchema>;

// Affiliate Tools page: editor's pick, filters/labels, comparison table, newsletter and setup blocks.
// One SiteSetting blob (`affiliate_page`), edited in Admin > Affiliate Tools > Page Sections.
export const affiliatePageSchema = z.object({
  pick: z
    .object({
      toolSlug: text(120),
      tag: text(40, "Editor's pick"),
      buttonLabel: text(60),
      compareLabel: text(40, "Compare plans"),
      ratingLabel: text(30, "Our rating"),
      rating: text(10, "X.X"),
      ratingMax: text(10, "5"),
      pros: z.array(text(120)).max(6).default(["Fast NVMe storage, daily backups", "AI ecommerce website builder"]),
      con: text(120, "[One honest drawback]"),
    })
    .prefault({}),
  labels: z
    .object({
      all: text(30, "All"),
      searchPlaceholder: text(40, "Search tools"),
      featuredOnly: text(40, "Featured only"),
      showing: text(60, "Showing {shown} of {total} tools"),
      why: text(40, "Why we use it:"),
      copyCode: text(40, "Copy code:"),
      copied: text(30, "Copied!"),
      noResults: text(120, "No tools match your filters yet."),
    })
    .prefault({}),
  compare: z
    .object({
      heading: text(120, "Which hosting plan?"),
      featureLabel: text(30, "Feature"),
      columns: z
        .array(z.object({ name: text(40), highlight: z.boolean().default(false) }))
        .max(4)
        .default([
          { name: "Premium", highlight: false },
          { name: "Business", highlight: true },
        ]),
      rows: z
        .array(z.object({ feature: text(60), values: z.array(text(80)).max(4).default([]) }))
        .max(20)
        .default([
          { feature: "Websites", values: ["3", "50"] },
          { feature: "Storage", values: ["20 GB SSD", "50 GB NVMe"] },
          { feature: "Free mailboxes / site", values: ["2 (1 year)", "5 (1 year)"] },
          { feature: "Web apps", values: ["—", "5"] },
          { feature: "Website builder", values: ["AI website builder", "AI ecommerce builder"] },
          { feature: "Backups", values: ["[CHECK]", "Daily & on-demand"] },
          { feature: "Best for", values: ["Small business sites", "Agencies & stores"] },
        ]),
    })
    .prefault({}),
  newsletter: z
    .object({
      heading: text(80, "Get new deals first"),
      text: text(200, "One email when we add a tool or a partner drops a new discount. No spam."),
      placeholder: text(40, "you@company.com"),
      button: text(30, "Notify me"),
      success: text(120, "Thanks — you're on the list."),
      error: text(120, "Please enter a valid email."),
    })
    .prefault({}),
  setup: z
    .object({
      heading: text(120, "Bought hosting? **We'll set it up.**"),
      text: text(240, "Domain, email, WordPress install, SSL and speed setup — done for you, so you can start selling sooner."),
      button: z.object({ label: text(60, "Book setup — from [PRICE]"), href: linkHrefSchema.default("/contact") }).prefault({}),
    })
    .prefault({}),
});
export type AffiliatePageSettings = z.infer<typeof affiliatePageSchema>;

// Contact page: studio status, the four channel cards, the "Start a project" steps, studio card and FAQ heading.
// One SiteSetting blob (`contact_page`), edited in Admin > Contact > Page Sections.
const channelText = (tag: string, sub: string) => z.object({ tag: text(30, tag), title: text(60), sub: text(80, sub) }).prefault({});
export const contactPageSchema = z.object({
  status: z
    .object({
      text: text(60, "Studio is open now"),
      hours: text(80, "Mon–Fri, 9:00 AM – 6:00 PM (PKT)"),
      reply: text(80, "Typical reply: within 1 business day"),
    })
    .prefault({}),
  channels: z
    .object({
      email: channelText("Email", "For briefs & proposals"),
      whatsapp: channelText("WhatsApp", "Quick questions, fastest reply"),
      call: channelText("Call", "20 min · free · video"),
      influencers: z
        .object({ tag: text(30, "Influencers"), title: text(60, "Creator bookings"), sub: text(80, "Go to Influencer Marketplace"), href: linkHrefSchema.default("/influencers") })
        .prefault({}),
    })
    .prefault({}),
  form: z
    .object({
      heading: text(60, "Start a project"),
      intro: text(200, "Three quick steps. The more you share, the sharper our first reply."),
      steps: z.array(text(40)).max(3).default(["Project type", "Budget & timeline", "Your details"]),
      typeQuestion: text(80, "What do you need?"),
      types: z
        .array(text(40))
        .max(16)
        .default(["Website design", "WordPress / Elementor", "Shopify store", "Web app (Next.js)", "SEO", "Video production", "Branding", "Influencer campaign"]),
      budgetQuestion: text(80, "What is your budget?"),
      budgets: z.array(text(40)).max(8).default(["Under $500", "$500 – $1,500", "$1,500 – $5,000", "$5,000+"]),
      timelineQuestion: text(80, "When do you need it?"),
      timelines: z.array(text(40)).max(8).default(["As soon as possible", "1–2 months", "Flexible"]),
      detailsQuestion: text(80, "Tell us about you"),
      pickOne: text(80, "Please pick at least one option."),
      next: text(30, "Continue"),
      back: text(30, "Back"),
      submit: text(30, "Send message"),
      success: text(120, "Message sent — we'll reply within one business day."),
    })
    .prefault({}),
  studio: z
    .object({
      tag: text(30, "The studio"),
      note: text(80, "Visits by appointment only"),
      directions: text(40, "Get directions"),
      mapLink: text(300),
    })
    .prefault({}),
  faqHeading: text(80, "Before you write"),
});
export type ContactPageSettings = z.infer<typeof contactPageSchema>;

// Influencer Marketplace page: hero buttons and steps, small labels, and the two closing cards.
// One SiteSetting blob (`influencers_page`), edited in Admin > Influencer Marketplace > Settings.
export const influencersPageSchema = z.object({
  toggle: z.object({ brand: text(30, "I'm a brand"), creator: text(30, "I'm a creator") }).prefault({}),
  buttons: z
    .object({
      browse: text(40, "Browse creators"),
      brief: text(40, "Post a campaign brief"),
      briefHref: linkHrefSchema.default("/contact?type=Influencer%20campaign"),
    })
    .prefault({}),
  steps: z
    .array(z.object({ title: text(40), text: text(120) }))
    .max(4)
    .default([
      { title: "Discover", text: "Filter by niche, city, followers and engagement." },
      { title: "Shortlist", text: "Save creators and request quotes in one go." },
      { title: "Launch", text: "We manage contracts, content and reporting." },
    ]),
  pageSize: z.number().int().min(4).max(24).default(8),
  reviewsMarquee: reviewsMarqueeSchema,
  labels: z
    .object({
      searchPlaceholder: text(60, "Search by name, niche or city"),
      sort: text(20, "Sort:"),
      filters: text(20, "Filters"),
      viewProfile: text(30, "View profile"),
      shortlist: text(30, "+ Shortlist"),
      shortlisted: text(30, "✓ Shortlisted"),
      followers: text(20, "Followers"),
      engagement: text(20, "Engagement"),
      from: text(20, "From"),
      newCreator: text(20, "New"),
      loadMore: text(40, "Load more creators"),
      // {n} becomes the number of saved creators
      shortlistBar: text(80, "{n} creator(s) in your shortlist"),
      requestQuotes: text(40, "Request quotes"),
      noResults: text(120, "No creators match your filters yet."),
    })
    .prefault({}),
  profile: z
    .object({
      available: text(200, "Available for bookings"),
      unavailable: text(200, "Fully booked"),
      verified: text(200, "Verified"),
      newCreator: text(200, "New creator"),
      reviewsCount: text(200, "{n} reviews"),
      totalFollowers: text(200, "Total followers"),
      avgEngagement: text(200, "Avg. engagement"),
      avgReach: text(200, "Avg. content reach"),
      languages: text(200, "Languages"),
      analytics: text(200, "Audience & analytics"),
      followersEngagement: text(200, "Followers · Engagement"),
      engagementRate: text(200, "Engagement rate"),
      reach: text(200, "Reach"),
      accountReach: text(200, "Account reach"),
      contentReach: text(200, "Avg. content reach"),
      gender: text(200, "Gender"),
      female: text(200, "Female"),
      male: text(200, "Male"),
      age: text(200, "Age"),
      topLocations: text(200, "Top locations"),
      country: text(200, "Country"),
      city: text(200, "City"),
      source: text(200, "Source: platform insights shared by creator."),
      rateCard: text(200, "Rate card"),
      yourBooking: text(200, "Your booking"),
      items: text(200, "{n} item(s)"),
      custom: text(200, "Custom"),
      quoteNote: text(200, "Final quote confirmed by our team within 24 hours. No payment until you approve."),
      bookButton: text(200, "Book {name}"),
      brandWork: text(200, "Previous brand work"),
      collaborations: text(200, "Previous collaborations"),
      reviews: text(200, "Brand reviews"),
      noReviews: text(200, "No reviews yet — be the first to share your experience."),
      writeReview: text(200, "Write a review"),
      reviewFormTitle: text(200, "Review {name}"),
      reviewFormIntro: text(200, "Worked with this creator? Share how it went. Your review goes live right away."),
      yourRating: text(200, "Your rating"),
      yourName: text(200, "Your name"),
      yourCompany: text(200, "Company (optional)"),
      yourReview: text(200, "Your review"),
      submitReview: text(200, "Submit review"),
      reviewThanks: text(200, "Thank you! Your review is now live."),
      showMore: text(200, "Show more reviews"),
      moreCreators: text(200, "More {category} creators"),
      viewAll: text(200, "View all"),
    })
    .prefault({}),
  briefCard: z
    .object({
      tag: text(30, "For brands"),
      heading: text(120, "Don't want to browse? Post a brief."),
      text: text(240, "Tell us your goal, budget and niche — we'll send a shortlist of matched creators within [X] days."),
      button: z.object({ label: text(40, "Post a campaign brief"), href: linkHrefSchema.default("/contact?type=Influencer%20campaign") }).prefault({}),
    })
    .prefault({}),
  creatorCard: z
    .object({
      tag: text(30, "For creators"),
      heading: text(120, "Get paid brand deals."),
      text: text(240, "Create a free profile, set your rates and get discovered by brands looking for creators like you."),
      button: text(40, "Become an influencer"),
    })
    .prefault({}),
});
export type InfluencersPageSettings = z.infer<typeof influencersPageSchema>;

// ---------------------------------------------------------------- section visibility
// Which blocks of each public page the owner can switch off (Admin > Content > Page sections).
// Stored as the list of HIDDEN keys per page, so everything is visible until switched off.
export const PAGE_SECTIONS = {
  about: {
    label: "About",
    href: "/about",
    sections: [
      { key: "stats", label: "Numbers under the intro" },
      { key: "tech", label: "Technologies band" },
      { key: "mission", label: "Mission / Vision / Philosophy" },
      { key: "values", label: "Core values" },
      { key: "timeline", label: "Timeline" },
      { key: "team", label: "Team" },
      { key: "certifications", label: "Certifications" },
      { key: "roles", label: "Join the team (open roles)" },
      { key: "cta", label: "Closing block" },
    ],
  },
  services: {
    label: "Services",
    href: "/services",
    sections: [
      { key: "models", label: "Engagement models" },
      { key: "estimator", label: "Project estimator" },
      { key: "reviews", label: "Client reviews" },
    ],
  },
  portfolio: {
    label: "Portfolio",
    href: "/portfolio",
    sections: [
      { key: "stats", label: "Numbers in the intro" },
      { key: "cta", label: "Closing block" },
    ],
  },
  affiliate: {
    label: "Affiliate Tools",
    href: "/affiliate-tools",
    sections: [
      { key: "disclosure", label: "Affiliate disclosure note" },
      { key: "pick", label: "Our top pick" },
      { key: "compare", label: "Comparison table" },
      { key: "setup", label: "Setup call block" },
    ],
  },
  contact: {
    label: "Contact",
    href: "/contact",
    sections: [
      { key: "status", label: "Studio status line" },
      { key: "studio", label: "Studio address and map" },
    ],
  },
  influencers: {
    label: "Influencer Marketplace",
    href: "/influencers",
    sections: [{ key: "brief", label: "Brief card" }],
  },
} as const;
export type PageSectionKey = keyof typeof PAGE_SECTIONS;

export const sectionVisibilitySchema = z.record(z.string(), z.array(z.string()));
export type SectionVisibility = z.infer<typeof sectionVisibilitySchema>;

export function isSectionVisible(hidden: SectionVisibility | undefined, page: string, key: string) {
  return !(hidden?.[page] ?? []).includes(key);
}

// ---------------------------------------------------------------- Careers (hiring) page
// One SiteSetting blob (careers_page), edited in Admin > Content > Careers. No database table needed.
export const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship"] as const;
export const JOB_MODES = ["On-site", "Hybrid", "Remote"] as const;

export const jobPositionSchema = z.object({
  id: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1, "Title is required").max(100),
  department: text(60),
  location: text(80),
  type: text(30, "Full-time"),
  mode: text(30, "On-site"),
  level: text(40),
  salary: text(60),
  summary: text(500),
  responsibilities: z.array(text(240)).max(20).default([]),
  requirements: z.array(text(240)).max(20).default([]),
  // Optional: where "Apply" goes for this role. Empty = the apply email below (or the Contact page).
  applyUrl: text(300),
  open: z.boolean().default(true),
});
export type JobPosition = z.infer<typeof jobPositionSchema>;

export const careersPageSchema = z.object({
  hero: z
    .object({
      eyebrow: text(60, "We are hiring"),
      heading: text(160, "Build great work **with us**"),
      intro: text(500, "Join a small, senior team that designs and ships digital products. See the roles we are hiring for below."),
    })
    .prefault({}),
  perks: z
    .array(z.object({ title: text(60), text: text(240) }))
    .max(8)
    .default([
      { title: "Meaningful work", text: "Real products for real brands, not busywork." },
      { title: "Grow fast", text: "Senior teammates, honest feedback and room to learn." },
      { title: "Flexible", text: "Work in a way that suits you: on-site, hybrid or remote where the role allows." },
    ]),
  positions: z.array(jobPositionSchema).max(60).default([]),
  apply: z
    .object({
      email: text(120),
      subjectPrefix: text(60, "Application:"),
      buttonLabel: text(40, "Apply now"),
      note: text(240, "Include your CV and a link to your best work."),
    })
    .prefault({}),
  labels: z
    .object({
      all: text(40, "All departments"),
      searchPlaceholder: text(60, "Search roles"),
      openRoles: text(60, "{n} open roles"),
      details: text(40, "View details"),
      hideDetails: text(40, "Hide details"),
      responsibilities: text(60, "What you will do"),
      requirements: text(60, "What we look for"),
    })
    .prefault({}),
  empty: z
    .object({
      heading: text(120, "No open roles right now"),
      text: text(300, "We are not hiring at the moment, but we would still love to hear from you. Send us a note and your CV."),
    })
    .prefault({}),
  cta: z
    .object({
      heading: text(160, "Do not see your role?"),
      text: text(300, "Tell us how you would help. We read every message."),
      buttonLabel: text(40, "Get in touch"),
    })
    .prefault({}),
});
export type CareersPageSettings = z.infer<typeof careersPageSchema>;
