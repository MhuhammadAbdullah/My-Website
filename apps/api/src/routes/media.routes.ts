import { Router } from "express";
import { prisma } from "@agency/database";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { destroyCloudinaryAsset, signCloudinaryUpload } from "../lib/cloudinary.js";

export const mediaRouter = Router();

mediaRouter.post(
  "/sign",
  requireAuth,
  requirePermission("media", "create"),
  asyncHandler(async (req, res) => {
    const folder = typeof req.body?.folder === "string" ? req.body.folder : "agency-website";
    res.json(signCloudinaryUpload(folder));
  }),
);

// Called by the admin's upload widget once Cloudinary confirms the upload,
// so the asset is registered in our own Media table.
mediaRouter.post(
  "/",
  requireAuth,
  requirePermission("media", "create"),
  asyncHandler(async (req, res) => {
    const { publicId, url, width, height, format, bytes, altText } = req.body;
    const item = await prisma.media.create({
      data: { publicId, url, width, height, format, bytes, altText },
    });
    res.status(201).json({ item });
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
