import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { prisma, type Prisma } from "@agency/database";
import { testimonialSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { ApiError } from "../middleware/error-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { signCloudinaryUpload } from "../lib/cloudinary.js";
import { env } from "../env.js";
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

// Public "Write a review" for our service: published straight away, staff only control visibility
// afterwards. `message` is an object so a rate-limit hit still comes back as JSON.
const publicReviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 4,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many reviews submitted. Please try again later." },
});

const publicServiceReviewSchema = z.object({
  authorName: z.string().trim().min(2, "Please enter your name").max(100),
  authorCompany: z.string().trim().max(100).optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1, "Please pick a rating").max(5),
  comment: z.string().trim().min(10, "Please write at least a few words").max(600),
  website: z.string().optional(), // honeypot
  // brand / company logo, already uploaded by the browser straight to Cloudinary with a signature from /public/sign
  logo: z
    .object({
      publicId: z.string().max(300),
      url: z.string().url().max(600),
      width: z.number().int().nullable().optional(),
      height: z.number().int().nullable().optional(),
      format: z.string().max(20).nullable().optional(),
      bytes: z.number().int().max(3_000_000).nullable().optional(),
    })
    .optional(),
});

const REVIEW_LOGO_FOLDER = "agency-website/review-logos";

testimonialsRouter.post(
  "/public/sign",
  publicReviewLimiter,
  asyncHandler(async (_req, res) => {
    res.json(signCloudinaryUpload(REVIEW_LOGO_FOLDER, { allowedFormats: "jpg,jpeg,png,webp" }));
  }),
);

testimonialsRouter.post(
  "/public",
  publicReviewLimiter,
  asyncHandler(async (req, res) => {
    const data = publicServiceReviewSchema.parse(req.body);
    if (data.website) return res.status(201).json({ ok: true });

    // Only a file that really sits in our own Cloudinary review-logos folder is accepted.
    let avatarId: string | undefined;
    if (data.logo) {
      const logo = data.logo;
      const prefix = `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/`;
      if (!logo.url.startsWith(prefix) || !logo.publicId.startsWith(`${REVIEW_LOGO_FOLDER}/`) || !logo.url.includes(logo.publicId)) {
        throw new ApiError(400, "That logo file is not valid. Please upload it again.");
      }
      const media = await prisma.media.upsert({
        where: { publicId: logo.publicId },
        update: {},
        create: { publicId: logo.publicId, url: logo.url, width: logo.width ?? null, height: logo.height ?? null, format: logo.format ?? null, bytes: logo.bytes ?? null, altText: `${data.authorName} logo` },
      });
      avatarId = media.id;
    }

    await prisma.testimonial.create({
      data: {
        avatarId,
        author: data.authorName,
        company: data.authorCompany || null,
        quote: data.comment,
        rating: data.rating,
        status: "PUBLISHED",
        // new reviews appear after the hand-picked ones (admin order starts at 0)
        order: 1000,
      },
    });
    res.status(201).json({ ok: true });
  }),
);

testimonialsRouter.post(
  "/",
  requireAuth,
  requirePermission("testimonials", "create"),
  asyncHandler(async (req, res) => {
    const { projectIds, ...data } = testimonialSchema.parse(req.body);
    const createData: Prisma.TestimonialUncheckedCreateInput = {
      id: data.id,
      author: data.author,
      role: data.role,
      company: data.company,
      avatarId: data.avatarId,
      quote: data.quote,
      rating: data.rating,
      status: data.status,
      order: data.order,
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

const bulkDeleteSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });

testimonialsRouter.post(
  "/bulk-delete",
  requireAuth,
  requirePermission("testimonials", "delete"),
  asyncHandler(async (req, res) => {
    const { ids } = bulkDeleteSchema.parse(req.body);
    const { count } = await prisma.testimonial.deleteMany({ where: { id: { in: ids } } });
    res.json({ count });
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
