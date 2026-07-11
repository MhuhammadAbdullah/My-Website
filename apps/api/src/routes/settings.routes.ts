import { Router } from "express";
import { prisma, type Prisma } from "@agency/database";
import { socialLinksSchema, currencySchema, brandingSchema, techStackDisplaySchema } from "@agency/types";
import { isGoogleMapsUrl, extractGoogleMapsEmbedSrc } from "@agency/utils";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";

export const settingsRouter = Router();

// Settings with dedicated validation beyond "any JSON value" — checked by key
// before the generic upsert below.
const settingValidators: Record<string, (value: unknown) => Prisma.InputJsonValue> = {
  socials: (value) => socialLinksSchema.parse(value),
  currency: (value) => currencySchema.parse(value),
  branding: (value) => brandingSchema.parse(value),
  tech_stack_display: (value) => techStackDisplaySchema.parse(value),
  google_maps_embed: (value) => {
    if (!value) return "";
    if (typeof value !== "string" || !isGoogleMapsUrl(value)) {
      throw new ApiError(422, "Enter a valid Google Maps URL.");
    }
    return value;
  },
  google_maps_embed_code: (value) => {
    if (!value) return "";
    if (typeof value !== "string" || !extractGoogleMapsEmbedSrc(value)) {
      throw new ApiError(422, "Paste a valid Google Maps iframe embed code.");
    }
    return value;
  },
};

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.siteSetting.findMany();
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json({ settings });
  }),
);

settingsRouter.put(
  "/:key",
  requireAuth,
  requirePermission("settings", "update"),
  asyncHandler(async (req, res) => {
    const key = req.params.key!;
    const value = settingValidators[key] ? settingValidators[key](req.body.value) : req.body.value;

    const item = await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    res.json({ item });
  }),
);
