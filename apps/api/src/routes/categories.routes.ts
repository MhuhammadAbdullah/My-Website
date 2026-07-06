import { Router } from "express";
import type { Request, Response } from "express";
import { prisma } from "@agency/database";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { parseListQuery, paginationMeta, searchFilter } from "../lib/list-query.js";

export const categoriesRouter = Router();

const categorySortableFields = ["name", "order", "createdAt", "updatedAt"];

// These three category-like resources (services/projects/technologies) have
// never had zod-validated writes -- POST already passes req.body straight
// through. PATCH keeps that same trust level, just whitelisted to the fields
// this generic edit/toggle UI can actually send.
function pickCategoryFields(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name;
  if (typeof body.slug === "string") data.slug = body.slug;
  if (typeof body.order === "number") data.order = body.order;
  if (typeof body.isEnabled === "boolean") data.isEnabled = body.isEnabled;
  return data;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- same generic-delegate tradeoff as create-crud-router.ts */
async function paginatedCategoryList(
  req: Request,
  res: Response,
  delegate: { findMany: (args: any) => Promise<unknown[]>; count: (args: any) => Promise<number> },
) {
  const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
    sortableFields: categorySortableFields,
    defaultSort: "order",
  });
  const where = searchFilter(search, ["name"]);
  const [items, total] = await Promise.all([
    delegate.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
    delegate.count({ where }),
  ]);
  res.json({ items, ...paginationMeta(total, page, limit) });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

categoriesRouter.get(
  "/services",
  asyncHandler(async (_req, res) => {
    res.json({ items: await prisma.serviceCategory.findMany({ where: { isEnabled: true }, orderBy: { order: "asc" } }) });
  }),
);
// Paginated variant for the admin Categories page's own table — the plain
// "/services" list above stays a flat array since it's reused elsewhere as a
// dropdown source (service/portfolio editors) that expects every category.
categoriesRouter.get(
  "/services/admin",
  requireAuth,
  requirePermission("categories", "view"),
  asyncHandler((req, res) => paginatedCategoryList(req, res, prisma.serviceCategory)),
);
categoriesRouter.post(
  "/services",
  requireAuth,
  requirePermission("categories", "create"),
  asyncHandler(async (req, res) => {
    res.status(201).json({ item: await prisma.serviceCategory.create({ data: req.body }) });
  }),
);
categoriesRouter.patch(
  "/services/:id",
  requireAuth,
  requirePermission("categories", "update"),
  asyncHandler(async (req, res) => {
    const data = pickCategoryFields(req.body);
    res.json({ item: await prisma.serviceCategory.update({ where: { id: req.params.id }, data }) });
  }),
);
categoriesRouter.delete(
  "/services/:id",
  requireAuth,
  requirePermission("categories", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.serviceCategory.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

categoriesRouter.get(
  "/projects",
  asyncHandler(async (_req, res) => {
    res.json({ items: await prisma.projectCategory.findMany({ where: { isEnabled: true }, orderBy: { order: "asc" } }) });
  }),
);
categoriesRouter.get(
  "/projects/admin",
  requireAuth,
  requirePermission("categories", "view"),
  asyncHandler((req, res) => paginatedCategoryList(req, res, prisma.projectCategory)),
);
categoriesRouter.post(
  "/projects",
  requireAuth,
  requirePermission("categories", "create"),
  asyncHandler(async (req, res) => {
    res.status(201).json({ item: await prisma.projectCategory.create({ data: req.body }) });
  }),
);
categoriesRouter.patch(
  "/projects/:id",
  requireAuth,
  requirePermission("categories", "update"),
  asyncHandler(async (req, res) => {
    const data = pickCategoryFields(req.body);
    res.json({ item: await prisma.projectCategory.update({ where: { id: req.params.id }, data }) });
  }),
);
categoriesRouter.delete(
  "/projects/:id",
  requireAuth,
  requirePermission("categories", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.projectCategory.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

categoriesRouter.get(
  "/technologies",
  asyncHandler(async (_req, res) => {
    res.json({ items: await prisma.technology.findMany({ where: { isEnabled: true }, orderBy: { order: "asc" } }) });
  }),
);
categoriesRouter.get(
  "/technologies/admin",
  requireAuth,
  requirePermission("categories", "view"),
  asyncHandler((req, res) => paginatedCategoryList(req, res, prisma.technology)),
);
categoriesRouter.post(
  "/technologies",
  requireAuth,
  requirePermission("categories", "create"),
  asyncHandler(async (req, res) => {
    res.status(201).json({ item: await prisma.technology.create({ data: { category: "TOOL", ...req.body } }) });
  }),
);
categoriesRouter.patch(
  "/technologies/:id",
  requireAuth,
  requirePermission("categories", "update"),
  asyncHandler(async (req, res) => {
    const data = pickCategoryFields(req.body);
    res.json({ item: await prisma.technology.update({ where: { id: req.params.id }, data }) });
  }),
);
categoriesRouter.delete(
  "/technologies/:id",
  requireAuth,
  requirePermission("categories", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.technology.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
