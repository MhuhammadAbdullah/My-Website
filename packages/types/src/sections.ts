import { z } from "zod";
import { linkHrefSchema } from "./settings.js";

// ---------------------------------------------------------------------------
// Section registry -- the single definition of every CMS section type.
//
// One `SectionTypeDef` drives all three consumers, so they can never drift:
//   - apps/api   validates every write with `buildContentSchema(def.fields)`
//   - apps/admin renders the edit form from `def.fields`
//   - apps/web   maps `def.type` to a React component (see the renderer there)
//
// To add a new section type: define it below, add it to SECTION_TYPES, then
// register a renderer in apps/web/src/components/sections/registry.tsx.
// No schema change, no new API route, no new admin screen.
// ---------------------------------------------------------------------------

export const BUTTON_STYLES = ["primary", "secondary"] as const;
export const PALETTE_COLORS = ["accent", "surface", "surface-2", "light"] as const;
export const VIDEO_KINDS = ["upload", "youtube", "vimeo"] as const;

/** Collections a `collection` field may pull from (see apps/api cms routes). */
export const COLLECTION_KEYS = [
  "services",
  "projects",
  "testimonials",
  "faqs",
  "team",
  "packages",
  "client-logos",
  "creators",
  "tools",
] as const;
export type CollectionKey = (typeof COLLECTION_KEYS)[number];

interface BaseField {
  key: string;
  label: string;
  help?: string;
  required?: boolean;
  /** Admin only: a small heading printed above this field (and the ones after it until the next group). */
  group?: string;
  /** Admin only: show this field only while a sibling field has one of these values. */
  showIf?: { key: string; equals: string[] };
}

export type FieldDef =
  | (BaseField & { type: "text"; max?: number; default?: string })
  | (BaseField & { type: "textarea"; max?: number; default?: string })
  /** Heading text where `**word**` marks the one highlighted (accent) word. */
  | (BaseField & { type: "heading"; max?: number; default?: string })
  | (BaseField & { type: "richtext"; default?: string })
  | (BaseField & { type: "link"; default?: string })
  | (BaseField & { type: "button"; default?: ButtonValue })
  | (BaseField & { type: "image" })
  | (BaseField & { type: "video" })
  | (BaseField & { type: "icon"; default?: string })
  | (BaseField & { type: "color"; default?: (typeof PALETTE_COLORS)[number] })
  | (BaseField & { type: "number"; min?: number; max?: number; default?: number })
  | (BaseField & { type: "toggle"; default?: boolean })
  | (BaseField & { type: "select"; options: { value: string; label: string }[]; default?: string })
  | (BaseField & { type: "repeater"; itemLabel: string; fields: FieldDef[]; max?: number; default?: Record<string, unknown>[] })
  | (BaseField & { type: "collection"; collection: CollectionKey; max?: number });

export interface ButtonValue {
  label: string;
  href: string;
  style: (typeof BUTTON_STYLES)[number];
  newTab: boolean;
}

export interface ImageValue {
  url: string;
  alt: string;
  mediaId: string | null;
  width?: number | null;
  height?: number | null;
  focalX?: number | null;
  focalY?: number | null;
}

export interface VideoValue {
  kind: (typeof VIDEO_KINDS)[number];
  url: string;
}

export interface SectionTypeDef {
  type: string;
  label: string;
  description: string;
  fields: FieldDef[];
}

// ----------------------------------------------------------------- schemas

const buttonSchema = z.object({
  label: z.string().trim().max(60),
  href: linkHrefSchema,
  style: z.enum(BUTTON_STYLES).default("primary"),
  newTab: z.boolean().default(false),
});

const imageSchema = z.object({
  url: z.string().trim().max(1000),
  alt: z.string().trim().max(300).default(""),
  mediaId: z.string().nullable().default(null),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  focalX: z.number().min(0).max(1).nullable().optional(),
  focalY: z.number().min(0).max(1).nullable().optional(),
});

