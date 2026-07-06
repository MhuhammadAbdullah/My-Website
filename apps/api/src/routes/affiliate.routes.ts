import { Router } from "express";
import { prisma, type Prisma } from "@agency/database";
import { affiliateToolSchema, affiliateToolsQuerySchema, affiliateCategorySchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { parseListQuery, paginationMeta, searchFilter, exactFilter, booleanFilter } from "../lib/list-query.js";

export const affiliateRouter = Router();

const affiliateToolsSortableFields = ["name", "status", "order", "createdAt", "updatedAt"];
const affiliateCategorySortableFields = ["name", "order", "createdAt", "updatedAt"];

affiliateRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const items = await prisma.affiliateCategory.findMany({
      where: { isEnabled: true },
      orderBy: { order: "asc" },
      include: { tools: { where: { status: "PUBLISHED" }, orderBy: { order: "asc" } } },
    });
    res.json({ items });
  }),
);

// Paginated variant for the admin Categories page's own table — the plain
// "/categories" list above stays enabled-only since it's reused elsewhere as
// a dropdown source (the Affiliate Tool editor) that should only offer
// selectable categories.
affiliateRouter.get(
  "/categories/admin",
  requireAuth,
  requirePermission("affiliate", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: affiliateCategorySortableFields,
      defaultSort: "order",
    });
    const where = searchFilter(search, ["name"]);
    const [items, total] = await Promise.all([
      prisma.affiliateCategory.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.affiliateCategory.count({ where }),
    ]);
    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

affiliateRouter.post(
  "/categories",
  requireAuth,
  requirePermission("affiliate", "create"),
  asyncHandler(async (req, res) => {
    const data = affiliateCategorySchema.parse(req.body);
    const item = await prisma.affiliateCategory.create({ data });
    res.status(201).json({ item });
  }),
);

affiliateRouter.patch(
  "/categories/:id",
  requireAuth,
  requirePermission("affiliate", "update"),
  asyncHandler(async (req, res) => {
    const data = affiliateCategorySchema.partial().parse(req.body);
    const item = await prisma.affiliateCategory.update({ where: { id: req.params.id }, data });
    res.json({ item });
  }),
);

affiliateRouter.delete(
  "/categories/:id",
  requireAuth,
  requirePermission("affiliate", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.affiliateCategory.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

affiliateRouter.get(
  "/tools",
  asyncHandler(async (req, res) => {
    const query = affiliateToolsQuerySchema.parse(req.query);
    const where = {
      status: "PUBLISHED" as const,
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.featured !== undefined ? { isFeatured: query.featured } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { description: { contains: query.search, mode: "insensitive" as const } },
              { category: { name: { contains: query.search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.affiliateTool.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { category: true, logo: true },
      }),
      prisma.affiliateTool.count({ where }),
    ]);

    res.json({
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    });
  }),
);

affiliateRouter.get(
  "/tools/admin",
  requireAuth,
  requirePermission("affiliate", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: affiliateToolsSortableFields,
      defaultSort: "order",
    });

    const where = {
      ...searchFilter(search, ["name", "description"]),
      ...exactFilter(req.query, "status"),
      ...exactFilter(req.query, "categoryId"),
      ...booleanFilter(req.query, "isFeatured"),
    } as Prisma.AffiliateToolWhereInput;

    const [items, total] = await Promise.all([
      prisma.affiliateTool.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: { category: true },
      }),
      prisma.affiliateTool.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

affiliateRouter.post(
  "/tools",
  requireAuth,
  requirePermission("affiliate", "create"),
  asyncHandler(async (req, res) => {
    const data = affiliateToolSchema.parse(req.body);
    const item = await prisma.affiliateTool.create({ data, include: { category: true } });
    res.status(201).json({ item });
  }),
);

affiliateRouter.patch(
  "/tools/:id",
  requireAuth,
  requirePermission("affiliate", "update"),
  asyncHandler(async (req, res) => {
    const data = affiliateToolSchema.partial().parse(req.body);
    const item = await prisma.affiliateTool.update({ where: { id: req.params.id }, data, include: { category: true } });
    res.json({ item });
  }),
);

affiliateRouter.delete(
  "/tools/:id",
  requireAuth,
  requirePermission("affiliate", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.affiliateTool.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
