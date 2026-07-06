import { Router } from "express";
import { prisma } from "@agency/database";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";

export const skillsRouter = Router();

skillsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ items: await prisma.skill.findMany({ orderBy: { order: "asc" } }) });
  }),
);

skillsRouter.post(
  "/",
  requireAuth,
  requirePermission("team", "create"),
  asyncHandler(async (req, res) => {
    res.status(201).json({ item: await prisma.skill.create({ data: req.body }) });
  }),
);

skillsRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("team", "update"),
  asyncHandler(async (req, res) => {
    res.json({ item: await prisma.skill.update({ where: { id: req.params.id }, data: req.body }) });
  }),
);

skillsRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("team", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.skill.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
