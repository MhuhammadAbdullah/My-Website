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
    const homeContentData = {
      heroBadgeText: data.heroBadgeText,
      heroHeadline: data.heroHeadline,
      heroSubheadline: data.heroSubheadline,
      heroDescription: data.heroDescription,
      heroBackgroundImageId: data.heroBackgroundImageId,
      heroCtaLabel: data.heroCtaLabel,
      heroCtaHref: data.heroCtaHref,
      heroCtaNewTab: data.heroCtaNewTab,
      heroSecondaryCtaEnabled: data.heroSecondaryCtaEnabled,
      heroSecondaryCtaLabel: data.heroSecondaryCtaLabel,
      heroSecondaryCtaHref: data.heroSecondaryCtaHref,
      heroSecondaryCtaNewTab: data.heroSecondaryCtaNewTab,
      contactCtaHeading: data.contactCtaHeading,
      contactCtaDescription: data.contactCtaDescription,
      contactCtaButtonText: data.contactCtaButtonText,
      contactCtaButtonHref: data.contactCtaButtonHref,
    };
    const existing = await prisma.homePageContent.findFirst();

    const item = existing
      ? await prisma.homePageContent.update({ where: { id: existing.id }, data: homeContentData })
      : await prisma.homePageContent.create({ data: homeContentData });

    // seo is updated separately via its scalar seoId FK, same reasoning as
    // projects.routes.ts: mixing a nested `seo: { update }` write into this
    // call throws a confusing Prisma validation error. Only actually create a
    // new SeoMeta record once the two required fields are present -- saving
    // hero/section copy shouldn't be blocked on filling in SEO first.
    if (seo) {
      // structuredData is a nullable Json column with no admin form exposing
      // it for editing -- GET returns it as `null` on any never-configured
      // SeoMeta row, and the Home SEO form spreads the whole fetched seo
      // object back into its PUT body, so it round-trips untouched. Prisma
      // rejects a bare `null` for a nullable Json field (it needs the
      // Prisma.JsonNull sentinel instead), so drop it before it reaches
      // Prisma rather than plumb that sentinel through for an unused field.
      const { structuredData: _structuredData, ...seoData } = seo;
      if (item.seoId) {
        await prisma.seoMeta.update({ where: { id: item.seoId }, data: seoData as Prisma.SeoMetaUpdateInput });
      } else if (seoData.metaTitle && seoData.metaDescription) {
        const seoRecord = await prisma.seoMeta.create({ data: seoData as Prisma.SeoMetaCreateInput });
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
    const aboutContentData = {
      story: data.story,
      mission: data.mission,
      vision: data.vision,
      philosophy: data.philosophy,
    };
    const existing = await prisma.aboutPageContent.findFirst();

    const item = existing
      ? await prisma.aboutPageContent.update({ where: { id: existing.id }, data: aboutContentData })
      : await prisma.aboutPageContent.create({ data: aboutContentData });

    // Same reasoning as PUT /home above: seo is a nested relation, updated
    // separately via its scalar seoId FK rather than a nested write.
    if (seo) {
      // Same reasoning as PUT /home above -- structuredData is unused and
      // Prisma rejects a bare null for its nullable Json column.
      const { structuredData: _structuredData, ...seoData } = seo;
      if (item.seoId) {
        await prisma.seoMeta.update({ where: { id: item.seoId }, data: seoData as Prisma.SeoMetaUpdateInput });
      } else if (seoData.metaTitle && seoData.metaDescription) {
        const seoRecord = await prisma.seoMeta.create({ data: seoData as Prisma.SeoMetaCreateInput });
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
