import { Router } from "express";
import type { ZodObject, ZodRawShape } from "zod";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { parseListQuery, paginationMeta, searchFilter, exactFilter } from "./list-query.js";

/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma delegates are structurally
   incompatible with `unknown` args across models; this generic helper intentionally
   trades arg-shape safety for reuse across all simple CRUD resources. */
interface CrudDelegate {
  findMany: (args?: any) => Promise<unknown[]>;
  findUnique: (args: any) => Promise<unknown>;
  create: (args: any) => Promise<unknown>;
  update: (args: any) => Promise<unknown>;
  delete: (args: any) => Promise<unknown>;
  count: (args?: any) => Promise<number>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Public GET (list + single), admin-gated write, for the straightforward
 * content models (testimonials, faqs, team, affiliate tools, nav items...).
 * Relational models with nested writes (services, projects) get hand-written
 * routers instead of going through this factory.
 *
 * The admin-scoped `/admin` listing supports server-side pagination, search,
 * sort, and exact-match filters; the public `/` listing stays a flat,
 * unpaginated array (it's already status-filtered and typically small, and
 * public pages consume it directly without pagination UI).
 */
export function createCrudRouter(options: {
  resource: string;
  delegate: CrudDelegate;
  schema: ZodObject<ZodRawShape>;
  orderBy?: Record<string, "asc" | "desc">;
  publicFindManyArgs?: Record<string, unknown>;
  // Eagerly loaded relations (e.g. { avatar: true }) — kept optional since
  // most resources on this factory are flat rows with no relations to load.
  include?: Record<string, unknown>;
  // Server-side list controls for the admin `/admin` listing.
  searchFields?: string[];
  sortableFields?: string[];
  defaultSort?: string;
  filterFields?: string[];
}) {
  const {
    resource,
    delegate,
    schema,
    orderBy = { order: "asc" },
    publicFindManyArgs,
    include,
    searchFields = [],
    sortableFields = ["createdAt", "updatedAt", "order"],
    defaultSort = "order",
    filterFields = [],
  } = options;
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const items = await delegate.findMany({ orderBy, include, ...publicFindManyArgs });
      res.json({ items });
    }),
  );

  // Admin-scoped listing: bypasses the public status filter so drafts are
  // visible in the admin panel's data tables, and supports pagination/
  // search/sort/filters for the admin list toolbar.
  router.get(
    "/admin",
    requireAuth,
    requirePermission(resource, "view"),
    asyncHandler(async (req, res) => {
      const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
        sortableFields,
        defaultSort,
      });

      const where: Record<string, unknown> = { ...searchFilter(search, searchFields) };
      for (const field of filterFields) {
        Object.assign(where, exactFilter(req.query, field));
      }

      const [items, total] = await Promise.all([
        delegate.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit, include }),
        delegate.count({ where }),
      ]);

      res.json({ items, ...paginationMeta(total, page, limit) });
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const item = await delegate.findUnique({ where: { id: req.params.id }, include });
      if (!item) {
        res.status(404).json({ error: `${resource} not found` });
        return;
      }
      res.json({ item });
    }),
  );

  router.post(
    "/",
    requireAuth,
    requirePermission(resource, "create"),
    asyncHandler(async (req, res) => {
      const data = schema.parse(req.body);
      const item = await delegate.create({ data, include });
      res.status(201).json({ item });
    }),
  );

  router.patch(
    "/:id",
    requireAuth,
    requirePermission(resource, "update"),
    asyncHandler(async (req, res) => {
      const data = schema.partial().parse(req.body);
      const item = await delegate.update({ where: { id: req.params.id }, data, include });
      res.json({ item });
    }),
  );

  router.delete(
    "/:id",
    requireAuth,
    requirePermission(resource, "delete"),
    asyncHandler(async (req, res) => {
      await delegate.delete({ where: { id: req.params.id } });
      res.status(204).send();
    }),
  );

  return router;
}