const videoSchema = z
  .object({
    kind: z.enum(VIDEO_KINDS),
    url: z.string().trim().max(1000),
  })
  .refine(
    (v) => {
      if (v.url === "") return true;
      if (v.kind === "youtube") return /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(v.url);
      if (v.kind === "vimeo") return /^https:\/\/(www\.)?vimeo\.com\//i.test(v.url);
      return /^https:\/\//i.test(v.url);
    },
    { message: "Enter a valid video URL for the selected type." },
  );

/** Zod schema for one field's value. Optional (non-required) fields accept absence. */
export function fieldSchema(def: FieldDef): z.ZodTypeAny {
  let schema: z.ZodTypeAny;
  switch (def.type) {
    case "text":
    case "heading":
      schema = z.string().trim().max(def.max ?? 300);
      break;
    case "textarea":
      schema = z.string().trim().max(def.max ?? 2000);
      break;
    case "richtext":
      schema = z.string().max(50_000); // sanitized server-side on write
      break;
    case "link":
      schema = linkHrefSchema;
      break;
    case "button":
      schema = buttonSchema;
      break;
    case "image":
      schema = imageSchema.nullable();
      break;
    case "video":
      schema = videoSchema.nullable();
      break;
    case "icon":
      schema = z.string().trim().max(60);
      break;
    case "color":
      schema = z.enum(PALETTE_COLORS);
      break;
    case "number": {
      let n = z.number();
      if (def.min !== undefined) n = n.min(def.min);
      if (def.max !== undefined) n = n.max(def.max);
      schema = n;
      break;
    }
    case "toggle":
      schema = z.boolean();
      break;
    case "select":
      schema = z.enum(def.options.map((o) => o.value) as [string, ...string[]]);
      break;
    case "repeater":
      schema = z.array(buildContentSchema(def.fields)).max(def.max ?? 24);
      break;
    case "collection":
      schema = z.array(z.string().min(1).max(64)).max(def.max ?? 24);
      break;
  }
  // Required text may still be saved empty as a draft; it is then flagged "needs content".
  if (def.required) return schema;
  return schema.optional();
}

/** Strict-by-key object schema: unknown keys are stripped, never stored. */
export function buildContentSchema(fields: FieldDef[]) {
  return z.object(Object.fromEntries(fields.map((f) => [f.key, fieldSchema(f)])));
}

export function defaultFieldValue(def: FieldDef): unknown {
  switch (def.type) {
    case "text":
    case "textarea":
    case "heading":
    case "richtext":
    case "link":
    case "icon":
      return def.default ?? "";
    case "button":
      return def.default ?? { label: "", href: "", style: "primary", newTab: false };
    case "image":
    case "video":
      return null;
    case "color":
      return def.default ?? "surface";
    case "number":
      return def.default ?? 0;
    case "toggle":
      return def.default ?? false;
    case "select":
      return def.default ?? def.options[0]?.value ?? "";
    case "repeater":
      return def.default ?? [];
    case "collection":
      return [];
  }
}

export function defaultContent(fields: FieldDef[]): Record<string, unknown> {
  return Object.fromEntries(fields.map((f) => [f.key, defaultFieldValue(f)]));
}

// ------------------------------------------------------------ "needs content"

// Seeded placeholders look like [PRICE], [YOUR EMAIL], [X]. Anything matching
// is surfaced in admin as "needs content" until an editor replaces it.
const PLACEHOLDER_RE = /\[[A-Z][A-Z0-9 _-]{0,40}\]/;

/** Number of fields in `content` that still hold a placeholder or an empty required value. */
export function countNeedsContent(fields: FieldDef[], content: unknown): number {
  if (typeof content !== "object" || content === null) return 0;
  const record = content as Record<string, unknown>;
  let count = 0;
  for (const f of fields) {
    const value = record[f.key];
    switch (f.type) {
      case "text":
      case "textarea":
      case "heading":
      case "richtext":
      case "link":
        if (typeof value === "string" && (PLACEHOLDER_RE.test(value) || (f.required && value.trim() === ""))) count++;
        break;
      case "button": {
        const b = value as Partial<ButtonValue> | undefined;
        if (b && (PLACEHOLDER_RE.test(b.label ?? "") || PLACEHOLDER_RE.test(b.href ?? ""))) count++;
        else if (f.required && !(b?.label ?? "").trim()) count++;
        break;
      }
      case "image":
        if (f.required && !(value as ImageValue | null)?.url) count++;
        break;
      case "repeater":
        if (Array.isArray(value)) for (const item of value) count += countNeedsContent(f.fields, item);
        break;
      default:
        break;
    }
  }
  return count;
}

