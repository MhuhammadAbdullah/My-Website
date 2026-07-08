import { Router } from "express";
import { prisma, type Prisma } from "@agency/database";
import { serviceSchema } from "@agency/types";
import { DEFAULT_CURRENCY } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";
import { parseListQuery, paginationMeta, searchFilter, exactFilter, booleanFilter } from "../lib/list-query.js";

export const servicesRouter = Router();

const servicePublicInclude = {
  category: true,
  heroMedia: true,
  seo: true,
  technologies: true,
  pricingPlans: { orderBy: { order: "asc" as const } },
  faqs: true,
  testimonials: true,
  // Rendered on the frontend via <ServiceCard>, which reads .category and
  // .pricingPlans off each related service (see ServiceListItem) -- without
  // these nested includes those fields come back undefined, not just empty,
  // and ServiceCard's cheapestPlan() crashes calling .filter() on undefined.
  relatedTo: {
    where: { status: "PUBLISHED" as const },
    include: { category: true, heroMedia: true, pricingPlans: { orderBy: { order: "asc" as const } } },
  },
};

// Pricing fields validate against each other (regularPrice required unless
// the plan is a custom quote, discount must undercut the regular price) —
// this can't live in the Zod schema itself since that schema is also used
// via `.partial()` for PATCH, and a cross-field `.superRefine` would lose
// `.partial()` support. Applied per-plan since pricing plans are the sole
// pricing mechanism now (no more Service-level toggle).
function assertValidPricingPlan(plan: {
  name: string;
  regularPrice?: number | null;
  discountPrice?: number | null;
  isCustomQuote: boolean;
}) {
  if (!plan.isCustomQuote && plan.regularPrice == null) {
    throw new ApiError(400, `Regular price is required for plan "${plan.name}".`);
  }
  if (plan.discountPrice != null) {
    if (plan.isCustomQuote || plan.regularPrice == null) {
      throw new ApiError(400, `Plan "${plan.name}" cannot have a discount price without a regular price.`);
    }
    if (plan.discountPrice >= plan.regularPrice) {
      throw new ApiError(400, `Discount price must be less than the regular price for plan "${plan.name}".`);
    }
  }
}

async function getGlobalCurrency(): Promise<string> {
  const setting = await prisma.siteSetting.findUnique({ where: { key: "currency" } });
  return typeof setting?.value === "string" ? setting.value : DEFAULT_CURRENCY;
}

servicesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [items, globalCurrency] = await Promise.all([
      prisma.service.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { order: "asc" },
        include: { category: true, heroMedia: true, pricingPlans: { orderBy: { order: "asc" } } },
      }),
      getGlobalCurrency(),
    ]);
    // Resolve each plan's effective currency (its own override, else the
    // site-wide default) so the frontend never has to know about the fallback.
    const resolved = items.map((item) => ({
      ...item,
      pricingPlans: item.pricingPlans.map((p) => ({ ...p, currency: p.currency ?? globalCurrency })),
    }));
    res.json({ items: resolved });
  }),
);

const servicesSortableFields = ["name", "status", "order", "createdAt", "updatedAt"];

servicesRouter.get(
  "/admin",
  requireAuth,
  requirePermission("services", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: servicesSortableFields,
      defaultSort: "order",
    });

    const where = {
      ...searchFilter(search, ["name", "tagline", "description"]),
      ...exactFilter(req.query, "status"),
      ...exactFilter(req.query, "categoryId"),
      ...booleanFilter(req.query, "isFeatured"),
    } as Prisma.ServiceWhereInput;

    const [items, total] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: { category: true, seo: true, technologies: true, pricingPlans: { orderBy: { order: "asc" } } },
      }),
      prisma.service.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

servicesRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const [item, globalCurrency] = await Promise.all([
      prisma.service.findUnique({
        where: { slug: req.params.slug },
        include: servicePublicInclude,
      }),
      getGlobalCurrency(),
    ]);
    if (!item) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    res.json({
      item: {
        ...item,
        pricingPlans: item.pricingPlans.map((p) => ({ ...p, currency: p.currency ?? globalCurrency })),
        relatedTo: item.relatedTo.map((related) => ({
          ...related,
          pricingPlans: related.pricingPlans.map((p) => ({ ...p, currency: p.currency ?? globalCurrency })),
        })),
      },
    });
  }),
);

