import { z } from "zod";
import { hrefSchema } from "./common.js";

// Six curated templates (exact combinations the product spec calls for),
// but the field-presence rules driving both the admin form and (Phase 2)
// the public renderer live in one registry below -- a future 7th template
// is a new POPUP_TEMPLATE_FIELD_CONFIG entry, not a schema migration.
export const POPUP_TEMPLATE_TYPES = [
  "IMAGE_ONLY",
  "IMAGE_TEXT",
  "IMAGE_TEXT_COUNTDOWN",
  "TEXT_COUNTDOWN",
  "TEXT_ONLY",
  "COUNTDOWN_ONLY",
] as const;
export type PopupTemplateType = (typeof POPUP_TEMPLATE_TYPES)[number];
export const popupTemplateTypeSchema = z.enum(POPUP_TEMPLATE_TYPES);

export interface PopupTemplateFieldConfig {
  label: string;
  image: boolean;
  heading: boolean;
  description: boolean;
  countdown: boolean;
}

export const POPUP_TEMPLATE_FIELD_CONFIG: Record<PopupTemplateType, PopupTemplateFieldConfig> = {
  IMAGE_ONLY: { label: "Image only", image: true, heading: false, description: false, countdown: false },
  IMAGE_TEXT: { label: "Image + Text", image: true, heading: true, description: true, countdown: false },
  IMAGE_TEXT_COUNTDOWN: { label: "Image + Text + Countdown", image: true, heading: true, description: true, countdown: true },
  TEXT_COUNTDOWN: { label: "Text + Countdown", image: false, heading: true, description: true, countdown: true },
  TEXT_ONLY: { label: "Text only", image: false, heading: true, description: true, countdown: false },
  COUNTDOWN_ONLY: { label: "Countdown", image: false, heading: true, description: false, countdown: true },
};

export const POPUP_DEVICE_TARGETS = ["ALL", "DESKTOP", "MOBILE", "TABLET"] as const;
export type PopupDeviceTarget = (typeof POPUP_DEVICE_TARGETS)[number];
export const popupDeviceTargetSchema = z.enum(POPUP_DEVICE_TARGETS);

export const POPUP_COUNTDOWN_EXPIRY_ACTIONS = ["HIDE_POPUP", "DISABLE_CTA", "SHOW_MESSAGE"] as const;
export type PopupCountdownExpiryAction = (typeof POPUP_COUNTDOWN_EXPIRY_ACTIONS)[number];
export const popupCountdownExpiryActionSchema = z.enum(POPUP_COUNTDOWN_EXPIRY_ACTIONS);

export const POPUP_TARGETING_SCOPES = ["ALL", "HOME", "SPECIFIC_PAGES", "SPECIFIC_URLS"] as const;
export type PopupTargetingScope = (typeof POPUP_TARGETING_SCOPES)[number];

export const popupTargetingSchema = z.object({
  scope: z.enum(POPUP_TARGETING_SCOPES).default("ALL"),
  pages: z.array(z.string().min(1)).default([]),
  urls: z.array(z.string().min(1)).default([]),
});
export type PopupTargetingInput = z.infer<typeof popupTargetingSchema>;

export const POPUP_TRIGGER_TYPES = ["IMMEDIATE", "DELAY", "SCROLL", "EXIT_INTENT", "PAGE_VIEWS"] as const;
export type PopupTriggerType = (typeof POPUP_TRIGGER_TYPES)[number];

export const popupTriggerSchema = z
  .object({
    type: z.enum(POPUP_TRIGGER_TYPES).default("IMMEDIATE"),
    delaySeconds: z.coerce.number().int().min(0).max(600).nullable().optional(),
    scrollPercent: z.coerce.number().int().min(1).max(100).nullable().optional(),
    pageViewCount: z.coerce.number().int().min(1).max(50).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "DELAY" && !data.delaySeconds) {
      ctx.addIssue({ code: "custom", message: "Set how many seconds to wait", path: ["delaySeconds"] });
    }
    if (data.type === "SCROLL" && !data.scrollPercent) {
      ctx.addIssue({ code: "custom", message: "Set a scroll percentage", path: ["scrollPercent"] });
    }
    if (data.type === "PAGE_VIEWS" && !data.pageViewCount) {
      ctx.addIssue({ code: "custom", message: "Set a number of pages", path: ["pageViewCount"] });
    }
  });
export type PopupTriggerInput = z.infer<typeof popupTriggerSchema>;

export const POPUP_FREQUENCY_MODES = ["SESSION", "DAY", "WEEK", "EVERY_VISIT", "CUSTOM"] as const;
export type PopupFrequencyMode = (typeof POPUP_FREQUENCY_MODES)[number];

export const popupFrequencySchema = z
  .object({
    mode: z.enum(POPUP_FREQUENCY_MODES).default("SESSION"),
    customHours: z.coerce.number().int().min(1).max(8760).nullable().optional(),
    maxImpressionsPerUser: z.coerce.number().int().min(1).max(1000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "CUSTOM" && !data.customHours) {
      ctx.addIssue({ code: "custom", message: "Set how many hours between shows", path: ["customHours"] });
    }
  });