// ------------------------------------------------------------------ registry

const buttonField = (key: string, label: string, def: Partial<ButtonValue> = {}): FieldDef => ({
  key,
  label,
  type: "button",
  default: { label: "", href: "", style: "primary", newTab: false, ...def },
});

export const SECTION_TYPES: SectionTypeDef[] = [
  {
    type: "hero",
    label: "Hero",
    description: "The first thing visitors see: a big heading, intro text, two buttons and a grid of highlight tiles.",
    fields: [
      { key: "eyebrow", group: "Text", label: "Small label above the heading", type: "text", max: 80, help: "e.g. Now booking Q4 projects" },
      { key: "heading", label: "Heading", type: "heading", required: true, help: "Click a word below the field to highlight it in the accent colour." },
      { key: "body", label: "Paragraph", type: "textarea", max: 600 },
      { ...buttonField("primaryButton", "Main button", { style: "primary" }), group: "Buttons" } as FieldDef,
      buttonField("secondaryButton", "Second button", { style: "secondary" }),
      {
        key: "tiles",
        group: "Highlight tiles (right side)",
        label: "Tiles",
        type: "repeater",
        itemLabel: "Tile",
        max: 6,
        help: "Up to 6. Open a tile to change it. Each one is an image, a project preview, a video or a number.",
        fields: [
          {
            key: "kind",
            label: "What does this tile show?",
            type: "select",
            options: [
              { value: "project", label: "A project preview" },
              { value: "image", label: "An image" },
              { value: "video", label: "A video" },
              { value: "stat", label: "A number (stat)" },
            ],
            default: "image",
          },
          {
            key: "size",
            label: "Tile size",
            type: "select",
            options: [
              { value: "small", label: "Small" },
              { value: "wide", label: "Wide (full width)" },
              { value: "tall", label: "Tall" },
            ],
            default: "small",
          },
          { key: "project", label: "Project", type: "collection", collection: "projects", max: 1, showIf: { key: "kind", equals: ["project"] } },
          { key: "image", label: "Image", type: "image", showIf: { key: "kind", equals: ["image"] } },
          { key: "video", label: "Video", type: "video", showIf: { key: "kind", equals: ["video"] } },
          { key: "value", label: "The number", type: "text", max: 20, help: "e.g. 97+ or 85%", showIf: { key: "kind", equals: ["stat"] } },
          {
            key: "tone",
            label: "Colour",
            type: "select",
            options: [
              { value: "dark", label: "Dark" },
              { value: "accent", label: "Accent (bright)" },
            ],
            default: "dark",
            showIf: { key: "kind", equals: ["stat"] },
          },
          { key: "title", label: "Caption / label", type: "text", max: 80, help: "Shown on the tile, e.g. “Projects shipped”." },
          { key: "link", label: "Link when clicked (optional)", type: "link" },
        ],
      },
    ],
  },
  {
    type: "marquee",
    label: "Marquee band",
    description: "Scrolling band of words or logos (accent-coloured by default).",
    fields: [
      {
        key: "items",
        label: "Items",
        type: "repeater",
        itemLabel: "Item",
        max: 20,
        fields: [
          { key: "text", label: "Text", type: "text", max: 40 },
          { key: "image", label: "…or an image/logo", type: "image" },
        ],
      },
      { key: "speed", label: "Seconds per loop (higher = slower)", type: "number", min: 8, max: 120, default: 30 },
      { key: "pauseOnHover", label: "Pause on hover", type: "toggle", default: true },
      {
        key: "tone",
        label: "Colour",
        type: "select",
        options: [
          { value: "accent", label: "Accent band" },
          { value: "dark", label: "Dark band" },
        ],
        default: "accent",
      },
    ],
  },
  {
    type: "services_list",
    label: "Services list",
    description: "Numbered rows pulled from the Services collection, so it stays in sync with the Services page.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", max: 80 },
      { key: "heading", label: "Heading", type: "heading", required: true },
      { key: "intro", label: "Intro text (right of the heading)", type: "textarea", max: 300 },
      { key: "services", label: "Services (pick and order)", type: "collection", collection: "services", max: 12 },
      { key: "showPrices", label: "Show the “from” price", type: "toggle", default: true },
      { key: "pricePrefix", label: "Price prefix", type: "text", max: 20, default: "From" },
      buttonField("button", "Button under the list (optional)", { style: "secondary" }),
    ],
  },
  {
    type: "selected_work",
    label: "Selected work",
    description: "Project cards from the Portfolio collection (image, category, name, summary).",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", max: 80 },
      { key: "heading", label: "Heading", type: "heading", required: true },
      { key: "projects", label: "Projects (pick and order)", type: "collection", collection: "projects", max: 9 },
      { key: "showResult", label: "Show each project's first result as a badge", type: "toggle", default: false },
      buttonField("button", "Link to the portfolio", { style: "secondary" }),
    ],
  },
  {
    type: "results",
    label: "Results / big numbers",
    description: "3–4 big numbers: a bordered grid (default) or a full accent band, with optional count-up.",
    fields: [
      { key: "heading", label: "Heading (optional)", type: "heading" },
      {
        key: "items",
        label: "Numbers",
        type: "repeater",
        itemLabel: "Number",
        max: 6,
        fields: [
          { key: "value", label: "Value", type: "text", max: 20, required: true, help: "e.g. 10+, 85%, 1,500" },
          { key: "label", label: "Label", type: "text", max: 60, required: true },
          { key: "note", label: "Short note (optional)", type: "text", max: 100 },
        ],
      },
      {
        key: "variant",
        label: "Style",
        type: "select",
        options: [
          { value: "grid", label: "Bordered grid" },
          { value: "band", label: "Accent band" },
        ],
        default: "grid",
      },
      { key: "countUp", label: "Count-up animation", type: "toggle", default: false },
    ],
  },
  {
    type: "process",
    label: "Process steps",
    description: "4–6 steps: horizontal on desktop, stacked on mobile.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", max: 80 },
      { key: "heading", label: "Heading", type: "heading", required: true },
      {
        key: "steps",
        label: "Steps",
        type: "repeater",
        itemLabel: "Step",
        max: 8,
        fields: [
          { key: "number", label: "Number", type: "text", max: 4, help: "Leave empty to number automatically." },
          { key: "title", label: "Title", type: "text", max: 60, required: true },
          { key: "description", label: "Description", type: "textarea", max: 300 },
          { key: "meta", label: "Small label (e.g. Week 1)", type: "text", max: 30 },
          { key: "icon", label: "Icon (optional, replaces the number)", type: "icon" },
        ],
      },
    ],
  },
  {
    type: "pricing",
    label: "Pricing packages",
    description: "Pricing cards. The highlighted package is the accent card.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", max: 80 },
      { key: "heading", label: "Heading", type: "heading", required: true },
      { key: "intro", label: "Intro text", type: "textarea", max: 300 },
      {
        key: "packages",
        label: "Packages",
        type: "repeater",
        itemLabel: "Package",
        max: 4,
        fields: [
          { key: "title", label: "Package name", type: "text", max: 60, required: true },
          { key: "pricePrefix", label: "Text above the price", type: "text", max: 20, help: "e.g. from" },
          { key: "price", label: "Price", type: "text", max: 40, required: true, help: "Free text, e.g. $1,200 or [PRICE]" },
          { key: "billingNote", label: "Billing note", type: "text", max: 80, help: "e.g. one-time, per month" },
          { key: "description", label: "Description", type: "textarea", max: 300 },
          {
            key: "features",
            label: "Features",
            type: "repeater",
            itemLabel: "Feature",
            max: 20,
            fields: [{ key: "text", label: "Feature", type: "text", max: 160, required: true }],
          },
          { key: "highlighted", label: "Highlighted (accent card)", type: "toggle", default: false },
          { key: "badge", label: "Badge text", type: "text", max: 40, help: "e.g. Most popular" },
          buttonField("button", "Button"),
        ],
      },
    ],
  },
  {
    type: "testimonials",
    label: "Testimonials slider",
    description: "Big quote slider from the Testimonials collection (arrows, swipe, optional autoplay).",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", max: 80 },
      { key: "heading", label: "Heading (optional)", type: "heading" },
      { key: "testimonials", label: "Testimonials (pick and order)", type: "collection", collection: "testimonials", max: 12 },
      { key: "autoplay", label: "Autoplay", type: "toggle", default: false },
      { key: "intervalSeconds", label: "Seconds per slide", type: "number", min: 3, max: 30, default: 7 },
    ],
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Accordion of questions. Pull from the FAQ collection and/or write your own. Adds FAQPage structured data.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", max: 80 },
      { key: "heading", label: "Heading", type: "heading", required: true },
      { key: "helpLine", label: "Help line under the heading", type: "text", max: 80, help: "e.g. Still curious?" },
      buttonField("helpLink", "Help link", { style: "secondary" }),
      { key: "firstOpen", label: "Open the first question", type: "toggle", default: true },
      { key: "faqs", group: "Questions", label: "From the FAQ collection", type: "collection", collection: "faqs" },
      {
        key: "items",
        label: "Extra questions",
        type: "repeater",
        itemLabel: "Question",
        fields: [
          { key: "question", label: "Question", type: "text", max: 240, required: true },
          { key: "answer", label: "Answer", type: "richtext", required: true },
        ],
      },
    ],
  },
  {
    type: "inquiry_form",
    label: "Inquiry form",
    description: "Lead form on an accent card. Submissions land in Messages; the notification and auto-reply go out by email.",
    fields: [
      { key: "heading", group: "Text next to the form", label: "Heading", type: "heading", required: true },
      { key: "body", label: "Paragraph", type: "textarea", max: 400 },
      { key: "email", label: "Contact email shown under the text", type: "text", max: 120 },
      { key: "showPhone", group: "Which questions does the form ask?", label: "Ask for phone / WhatsApp", type: "toggle", default: true },
      { key: "showCompany", label: "Ask for company", type: "toggle", default: true },
      { key: "showService", label: "Ask which service", type: "toggle", default: true },
      {
        key: "serviceOptions",
        label: "Service options",
        type: "repeater",
        itemLabel: "Option",
        max: 12,
        fields: [{ key: "label", label: "Label", type: "text", max: 60, required: true }],
      },
      { key: "showBudget", label: "Ask for a budget", type: "toggle", default: true },
      {
        key: "budgetOptions",
        label: "Budget options",
        type: "repeater",
        itemLabel: "Option",
        max: 8,
        fields: [{ key: "label", label: "Label", type: "text", max: 40, required: true }],
      },
      { key: "submitLabel", group: "Button and messages", label: "Submit button label", type: "text", max: 40, default: "Send enquiry" },
      { key: "successMessage", label: "Success message", type: "textarea", max: 300, default: "Thank you — we received your message and will reply within one business day." },
      { key: "errorMessage", label: "Error message", type: "textarea", max: 300, default: "Something went wrong. Please try again or email us directly." },
    ],
  },
  {
    type: "cta_band",
    label: "Call-to-action band",
    description: "Accent-coloured band with a heading and one button.",
    fields: [
      { key: "heading", label: "Heading", type: "heading", required: true },
      { key: "body", label: "Paragraph", type: "textarea", max: 400 },
      buttonField("button", "Button"),
    ],
  },
  {
    type: "rich_text",
    label: "Text block",
    description: "A heading with a formatted text body.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", max: 80 },
      { key: "heading", label: "Heading", type: "heading" },
      { key: "body", label: "Body", type: "richtext" },
    ],
  },
  // ---- optional sections (not on the default homepage; add them from "Add section") ----
  {
    type: "client_logos",
    label: "Client logos strip",
    description: "A row of client logos.",
    fields: [
      { key: "heading", label: "Small heading", type: "text", max: 80 },
      {
        key: "logos",
        label: "Logos",
        type: "repeater",
        itemLabel: "Logo",
        max: 16,
        fields: [
          { key: "logo", label: "Logo", type: "image", required: true },
          { key: "href", label: "Link (optional)", type: "link" },
        ],
      },
    ],
  },
  {
    type: "founder_note",
    label: "Founder note",
    description: "Photo, a personal quote and a signature.",
    fields: [
      { key: "photo", label: "Photo", type: "image" },
      { key: "quote", label: "Quote", type: "textarea", max: 800, required: true },
      { key: "name", label: "Name", type: "text", max: 80 },
      { key: "role", label: "Role", type: "text", max: 80 },
      { key: "signature", label: "Signature image (optional)", type: "image" },
    ],
  },
  {
    type: "latest_insights",
    label: "Latest insights",
    description: "Article cards. This site has no blog yet, so posts are added here by hand.",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", max: 80 },
      { key: "heading", label: "Heading", type: "heading" },
      {
        key: "posts",
        label: "Posts",
        type: "repeater",
        itemLabel: "Post",
        max: 6,
        fields: [
          { key: "title", label: "Title", type: "text", max: 120, required: true },
          { key: "excerpt", label: "Excerpt", type: "textarea", max: 240 },
          { key: "href", label: "Link", type: "link" },
          { key: "date", label: "Date label", type: "text", max: 30 },
          { key: "image", label: "Image", type: "image" },
        ],
      },
    ],
  },
  {
    type: "booking_cta",
    label: "Booking CTA",
    description: "A call-to-action to book a call (link, or embed a scheduling page).",
    fields: [
      { key: "heading", label: "Heading", type: "heading" },
      { key: "body", label: "Paragraph", type: "textarea", max: 300 },
      buttonField("button", "Booking link"),
      { key: "embedUrl", label: "Embed URL (optional, https only)", type: "link", help: "e.g. your Calendly page. Shown as an embedded frame." },
    ],
  },
  {
    type: "newsletter",
    label: "Newsletter box",
    description: "Email signup box. Signups arrive in Messages.",
    fields: [
      { key: "heading", label: "Heading", type: "heading" },
      { key: "body", label: "Paragraph", type: "textarea", max: 240 },
      { key: "placeholder", label: "Input placeholder", type: "text", max: 60, default: "you@example.com" },
      { key: "buttonLabel", label: "Button label", type: "text", max: 30, default: "Subscribe" },
      { key: "successMessage", label: "Success message", type: "text", max: 200, default: "You're subscribed." },
      { key: "errorMessage", label: "Error message", type: "text", max: 200, default: "Something went wrong. Please try again." },
    ],
  },
];

