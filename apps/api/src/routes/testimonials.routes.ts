import { Router } from "express";
import { prisma, type Prisma } from "@agency/database";
import { testimonialSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { parseListQuery, paginationMeta, searchFilter, exactFilter } from "../lib/list-query.js";

export const testimonialsRouter = Router();

const testimonialInclude = { avatar: true, projects: true };
const testimonialsSortableFields = ["author", "company", "rating", "status", "order", "createdAt", "updatedAt"];

testimonialsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const items = await prisma.testimonial.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { order: "asc" },
      include: testimonialInclude,
    });
    res.json({ items });
  }),
);

testimonialsRouter.get(
  "/admin",
  requireAuth,
  requirePermission("testimonials", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: testimonialsSortableFields,
      defaultSort: "order",
    });

    const where = {
      ...searchFilter(search, ["author", "company", "quote"]),
      ...exactFilter(req.query, "status"),
    } as Prisma.TestimonialWhereInput;

    const [items, total] = await Promise.all([
      prisma.testimonial.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit, include: testimonialInclude }),
      prisma.testimonial.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

testimonialsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await prisma.testimonial.findUnique({
      where: { id: req.params.id },
      include: testimonialInclude,
    });
    if (!item) {
      res.status(404).json({ error: "Testimonial not found" });
      return;
    }
    res.json({ item });
  }),
);

testimonialsRouter.post(
  "/",
  requireAuth,
  requirePermission("testimonials", "create"),
  asyncHandler(async (req, res) => {
    const { projectIds, ...data } = testimonialSchema.parse(req.body);
    const createData: Prisma.TestimonialUncheckedCreateInput = {
      ...data,
      projects: { connect: projectIds.map((id) => ({ id })) },
    };
    const item = await prisma.testimonial.create({ data: createData, include: testimonialInclude });
    res.status(201).json({ item });
  }),
);

testimonialsRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("testimonials", "update"),
  asyncHandler(async (req, res) => {
    const { projectIds, ...data } = testimonialSchema.partial().parse(req.body);
    const updateData: Prisma.TestimonialUncheckedUpdateInput = {
      ...data,
      ...(projectIds ? { projects: { set: projectIds.map((id) => ({ id })) } } : {}),
    };
    const item = await prisma.testimonial.update({
      where: { id: req.params.id },
      data: updateData,
      include: testimonialInclude,
    });
    res.json({ item });
  }),
);

testimonialsRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("testimonials", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.testimonial.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
