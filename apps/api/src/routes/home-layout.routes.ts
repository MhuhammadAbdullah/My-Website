import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@agency/database";
import { getSectionType } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";
import { needsContentForSection, toJson, toPublicSections, validateSectionContent } from "../lib/cms.js";

// The homepage is an ordered list of sections stored in the `home_sections`
// SiteSetting (no new tables). It is managed from the existing Admin > Home Page
// screen; the public site reads the resolved list from GET /home-sections.
export const homeLayoutRouter = Router();

const KEY = "home_sections";

interface Stored {
  id: string;
  type: string;
  visible: boolean;
  content: Record<string, unknown>;
}

async function loadStored(): Promise<Stored[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: KEY } });
  return Array.isArray(row?.value) ? (row.value as unknown as Stored[]) : [];
}

const withFlags = (sections: Stored[]) => sections.map((s) => ({ ...s, needsContent: needsContentForSection(s.type, s.content) }));

// Public: visible sections only, collection ids resolved to items.
homeLayoutRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const stored = await loadStored();
    res.json({ sections: await toPublicSections(stored.map((s, order) => ({ ...s, order }))) });
  }),
);

homeLayoutRouter.get(
  "/admin",
  requireAuth,
  requirePermission("home", "view"),
  asyncHandler(async (_req, res) => {
    const row = await prisma.siteSetting.findUnique({ where: { key: KEY } });
    res.json({ configured: Array.isArray(row?.value), sections: withFlags(await loadStored()) });
  }),
);

const saveSchema = z.object({
  sections: z
    .array(z.object({ id: z.string().max(64).optional(), type: z.string().min(1).max(64), visible: z.boolean().default(true), content: z.record(z.unknown()) }))
    .max(40),
});

async function store(sections: { id?: string; type?: string; visible?: boolean; content?: unknown }[]) {
  const validated: Stored[] = sections.map((s, index) => {
    try {
      const type = s.type as string;
      return { id: s.id ?? randomUUID(), type, visible: s.visible ?? true, content: validateSectionContent(type, s.content).content };
    } catch (error) {
      const label = getSectionType(s.type as string)?.label ?? s.type;
      if (error instanceof z.ZodError) {
        const first = error.issues[0];
        throw new ApiError(422, `Section ${index + 1} (${label}): ${first?.path.join(".") || "content"} — ${first?.message ?? "invalid"}`);
      }
      throw error;
    }
  });
  await prisma.siteSetting.upsert({ where: { key: KEY }, update: { value: toJson(validated) }, create: { key: KEY, value: toJson(validated) } });
  return validated;
}

// Saves and publishes immediately (the site picks it up within ~30 seconds).
homeLayoutRouter.put(
  "/",
  requireAuth,
  requirePermission("home", "update"),
  asyncHandler(async (req, res) => {
    const { sections } = saveSchema.parse(req.body);
    res.json({ sections: withFlags(await store(sections)) });
  }),
);

// Options for the "pick items" fields (services, projects, testimonials, FAQs, team).
type Option = { id: string; title: string; hint?: string };
homeLayoutRouter.get(
  "/options/:collection",
  requireAuth,
  requirePermission("home", "view"),
  asyncHandler(async (req, res) => {
    const order = { order: "asc" as const };
    let items: Option[];
    switch (req.params.collection) {
      case "services":
        items = (await prisma.service.findMany({ orderBy: order, select: { id: true, name: true, status: true } })).map((r): Option => ({ id: r.id, title: r.name, hint: r.status }));
        break;
      case "projects":
        items = (await prisma.project.findMany({ orderBy: order, select: { id: true, title: true, status: true } })).map((r): Option => ({ id: r.id, title: r.title, hint: r.status }));
        break;
      case "testimonials":
        items = (await prisma.testimonial.findMany({ orderBy: order, select: { id: true, author: true, company: true, status: true } })).map(
          (r): Option => ({ id: r.id, title: `${r.author}${r.company ? ` — ${r.company}` : ""}`, hint: r.status }),
        );
        break;
      case "faqs":
        items = (await prisma.faq.findMany({ orderBy: order, select: { id: true, question: true, status: true } })).map((r): Option => ({ id: r.id, title: r.question, hint: r.status }));
        break;
      case "team":
        items = (await prisma.teamMember.findMany({ orderBy: order, select: { id: true, name: true, role: true, status: true } })).map(
          (r): Option => ({ id: r.id, title: `${r.name} — ${r.role}`, hint: r.status }),
        );
        break;
      default:
        throw new ApiError(404, "Unknown list");
    }
    res.json({ items });
  }),
);