/** Section types that the default homepage uses, in order (the rest are opt-in extras). */
export const OPTIONAL_SECTION_TYPES = ["client_logos", "founder_note", "latest_insights", "booking_cta", "newsletter"] as const;

export const SECTION_TYPE_MAP: Record<string, SectionTypeDef> = Object.fromEntries(
  SECTION_TYPES.map((t) => [t.type, t]),
);

export function getSectionType(type: string): SectionTypeDef | undefined {
  return SECTION_TYPE_MAP[type];
}

// --------------------------------------------------------------- API shapes

export const sectionInputSchema = z.object({
  id: z.string().min(1).max(64).optional(),
  type: z.string().min(1).max(64),
  visible: z.boolean().default(true),
  // Validated against the registry for `type` in the API (content shape depends on the type).
  content: z.record(z.string(), z.unknown()),
});
export type SectionInput = z.infer<typeof sectionInputSchema>;

export const saveSectionsSchema = z.object({
  // `updatedAt` of the page the editor loaded; a mismatch means someone else saved first (409).
  expectedUpdatedAt: z.string().datetime().optional(),
  sections: z.array(sectionInputSchema).max(60),
});

export const pageSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only.");

export const pageMetaSchema = z.object({
  title: z.string().trim().min(1).max(120),
  slug: pageSlugSchema.optional(),
  metaTitle: z.string().trim().max(160).nullable().optional(),
  metaDescription: z.string().trim().max(300).nullable().optional(),
  ogImageId: z.string().nullable().optional(),
  canonicalUrl: z.string().trim().url().max(500).nullable().optional().or(z.literal("").transform(() => null)),
  noindex: z.boolean().optional(),
});