export type PopupFrequencyInput = z.infer<typeof popupFrequencySchema>;

export const POPUP_CLOSE_BUTTON_STYLES = ["DEFAULT", "MINIMAL", "CIRCLE"] as const;
export type PopupCloseButtonStyle = (typeof POPUP_CLOSE_BUTTON_STYLES)[number];

export const POPUP_IMAGE_POSITIONS = ["TOP", "LEFT", "RIGHT", "BACKGROUND"] as const;
export type PopupImagePosition = (typeof POPUP_IMAGE_POSITIONS)[number];

export const POPUP_TEXT_ALIGNMENTS = ["LEFT", "CENTER", "RIGHT"] as const;
export type PopupTextAlignment = (typeof POPUP_TEXT_ALIGNMENTS)[number];

const hexColor = (fallback: string) =>
  z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Enter a valid hex color, e.g. #111111.")
    .default(fallback);

export const popupDesignSchema = z.object({
  width: z.coerce.number().int().min(240).max(1200).default(480),
  autoHeight: z.boolean().default(true),
  height: z.coerce.number().int().min(120).max(1000).nullable().optional(),
  borderRadius: z.coerce.number().int().min(0).max(48).default(16),
  backgroundColor: hexColor("#ffffff"),
  textAlign: z.enum(POPUP_TEXT_ALIGNMENTS).default("CENTER"),
  contentAlignment: z.enum(POPUP_TEXT_ALIGNMENTS).default("CENTER"),
  buttonTextColor: hexColor("#ffffff"),
  buttonBackgroundColor: hexColor("#111111"),
  overlayColor: hexColor("#000000"),
  overlayOpacity: z.coerce.number().min(0).max(1).default(0.6),
  closeButtonStyle: z.enum(POPUP_CLOSE_BUTTON_STYLES).default("DEFAULT"),
  imagePosition: z.enum(POPUP_IMAGE_POSITIONS).default("TOP"),
});
export type PopupDesignInput = z.infer<typeof popupDesignSchema>;

// Full create/update input. Content/countdown/CTA requiredness is driven by
// POPUP_TEMPLATE_FIELD_CONFIG rather than hardcoded per-template branches,
// so a new template only needs a new registry entry above.
export const popupSchema = z
  .object({
    name: z.string().min(2, "Name is required").max(150),
    internalNotes: z.string().max(2000).optional().or(z.literal("")),
    templateType: popupTemplateTypeSchema,
    isActive: z.boolean().default(true),
    priority: z.coerce.number().int().min(0).max(1000).default(0),

    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),

    heading: z.string().max(200).optional().or(z.literal("")),
    description: z.string().max(2000).optional().or(z.literal("")),
    imageId: z.string().nullable().optional(),
    imageLinkUrl: hrefSchema.optional().or(z.literal("")),
    ctaEnabled: z.boolean().default(false),
    ctaText: z.string().max(60).optional().or(z.literal("")),
    ctaUrl: hrefSchema.optional().or(z.literal("")),
    ctaOpenNewTab: z.boolean().default(false),

    countdownEndAt: z.coerce.date().nullable().optional(),
    countdownTimezone: z.string().max(60).optional().or(z.literal("")),
    countdownExpiryAction: popupCountdownExpiryActionSchema.default("HIDE_POPUP"),
    countdownExpiryMessage: z.string().max(300).optional().or(z.literal("")),

    design: popupDesignSchema,
    targeting: popupTargetingSchema,
    trigger: popupTriggerSchema,
    frequency: popupFrequencySchema,

    deviceTarget: popupDeviceTargetSchema.default("ALL"),
    closeOnOverlayClick: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    const fields = POPUP_TEMPLATE_FIELD_CONFIG[data.templateType];

    if (fields.image && !data.imageId) {
      ctx.addIssue({ code: "custom", message: "This template requires an image", path: ["imageId"] });
    }
    if (fields.heading && !data.heading?.trim()) {
      ctx.addIssue({ code: "custom", message: "This template requires a heading", path: ["heading"] });
    }
    if (fields.countdown && !data.countdownEndAt) {
      ctx.addIssue({ code: "custom", message: "Set the countdown end date/time", path: ["countdownEndAt"] });
    }
    if (data.ctaEnabled) {
      if (!data.ctaText?.trim()) ctx.addIssue({ code: "custom", message: "Button text is required", path: ["ctaText"] });
      if (!data.ctaUrl?.trim()) ctx.addIssue({ code: "custom", message: "Button URL is required", path: ["ctaUrl"] });
    }
    if (data.startsAt && data.endsAt && data.endsAt <= data.startsAt) {
      ctx.addIssue({ code: "custom", message: "End date must be after start date", path: ["endsAt"] });
    }
    if (data.countdownExpiryAction === "SHOW_MESSAGE" && !data.countdownExpiryMessage?.trim()) {
      ctx.addIssue({ code: "custom", message: "Enter the message to show after the countdown ends", path: ["countdownExpiryMessage"] });
    }
  });
export type PopupInput = z.infer<typeof popupSchema>;
