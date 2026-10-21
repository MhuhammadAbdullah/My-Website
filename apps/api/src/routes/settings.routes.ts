import { Router } from "express";
import { prisma, type Prisma } from "@agency/database";
import {
  socialLinksSchema,
  currencySchema,
  brandingSchema,
  techStackDisplaySchema,
  defaultCtaSchema,
  integrationsSchema,
  influencerFlagsSchema,
  influencerVideoGuideSchema,
  influencerInsightsGuideSchema,
  influencerCommissionNoticeSchema,
  announcementBarSchema,
  themeSchema,
  sectionVisibilitySchema,
  careersPageSchema,
  headerSettingsSchema,
  footerColumnsSchema,
  legalLinksSchema,
  seoDefaultsSchema,
  organizationSchema,
  businessHoursSchema,
  timezoneSchema,
  whatsappNumberSchema,
  notificationsSchema,
  servicesPageSchema,
  portfolioPageSchema,
  aboutPageSchema,
  affiliatePageSchema,
  contactPageSchema,
  influencersPageSchema,
  PRIVATE_SETTING_KEYS,
} from "@agency/types";
import { z } from "zod";
import { isGoogleMapsUrl, extractGoogleMapsEmbedSrc } from "@agency/utils";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAnyPermission, requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";

export const settingsRouter = Router();

// Settings with dedicated validation beyond "any JSON value" — checked by key
// before the generic upsert below.
const settingValidators: Record<string, (value: unknown) => Prisma.InputJsonValue> = {
  socials: (value) => socialLinksSchema.parse(value),
  currency: (value) => currencySchema.parse(value),
  branding: (value) => brandingSchema.parse(value),
  tech_stack_display: (value) => techStackDisplaySchema.parse(value),
  google_maps_embed: (value) => {
    if (!value) return "";
    if (typeof value !== "string" || !isGoogleMapsUrl(value)) {
      throw new ApiError(422, "Enter a valid Google Maps URL.");
    }
    return value;
  },
  google_maps_embed_code: (value) => {
    if (!value) return "";
    if (typeof value !== "string" || !extractGoogleMapsEmbedSrc(value)) {
      throw new ApiError(422, "Paste a valid Google Maps iframe embed code.");
    }
    return value;
  },
  // Sitewide default CTA copy (CtaSection's fallback when a page doesn't
  // pass explicit override props) and FAQ section heading (FaqSection's
  // default `title`) -- both live here rather than their own tables since
  // each is a single small blob reused across many pages, not owned by one
  // page's content model.
  default_cta: (value) => defaultCtaSchema.parse(value),
  faq_section_heading: (value) => z.string().min(1, "FAQ heading is required").parse(value),
  integrations: (value) => integrationsSchema.parse(value),
  influencer_flags: (value) => influencerFlagsSchema.parse(value),
  influencer_video_guide: (value) => influencerVideoGuideSchema.parse(value),
  influencer_insights_guide: (value) => influencerInsightsGuideSchema.parse(value),
  influencer_commission_notice: (value) => influencerCommissionNoticeSchema.parse(value),
  announcement_bar: (value) => announcementBarSchema.parse(value),
  // Noir Lime site settings
  theme: (value) => themeSchema.parse(value),
  header: (value) => headerSettingsSchema.parse(value),
  footer_columns: (value) => footerColumnsSchema.parse(value),
  legal_links: (value) => legalLinksSchema.parse(value),
  seo_defaults: (value) => seoDefaultsSchema.parse(value),
  organization: (value) => organizationSchema.parse(value),
  business_schedule: (value) => businessHoursSchema.parse(value),
  timezone: (value) => timezoneSchema.parse(value),
  whatsapp_number: (value) => whatsappNumberSchema.parse(value ?? ""),
  whatsapp_message: (value) => z.string().trim().max(300).parse(value ?? ""),
  contact_email: (value) => z.union([z.literal(""), z.string().trim().email()]).parse(value ?? ""),
  // Private -- see PRIVATE_SETTING_KEYS; withheld from the public GET below.
  notifications: (value) => notificationsSchema.parse(value),
  services_page: (value) => servicesPageSchema.parse(value),
  portfolio_page: (value) => portfolioPageSchema.parse(value),
  about_page: (value) => aboutPageSchema.parse(value),
  affiliate_page: (value) => affiliatePageSchema.parse(value),
  contact_page: (value) => contactPageSchema.parse(value),
  influencers_page: (value) => influencersPageSchema.parse(value),
  section_visibility: (value) => sectionVisibilitySchema.parse(value),
  careers_page: (value) => careersPageSchema.parse(value),
};

