import { Router } from "express";
import { prisma, Prisma } from "@agency/database";
import { financeSettingsSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";

export const financeSettingsRouter = Router();

financeSettingsRouter.get(
  "/",
  requireAuth,
  requirePermission("financeSettings", "view"),
  asyncHandler(async (_req, res) => {
    const item = (await prisma.financeSettings.findFirst()) ?? (await prisma.financeSettings.create({ data: {} }));
    res.json({ item });
  }),
);

financeSettingsRouter.put(
  "/",
  requireAuth,
  requirePermission("financeSettings", "update"),
  asyncHandler(async (req, res) => {
    const { bankingDetails, ...rest } = financeSettingsSchema.parse(req.body);
    // Nullable Json columns need Prisma's JsonNull sentinel to actually store
    // a null -- a bare `null` throws PrismaClientValidationError (Prisma
    // can't tell "clear it" apart from "field omitted" otherwise).
    const data = {
      ...rest,
      bankingDetails: bankingDetails === null ? Prisma.JsonNull : (bankingDetails as Prisma.InputJsonValue | undefined),
    };
    const existing = await prisma.financeSettings.findFirst();
    const item = existing
      ? await prisma.financeSettings.update({ where: { id: existing.id }, data })
      : await prisma.financeSettings.create({ data });
    res.json({ item });
  }),
);
