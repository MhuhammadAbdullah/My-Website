import { Router } from "express";
import { prisma, type Prisma } from "@agency/database";
import { homePageContentSchema, aboutPageContentSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";

export const pagesRouter = Router();

const homeInclude = { seo: { include: { ogImage: true, twitterImage: true } }, heroBackgroundImage: true };

pagesRouter.get(
  "/home",
  asyncHandler(async (_req, res) => {
    const item = await prisma.homePageContent.findFirst({ include: homeInclude });
    res.json({ item });
  }),
);

pagesRouter.put(
  "/home",
  requireAuth,
  requirePermission("home", "update"),
  asyncHandler(async (req, res) => {
    const { seo, ...data } = homePageContentSchema.parse(req.body);
    const existing = await prisma.homePageContent.findFirst();

    const item = existing
      ? await prisma.homePageContent.update({ where: { id: existing.id }, data })
      : await prisma.homePageContent.create({ data });

    // seo is updated separately via its scalar seoId FK, same reasoning as
    // projects.routes.ts: mixing a nested `seo: { update }` write into this
    // call throws a confusing Prisma validation error. Only actually create a
    // new SeoMeta record once the two required fields are present -- saving
    // hero/section copy shouldn't be blocked on filling in SEO first.
    if (seo) {
      if (item.seoId) {
        await prisma.seoMeta.update({ where: { id: item.seoId }, data: seo as Prisma.SeoMetaUpdateInput });
      } else if (seo.metaTitle && seo.metaDescription) {
        const seoRecord = await prisma.seoMeta.create({ data: seo as Prisma.SeoMetaCreateInput });
        await prisma.homePageContent.update({ where: { id: item.id }, data: { seoId: seoRecord.id } });
      }
    }

    const withIncludes = await prisma.homePageContent.findUnique({ where: { id: item.id }, include: homeInclude });
    res.json({ item: withIncludes });
  }),
);

const aboutInclude = { seo: { include: { ogImage: true, twitterImage: true } } };

pagesRouter.get(
  "/about",
  asyncHandler(async (_req, res) => {
    const item = await prisma.aboutPageContent.findFirst({ include: aboutInclude });
    res.json({ item });
  }),
);

pagesRouter.put(
  "/about",
  requireAuth,
  requirePermission("home", "update"),
  asyncHandler(async (req, res) => {
    const { seo, ...data } = aboutPageContentSchema.parse(req.body);
    const existing = await prisma.aboutPageContent.findFirst();

    const item = existing
      ? await prisma.aboutPageContent.update({ where: { id: existing.id }, data })
      : await prisma.aboutPageContent.create({ data });

    // Same reasoning as PUT /home above: seo is a nested relation, updated
    // separately via its scalar seoId FK rather than a nested write.
    if (seo) {
      if (item.seoId) {
        await prisma.seoMeta.update({ where: { id: item.seoId }, data: seo as Prisma.SeoMetaUpdateInput });
      } else if (seo.metaTitle && seo.metaDescription) {
        const seoRecord = await prisma.seoMeta.create({ data: seo as Prisma.SeoMetaCreateInput });
        await prisma.aboutPageContent.update({ where: { id: item.id }, data: { seoId: seoRecord.id } });
      }
    }

    const withIncludes = await prisma.aboutPageContent.findUnique({ where: { id: item.id }, include: aboutInclude });
    res.json({ item: withIncludes });
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
