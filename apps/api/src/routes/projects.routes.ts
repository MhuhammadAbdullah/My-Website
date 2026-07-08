import { Router } from "express";
import { prisma, type Prisma } from "@agency/database";
import { projectSchema } from "@agency/types";
import { paginationQuerySchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requireAnyPermission, requirePermission } from "../middleware/require-auth.js";
import { destroyCloudinaryAsset, signCloudinaryUpload } from "../lib/cloudinary.js";
import { parseListQuery, paginationMeta, searchFilter, exactFilter, booleanFilter } from "../lib/list-query.js";

export const projectsRouter = Router();

const projectPublicInclude = {
  category: true,
  techStack: true,
  gallery: { orderBy: { order: "asc" as const } },
  testimonials: { where: { status: "PUBLISHED" as const }, include: { avatar: true } },
  seo: true,
  // Rendered on the frontend via <ProjectCard>, which reads .gallery[0] and
  // .category off each related project (see ProjectListItem) -- without
  // these nested includes those fields come back undefined, not just empty,
  // and ProjectCard crashes reading .gallery[0] off undefined.
  relatedTo: {
    where: { status: "PUBLISHED" as const },
    include: { category: true, gallery: { take: 1, orderBy: { order: "asc" as const } } },
  },
};

projectsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = paginationQuerySchema.parse(req.query);
    const where = {
      status: "PUBLISHED" as const,
      ...(query.category ? { category: { slug: query.category } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" as const } },
              { summary: { contains: query.search, mode: "insensitive" as const } },
              { client: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { order: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { category: true, gallery: { take: 1, orderBy: { order: "asc" } } },
      }),
      prisma.project.count({ where }),
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

const projectsSortableFields = ["title", "status", "order", "createdAt", "updatedAt"];

projectsRouter.get(
  "/admin",
  requireAuth,
  requirePermission("projects", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: projectsSortableFields,
      defaultSort: "order",
      // /projects/admin doubles as a cross-referencing source (e.g. the
      // Testimonials "related projects" picker), which needs every project
      // in one page — callers there pass a high explicit limit.
      defaultLimit: 10,
    });

    const where = {
      ...searchFilter(search, ["title", "summary", "client"]),
      ...exactFilter(req.query, "status"),
      ...exactFilter(req.query, "categoryId"),
      ...booleanFilter(req.query, "isFeatured"),
    } as Prisma.ProjectWhereInput;

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: { category: true, seo: true },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

// Signs a direct-to-Cloudinary upload for the Portfolio Project form (images
// and video) — the admin never has to leave the project form or touch the
// Media Library to attach project media.
projectsRouter.post(
  "/media/sign",
  requireAuth,
  requireAnyPermission(["projects", "create"], ["projects", "update"]),
  asyncHandler(async (_req, res) => {
    res.json(signCloudinaryUpload("agency-website/projects"));
  }),
);

projectsRouter.get(
  "/:slug",
  asyncHandler(async (req, res) => {
    const item = await prisma.project.findUnique({
      where: { slug: req.params.slug },
      include: projectPublicInclude,
    });
    if (!item) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json({ item });
  }),
);

projectsRouter.post(
  "/",
  requireAuth,
  requirePermission("projects", "create"),
  asyncHandler(async (req, res) => {
    const { techStackIds, relatedProjectIds, gallery, seo, ...data } = projectSchema.parse(req.body);
    const seoRecord = await prisma.seoMeta.create({ data: seo as Prisma.SeoMetaCreateInput });
    const createData: Prisma.ProjectUncheckedCreateInput = {
      ...data,
      techStack: { connect: techStackIds.map((id) => ({ id })) },
      relatedTo: { connect: relatedProjectIds.map((id) => ({ id })) },
      gallery: {
        create: gallery.map((image, order) => ({
          url: image.url,
          publicId: image.publicId,
          width: image.width ?? null,
          height: image.height ?? null,
          caption: image.caption ?? null,
          order,
        })),
      },
      seoId: seoRecord.id,
    };
    const item = await prisma.project.create({ data: createData });
    res.status(201).json({ item });
  }),
);

projectsRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("projects", "update"),
  asyncHandler(async (req, res) => {
    const { techStackIds, relatedProjectIds, gallery, seo, ...data } = projectSchema.partial().parse(req.body);

    const projectId = req.params.id!;

    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      select: { videoPublicId: true, gallery: { select: { publicId: true } } },
    });
    if (!existing) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // seo is updated separately via its scalar seoId FK below — mixing a nested
    // `seo: { update }` relation write into an otherwise-Unchecked update (which
    // is required for the plain `categoryId` scalar + techStack/relatedTo `set`)
    // makes Prisma reject the whole call at runtime with a confusing "Unknown
    // argument `categoryId`" error, since `seo: { update }` only exists on the
    // Checked update input.
    const updateData: Prisma.ProjectUncheckedUpdateInput = {
      ...data,
      ...(techStackIds ? { techStack: { set: techStackIds.map((id) => ({ id })) } } : {}),
      ...(relatedProjectIds ? { relatedTo: { set: relatedProjectIds.map((id) => ({ id })) } } : {}),
    };
    const item = await prisma.project.update({ where: { id: projectId }, data: updateData });

    if (seo) {
      if (item.seoId) {
        await prisma.seoMeta.update({ where: { id: item.seoId }, data: seo as Prisma.SeoMetaUpdateInput });
      } else {
        const seoRecord = await prisma.seoMeta.create({ data: seo as Prisma.SeoMetaCreateInput });
        await prisma.project.update({ where: { id: projectId }, data: { seoId: seoRecord.id } });
      }
    }

    // The old video was replaced or removed — drop it from Cloudinary so it
    // doesn't linger as an orphaned (and billable) asset.
    if (data.videoPublicId !== undefined && existing.videoPublicId && existing.videoPublicId !== data.videoPublicId) {
      await destroyCloudinaryAsset(existing.videoPublicId, "video");
    }

    if (gallery) {
      const keptPublicIds = new Set(gallery.map((image) => image.publicId));
      const removedPublicIds = existing.gallery
        .map((image) => image.publicId)
        .filter((publicId) => !keptPublicIds.has(publicId));
      await Promise.all(removedPublicIds.map((publicId) => destroyCloudinaryAsset(publicId, "image")));

      await prisma.projectImage.deleteMany({ where: { projectId } });
      await prisma.projectImage.createMany({
        data: gallery.map((image, order) => ({
          projectId,
          url: image.url,
          publicId: image.publicId,
          width: image.width ?? null,
          height: image.height ?? null,
          caption: image.caption ?? null,
          order,
        })),
      });
    }

    res.json({ item });
  }),
);

projectsRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("projects", "delete"),
  asyncHandler(async (req, res) => {
    const projectId = req.params.id!;
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      select: { videoPublicId: true, gallery: { select: { publicId: true } } },
    });

    await prisma.project.delete({ where: { id: projectId } });

    if (existing) {
      await Promise.all([
        ...existing.gallery.map((image) => destroyCloudinaryAsset(image.publicId, "image")),
        existing.videoPublicId ? destroyCloudinaryAsset(existing.videoPublicId, "video") : Promise.resolve(),
      ]);
    }

    res.status(204).send();
  }),
);
