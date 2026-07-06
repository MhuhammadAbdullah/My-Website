import { Router } from "express";
import { prisma } from "@agency/database";
import { homePageContentSchema, aboutPageContentSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";

export const pagesRouter = Router();

pagesRouter.get(
  "/home",
  asyncHandler(async (_req, res) => {
    const item = await prisma.homePageContent.findFirst({ include: { seo: true } });
    res.json({ item });
  }),
);

pagesRouter.put(
  "/home",
  requireAuth,
  requirePermission("home", "update"),
  asyncHandler(async (req, res) => {
    const data = homePageContentSchema.parse(req.body);
    const existing = await prisma.homePageContent.findFirst();
    const item = existing
      ? await prisma.homePageContent.update({ where: { id: existing.id }, data })
      : await prisma.homePageContent.create({ data });
    res.json({ item });
  }),
);

pagesRouter.get(
  "/about",
  asyncHandler(async (_req, res) => {
    const item = await prisma.aboutPageContent.findFirst({ include: { seo: true } });
    res.json({ item });
  }),
);

pagesRouter.put(
  "/about",
  requireAuth,
  requirePermission("home", "update"),
  asyncHandler(async (req, res) => {
    const data = aboutPageContentSchema.parse(req.body);
    const existing = await prisma.aboutPageContent.findFirst();
    const item = existing
      ? await prisma.aboutPageContent.update({ where: { id: existing.id }, data })
      : await prisma.aboutPageContent.create({ data });
    res.json({ item });
  }),
);

pagesRouter.get(
  "/about/team",
  asyncHandler(async (_req, res) => {
    const [team, values, timeline, certifications] = await Promise.all([
      prisma.teamMember.findMany({ where: { status: "PUBLISHED" }, orderBy: { order: "asc" }, include: { skills: true, avatar: true } }),
      prisma.coreValue.findMany({ orderBy: { order: "asc" } }),
      prisma.timelineEvent.findMany({ orderBy: { order: "asc" } }),
      prisma.certification.findMany({ orderBy: { order: "asc" } }),
    ]);
    res.json({ team, values, timeline, certifications });
  }),
);