servicesRouter.post(
  "/",
  requireAuth,
  requirePermission("services", "create"),
  asyncHandler(async (req, res) => {
    const { technologyIds, faqIds, relatedServiceIds, pricingPlans, seo, ...data } = serviceSchema.parse(req.body);
    pricingPlans.forEach(assertValidPricingPlan);
    const seoRecord = await prisma.seoMeta.create({ data: seo as Prisma.SeoMetaCreateInput });
    const createData: Prisma.ServiceUncheckedCreateInput = {
      id: data.id,
      categoryId: data.categoryId,
      name: data.name,
      slug: data.slug,
      tagline: data.tagline,
      description: data.description,
      benefits: data.benefits,
      process: data.process,
      deliverables: data.deliverables,
      timeline: data.timeline,
      status: data.status,
      isFeatured: data.isFeatured,
      order: data.order,
      technologies: { connect: technologyIds.map((id) => ({ id })) },
      faqs: { connect: faqIds.map((id) => ({ id })) },
      relatedTo: { connect: relatedServiceIds.map((id) => ({ id })) },
      pricingPlans: {
        create: pricingPlans.map((p) => ({
          name: p.name,
          regularPrice: p.regularPrice,
          discountPrice: p.discountPrice,
          billingType: p.billingType,
          priceLabel: p.priceLabel,
          currency: p.currency,
          features: p.features,
          isFeatured: p.isFeatured,
          isCustomQuote: p.isCustomQuote,
          ctaLabel: p.ctaLabel,
          ctaHref: p.ctaHref,
          order: p.order,
        })),
      },
      seoId: seoRecord.id,
    };
    const item = await prisma.service.create({ data: createData });
    res.status(201).json({ item });
  }),
);

servicesRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("services", "update"),
  asyncHandler(async (req, res) => {
    const { technologyIds, faqIds, relatedServiceIds, pricingPlans, seo, ...data } = serviceSchema
      .partial()
      .parse(req.body);

    const serviceId = req.params.id!;

    const existing = await prisma.service.findUnique({ where: { id: serviceId }, select: { id: true } });
    if (!existing) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    // pricingPlans, when present, is always a full-replacement array (see the
    // deleteMany + createMany below) — not a partial patch merged with
    // existing rows — so each incoming plan is validated in full.
    pricingPlans?.forEach(assertValidPricingPlan);

    // seo is updated separately via its scalar seoId FK below — see the
    // matching comment in projects.routes.ts for why mixing a nested
    // `seo: { update }` relation write into an Unchecked update breaks at
    // runtime.
    const updateData: Prisma.ServiceUncheckedUpdateInput = {
      ...data,
      ...(technologyIds ? { technologies: { set: technologyIds.map((id) => ({ id })) } } : {}),
      ...(faqIds ? { faqs: { set: faqIds.map((id) => ({ id })) } } : {}),
      ...(relatedServiceIds ? { relatedTo: { set: relatedServiceIds.map((id) => ({ id })) } } : {}),
    };
    const item = await prisma.service.update({ where: { id: serviceId }, data: updateData });

    if (seo) {
      if (item.seoId) {
        await prisma.seoMeta.update({ where: { id: item.seoId }, data: seo as Prisma.SeoMetaUpdateInput });
      } else {
        const seoRecord = await prisma.seoMeta.create({ data: seo as Prisma.SeoMetaCreateInput });
        await prisma.service.update({ where: { id: serviceId }, data: { seoId: seoRecord.id } });
      }
    }

    if (pricingPlans) {
      await prisma.pricingPlan.deleteMany({ where: { serviceId } });
      await prisma.pricingPlan.createMany({
        data: pricingPlans.map((p) => ({
          serviceId,
          name: p.name,
          regularPrice: p.regularPrice,
          discountPrice: p.discountPrice,
          billingType: p.billingType,
          priceLabel: p.priceLabel,
          currency: p.currency,
          features: p.features,
          isFeatured: p.isFeatured,
          isCustomQuote: p.isCustomQuote,
          ctaLabel: p.ctaLabel,
          ctaHref: p.ctaHref,
          order: p.order,
        })),
      });
    }

    res.json({ item });
  }),
);

servicesRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("services", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.service.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