// Collection item data schemas (CollectionItem.data), validated per collection key.
export const COLLECTION_DATA_SCHEMAS: Partial<Record<CollectionKey, z.ZodTypeAny>> = {
  packages: z.object({
    pricePrefix: z.string().trim().max(20).default(""),
    price: z.string().trim().max(40),
    billingNote: z.string().trim().max(80).default(""),
    description: z.string().trim().max(300).default(""),
    features: z.array(z.object({ text: z.string().trim().min(1).max(160) })).max(20).default([]),
    highlighted: z.boolean().default(false),
    badge: z.string().trim().max(40).default(""),
    button: buttonSchema,
  }),
  "client-logos": z.object({ logo: imageSchema.nullable(), href: linkHrefSchema.default("") }),
  creators: z.object({
    handle: z.string().trim().max(60).default(""),
    role: z.string().trim().max(80).default(""),
    photo: imageSchema.nullable(),
    href: linkHrefSchema.default(""),
  }),
  tools: z.object({
    description: z.string().trim().max(240).default(""),
    logo: imageSchema.nullable(),
    href: linkHrefSchema.default(""),
  }),
};

export const collectionItemInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  data: z.record(z.string(), z.unknown()).prefault({}),
  visible: z.boolean().default(true),
});

// Admin form definition for each generic collection: the same FieldDef model the
// section editor uses, so Admin > Collections renders and validates identically.
export const COLLECTION_FORMS: Partial<Record<CollectionKey, { label: string; singular: string; description: string; fields: FieldDef[] }>> = {
  packages: {
    label: "Packages",
    singular: "Package",
    description: "Pricing cards for the Pricing section. Tick “Highlighted” on one to make it the accent card.",
    fields: [
      { key: "pricePrefix", label: "Text above the price", type: "text", max: 20, help: "e.g. from" },
      { key: "price", label: "Price", type: "text", max: 40, required: true, help: "Free text, e.g. $1,200 or [PRICE]" },
      { key: "billingNote", label: "Billing note", type: "text", max: 80, help: "e.g. one-time, per month" },
      { key: "description", label: "Description", type: "textarea", max: 300 },
      {
        key: "features",
        label: "Features",
        type: "repeater",
        itemLabel: "Feature",
        max: 20,
        fields: [{ key: "text", label: "Feature", type: "text", max: 160, required: true }],
      },
      { key: "highlighted", label: "Highlighted (accent card)", type: "toggle", default: false },
      { key: "badge", label: "Badge text", type: "text", max: 40, help: "e.g. Most popular" },
      buttonField("button", "Button"),
    ],
  },
  "client-logos": {
    label: "Client logos",
    singular: "Logo",
    description: "Logos for the Client logos strip.",
    fields: [
      { key: "logo", label: "Logo", type: "image", required: true },
      { key: "href", label: "Link (optional)", type: "link" },
    ],
  },
  creators: {
    label: "Creators",
    singular: "Creator",
    description: "Creators / influencers to feature.",
    fields: [
      { key: "handle", label: "Handle", type: "text", max: 60 },
      { key: "role", label: "Role", type: "text", max: 80 },
      { key: "photo", label: "Photo", type: "image" },
      { key: "href", label: "Link", type: "link" },
    ],
  },
  tools: {
    label: "Tools",
    singular: "Tool",
    description: "Tools / technologies you use or recommend.",
    fields: [
      { key: "description", label: "Description", type: "textarea", max: 240 },
      { key: "logo", label: "Logo", type: "image" },
      { key: "href", label: "Link", type: "link" },
    ],
  },
};
