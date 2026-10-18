import { prisma, type Prisma } from "@agency/database";
import {
  buildContentSchema,
  countNeedsContent,
  getSectionType,
  type CollectionKey,
  type FieldDef,
  type SectionTypeDef,
} from "@agency/types";
import { ApiError } from "../middleware/error-handler.js";
import { sanitizeRichText } from "./sanitize.js";

export interface SnapshotSection {
  id: string;
  type: string;
  order: number;
  visible: boolean;
  content: Record<string, unknown>;
}

export interface PageSnapshot {
  title: string;
  slug: string;
  seo: {
    metaTitle: string | null;
    metaDescription: string | null;
    ogImageUrl: string | null;
    canonicalUrl: string | null;
    noindex: boolean;
  };
  sections: SnapshotSection[];
}

/** Sanitizes every `richtext` field (recursing into repeaters) of already-validated content. */
function sanitizeContent(fields: FieldDef[], content: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...content };
  for (const f of fields) {
    const value = out[f.key];
    if (f.type === "richtext" && typeof value === "string") {
      out[f.key] = sanitizeRichText(value);
    } else if (f.type === "repeater" && Array.isArray(value)) {
      out[f.key] = value.map((item) => sanitizeContent(f.fields, item as Record<string, unknown>));
    }
  }
  return out;
}

/** Validates + sanitizes one section's content against the registry. Throws 422 on any problem. */
export function validateSectionContent(type: string, content: unknown): { def: SectionTypeDef; content: Record<string, unknown> } {
  const def = getSectionType(type);
  if (!def) throw new ApiError(422, `Unknown section type "${type}".`);
  const parsed = buildContentSchema(def.fields).parse(content);
  return { def, content: sanitizeContent(def.fields, parsed as Record<string, unknown>) };
}

export function needsContentForSection(type: string, content: unknown): number {
  const def = getSectionType(type);
  return def ? countNeedsContent(def.fields, content) : 0;
}

// --------------------------------------------------------------- snapshots

export async function buildSnapshot(pageId: string): Promise<PageSnapshot> {
  const page = await prisma.page.findUniqueOrThrow({
    where: { id: pageId },
    include: { ogImage: true, sections: { orderBy: { order: "asc" } } },
  });
  return {
    title: page.title,
    slug: page.slug,
    seo: {
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      ogImageUrl: page.ogImage?.url ?? null,
      canonicalUrl: page.canonicalUrl,
      noindex: page.noindex,
    },
    sections: page.sections.map((s) => ({
      id: s.id,
      type: s.type,
      order: s.order,
      visible: s.visible,
      content: s.content as Record<string, unknown>,
    })),
  };
}

// --------------------------------------------------------------- hydration
//
// `collection` fields store ordered ids. The public API swaps them for the
// actual items so the renderer needs no extra requests. Unpublished/missing
// items are dropped silently (a hidden FAQ must not break the page).

type Item = Record<string, unknown> & { id: string };

const media = (m: { url: string; altText: string | null; width: number | null; height: number | null } | null) =>
  m ? { url: m.url, alt: m.altText ?? "", width: m.width, height: m.height } : null;

async function loadCollection(collection: CollectionKey, ids: string[]): Promise<Item[]> {
  if (ids.length === 0) return [];
  switch (collection) {
    case "services": {
      const rows = await prisma.service.findMany({
        where: { id: { in: ids }, status: "PUBLISHED" },
        include: { heroMedia: true, pricingPlans: true },
      });
      return rows.map((r) => {
        // Cheapest real price among the service's plans (custom quotes have none).
        const priced = r.pricingPlans
          .filter((p) => !p.isCustomQuote)
          .map((p) => ({ amount: p.discountPrice ?? p.regularPrice, currency: p.currency }))
          .filter((p): p is { amount: number; currency: string | null } => typeof p.amount === "number");
        const cheapest = priced.sort((a, b) => a.amount - b.amount)[0] ?? null;
        return { id: r.id, title: r.name, slug: r.slug, tagline: r.tagline, image: media(r.heroMedia), priceFrom: cheapest };
      });
    }
    case "projects": {
      const rows = await prisma.project.findMany({
        where: { id: { in: ids }, status: "PUBLISHED" },
        include: { category: true, gallery: { orderBy: { order: "asc" }, take: 1 } },
      });
      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        summary: r.summary,
        category: r.category?.name ?? null,
        results: r.results,
        image: r.gallery[0] ? { url: r.gallery[0].url, alt: r.gallery[0].caption ?? r.title, width: r.gallery[0].width, height: r.gallery[0].height } : null,
      }));
    }
    case "testimonials": {
      const rows = await prisma.testimonial.findMany({ where: { id: { in: ids }, status: "PUBLISHED" }, include: { avatar: true } });
      return rows.map((r) => ({ id: r.id, quote: r.quote, author: r.author, role: r.role, company: r.company, rating: r.rating, avatar: media(r.avatar) }));
    }
    case "faqs": {
      const rows = await prisma.faq.findMany({ where: { id: { in: ids }, status: "PUBLISHED" } });
      return rows.map((r) => ({ id: r.id, question: r.question, answer: sanitizeRichText(r.answer) }));
    }
    case "team": {
      const rows = await prisma.teamMember.findMany({ where: { id: { in: ids }, status: "PUBLISHED" }, include: { avatar: true } });
      return rows.map((r) => ({ id: r.id, name: r.name, role: r.role, bio: r.bio, avatar: media(r.avatar) }));
    }
    default: {
      const rows = await prisma.collectionItem.findMany({ where: { id: { in: ids }, collection, visible: true } });
      return rows.map((r) => ({ id: r.id, title: r.title, ...(r.data as Record<string, unknown>) }));
    }
  }
}

async function hydrateContent(fields: FieldDef[], content: Record<string, unknown>): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { ...content };
  for (const f of fields) {
    const value = out[f.key];
    if (f.type === "collection" && Array.isArray(value)) {
      const ids = value as string[];
      const items = await loadCollection(f.collection, ids);
      const byId = new Map(items.map((i) => [i.id, i]));
      out[f.key] = ids.map((id) => byId.get(id)).filter((i): i is Item => !!i);
    } else if (f.type === "repeater" && Array.isArray(value)) {
      out[f.key] = await Promise.all(value.map((item) => hydrateContent(f.fields, item as Record<string, unknown>)));
    }
  }
  return out;
}

/** Visible sections only, collection ids resolved to items. This is what the public site receives. */
export async function toPublicSections(sections: SnapshotSection[]) {
  const visible = sections.filter((s) => s.visible).sort((a, b) => a.order - b.order);
  return Promise.all(
    visible.map(async (s) => {
      const def = getSectionType(s.type);
      return { id: s.id, type: s.type, content: def ? await hydrateContent(def.fields, s.content) : s.content };
    }),
  );
}

export function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