const PRIVATE_KEYS = new Set<string>(PRIVATE_SETTING_KEYS);

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.siteSetting.findMany();
    // Public endpoint: private keys (e.g. notification recipients) never leave via it.
    const settings = Object.fromEntries(rows.filter((r) => !PRIVATE_KEYS.has(r.key)).map((r) => [r.key, r.value]));
    res.json({ settings });
  }),
);

settingsRouter.get(
  "/private",
  requireAuth,
  requirePermission("settings", "view"),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: [...PRIVATE_KEYS] } } });
    res.json({ settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
  }),
);

// The Services page extras are page content, so anyone who can edit services may save them.
settingsRouter.put(
  "/services_page",
  requireAuth,
  requireAnyPermission(["settings", "update"], ["services", "update"]),
  asyncHandler(async (req, res) => {
    const value = servicesPageSchema.parse(req.body.value);
    const item = await prisma.siteSetting.upsert({ where: { key: "services_page" }, update: { value }, create: { key: "services_page", value } });
    res.json({ item });
  }),
);

settingsRouter.put(
  "/about_page",
  requireAuth,
  requireAnyPermission(["settings", "update"], ["home", "update"]),
  asyncHandler(async (req, res) => {
    const value = aboutPageSchema.parse(req.body.value);
    const item = await prisma.siteSetting.upsert({ where: { key: "about_page" }, update: { value }, create: { key: "about_page", value } });
    res.json({ item });
  }),
);

settingsRouter.put(
  "/affiliate_page",
  requireAuth,
  requireAnyPermission(["settings", "update"], ["affiliate", "update"]),
  asyncHandler(async (req, res) => {
    const value = affiliatePageSchema.parse(req.body.value);
    const item = await prisma.siteSetting.upsert({ where: { key: "affiliate_page" }, update: { value }, create: { key: "affiliate_page", value } });
    res.json({ item });
  }),
);

settingsRouter.put(
  "/contact_page",
  requireAuth,
  requireAnyPermission(["settings", "update"], ["contact", "update"]),
  asyncHandler(async (req, res) => {
    const value = contactPageSchema.parse(req.body.value);
    const item = await prisma.siteSetting.upsert({ where: { key: "contact_page" }, update: { value }, create: { key: "contact_page", value } });
    res.json({ item });
  }),
);

settingsRouter.put(
  "/influencers_page",
  requireAuth,
  requireAnyPermission(["settings", "update"], ["influencerSettings", "update"]),
  asyncHandler(async (req, res) => {
    const value = influencersPageSchema.parse(req.body.value);
    const item = await prisma.siteSetting.upsert({ where: { key: "influencers_page" }, update: { value }, create: { key: "influencers_page", value } });
    res.json({ item });
  }),
);

settingsRouter.put(
  "/portfolio_page",
  requireAuth,
  requireAnyPermission(["settings", "update"], ["projects", "update"]),
  asyncHandler(async (req, res) => {
    const value = portfolioPageSchema.parse(req.body.value);
    const item = await prisma.siteSetting.upsert({ where: { key: "portfolio_page" }, update: { value }, create: { key: "portfolio_page", value } });
    res.json({ item });
  }),
);

settingsRouter.put(
  "/:key",
  requireAuth,
  requirePermission("settings", "update"),
  asyncHandler(async (req, res) => {
    const key = req.params.key!;
    const value = settingValidators[key] ? settingValidators[key](req.body.value) : req.body.value;

    const item = await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    res.json({ item });
  }),
);
