import { Router } from "express";
import { prisma, type Prisma } from "@agency/database";
import {
  homePageContentSchema,
  aboutPageContentSchema,
  servicesPageContentSchema,
  portfolioPageContentSchema,
  affiliateToolsPageContentSchema,
  contactPageContentSchema,
} from "@agency/types";
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
      storyHeading: data.storyHeading,
      storyButtonLabel: data.storyButtonLabel,
      storyMissionLabel: data.storyMissionLabel,
      servicesHeading: data.servicesHeading,
      servicesDescription: data.servicesDescription,
      servicesButtonLabel: data.servicesButtonLabel,
      portfolioHeading: data.portfolioHeading,
      portfolioDescription: data.portfolioDescription,
      portfolioButtonLabel: data.portfolioButtonLabel,
      processHeading: data.processHeading,
      technologiesHeading: data.technologiesHeading,
      whyHeading: data.whyHeading,
      testimonialsHeading: data.testimonialsHeading,
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
      heroHeading: data.heroHeading,
      missionLabel: data.missionLabel,
      visionLabel: data.visionLabel,
      philosophyLabel: data.philosophyLabel,
      valuesHeading: data.valuesHeading,
      timelineHeading: data.timelineHeading,
      teamHeading: data.teamHeading,
      skillsHeading: data.skillsHeading,
      certificationsHeading: data.certificationsHeading,
      technologiesHeading: data.technologiesHeading,
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

// ---------------------------------------------------------------------------
// Services / Portfolio / Affiliate Tools / Contact -- singleton hero content.
// No `seo` relation on these models (SEO stays on PageSeo, see
// page-seo.routes.ts), so these are simpler find-or-create singletons than
// /home and /about above.
// ---------------------------------------------------------------------------

pagesRouter.get(
  "/services",
  asyncHandler(async (_req, res) => {
    const item = await prisma.servicesPageContent.findFirst();
    res.json({ item });
  }),
);

pagesRouter.put(
  "/services",
  requireAuth,
  requirePermission("services", "update"),
  asyncHandler(async (req, res) => {
    const data = servicesPageContentSchema.parse(req.body);
    const existing = await prisma.servicesPageContent.findFirst();
    const item = existing
      ? await prisma.servicesPageContent.update({ where: { id: existing.id }, data })
      : await prisma.servicesPageContent.create({ data });
    res.json({ item });
  }),
);

pagesRouter.get(
  "/portfolio",
  asyncHandler(async (_req, res) => {
    const item = await prisma.portfolioPageContent.findFirst();
    res.json({ item });
  }),
);

pagesRouter.put(
  "/portfolio",
  requireAuth,
  requirePermission("portfolio", "update"),
  asyncHandler(async (req, res) => {
    const data = portfolioPageContentSchema.parse(req.body);
    const existing = await prisma.portfolioPageContent.findFirst();
    const item = existing
      ? await prisma.portfolioPageContent.update({ where: { id: existing.id }, data })
      : await prisma.portfolioPageContent.create({ data });
    res.json({ item });
  }),
);

pagesRouter.get(
  "/affiliate-tools",
  asyncHandler(async (_req, res) => {
    const item = await prisma.affiliateToolsPageContent.findFirst();
    res.json({ item });
  }),
);

pagesRouter.put(
  "/affiliate-tools",
  requireAuth,
  requirePermission("affiliate", "update"),
  asyncHandler(async (req, res) => {
    const data = affiliateToolsPageContentSchema.parse(req.body);
    const existing = await prisma.affiliateToolsPageContent.findFirst();
    const item = existing
      ? await prisma.affiliateToolsPageContent.update({ where: { id: existing.id }, data })
      : await prisma.affiliateToolsPageContent.create({ data });
    res.json({ item });
  }),
);

pagesRouter.get(
  "/contact",
  asyncHandler(async (_req, res) => {
    const item = await prisma.contactPageContent.findFirst();
    res.json({ item });
  }),
);

pagesRouter.put(
  "/contact",
  requireAuth,
  requirePermission("contact", "update"),
  asyncHandler(async (req, res) => {
    const data = contactPageContentSchema.parse(req.body);
    const existing = await prisma.contactPageContent.findFirst();
    const item = existing
      ? await prisma.contactPageContent.update({ where: { id: existing.id }, data })
      : await prisma.contactPageContent.create({ data });
    res.json({ item });
  }),
);
