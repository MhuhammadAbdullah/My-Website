import { Router } from "express";
import { z } from "zod";
import { prisma } from "@agency/database";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";
import { env } from "../env.js";
import { destroyCloudinaryAsset, signCloudinaryUpload } from "../lib/cloudinary.js";

export const mediaRouter = Router();

// Generic admin image uploads: type and size are enforced on the signature
// (allowed_formats), again when the asset is registered, and in the browser.
export const ALLOWED_IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp", "avif", "gif", "svg"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const folderSchema = z.string().regex(/^[a-z0-9][a-z0-9/_-]{0,80}$/i, "Invalid folder").default("agency-website");

mediaRouter.post(
  "/sign",
  requireAuth,
  requirePermission("media", "create"),
  asyncHandler(async (req, res) => {
    const folder = folderSchema.parse(typeof req.body?.folder === "string" ? req.body.folder : undefined);
    res.json({
      ...signCloudinaryUpload(folder, { allowedFormats: ALLOWED_IMAGE_FORMATS.join(",") }),
      maxBytes: MAX_IMAGE_BYTES,
    });
  }),
);

const registerSchema = z.object({
  publicId: z.string().min(1).max(300),
  url: z.string().url().max(1000),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  format: z
    .string()
    .toLowerCase()
    .refine((f) => (ALLOWED_IMAGE_FORMATS as readonly string[]).includes(f), "Unsupported file type"),
  bytes: z.number().int().positive().max(MAX_IMAGE_BYTES, "File is larger than 10 MB").optional(),
  altText: z.string().trim().max(300).nullable().optional(),
});

// An asset may only be registered if it really lives in *our* Cloudinary
// account; otherwise a client could point the Media table at any URL.
function assertOwnCloudinaryUrl(url: string) {
  const parsed = new URL(url);
  const prefix = `/${env.CLOUDINARY_CLOUD_NAME}/`;
  if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com" || !parsed.pathname.startsWith(prefix)) {
    throw new ApiError(422, "Media URL must point to this site's Cloudinary account.");
  }
}

// Called by the admin's upload widget once Cloudinary confirms the upload,
// so the asset is registered in our own Media table.
mediaRouter.post(
  "/",
  requireAuth,
  requirePermission("media", "create"),
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    try {
      assertOwnCloudinaryUrl(data.url);
    } catch (error) {
      await destroyCloudinaryAsset(data.publicId, "image");
      throw error;
    }
    const item = await prisma.media.create({ data });
    res.status(201).json({ item });
  }),
);

// Media library listing (private identity documents are never listed).
mediaRouter.get(
  "/",
  requireAuth,
  requirePermission("media", "view"),
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const missingAlt = req.query.missingAlt === "1";
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 40;

    const and: object[] = [{ isPrivate: false }];
    if (search) {
      and.push({
        OR: [
          { publicId: { contains: search, mode: "insensitive" } },
          { altText: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    if (missingAlt) and.push({ OR: [{ altText: null }, { altText: "" }] });
    const where = { AND: and };

    const [items, total] = await Promise.all([
      prisma.media.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.media.count({ where }),
    ]);
    res.json({ items, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
  }),
);

// Alt text and focal point (0..1 from the top-left).
mediaRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("media", "update"),
  asyncHandler(async (req, res) => {
    const data = z
      .object({
        altText: z.string().trim().max(300).nullable().optional(),
        focalX: z.number().min(0).max(1).nullable().optional(),
        focalY: z.number().min(0).max(1).nullable().optional(),
      })
      .parse(req.body);
    const item = await prisma.media.update({ where: { id: req.params.id! }, data });
    res.json({ item });
  }),
);

// Replace keeps the Media id (so every page/section referencing it updates)
// and swaps the underlying asset; the old Cloudinary file is removed.
mediaRouter.post(
  "/:id/replace",
  requireAuth,
  requirePermission("media", "update"),
  asyncHandler(async (req, res) => {
    const data = registerSchema.omit({ altText: true }).parse(req.body);
    assertOwnCloudinaryUrl(data.url);
    const existing = await prisma.media.findUnique({ where: { id: req.params.id! } });
    if (!existing || existing.isPrivate) throw new ApiError(404, "Media not found");
    const item = await prisma.media.update({ where: { id: existing.id }, data });
    if (existing.publicId !== data.publicId) await destroyCloudinaryAsset(existing.publicId, "image");
    res.json({ item });
  }),
);

// Removes only the Media row, leaving the Cloudinary asset alone. Used right
// after `replace`, when the asset now belongs to another Media id.
mediaRouter.delete(
  "/:id/discard",
  requireAuth,
  requirePermission("media", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.media.deleteMany({ where: { id: req.params.id!, isPrivate: false } });
    res.status(204).send();
  }),
);

mediaRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("media", "delete"),
  asyncHandler(async (req, res) => {
    const media = await prisma.media.findUnique({ where: { id: req.params.id } });
    if (media) {
      await destroyCloudinaryAsset(media.publicId, "image");
    }
    await prisma.media.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
