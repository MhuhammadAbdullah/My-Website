import { Router } from "express";
import { prisma } from "@agency/database";
import { roleSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";

export const rolesRouter = Router();
export const permissionsRouter = Router();
export const usersRouter = Router();

rolesRouter.use(requireAuth);

rolesRouter.get(
  "/",
  requirePermission("roles", "view"),
  asyncHandler(async (_req, res) => {
    const items = await prisma.role.findMany({ include: { permissions: { include: { permission: true } } } });
    res.json({ items });
  }),
);

rolesRouter.post(
  "/",
  requirePermission("roles", "create"),
  asyncHandler(async (req, res) => {
    const { permissionIds, ...data } = roleSchema.parse(req.body);
    const item = await prisma.role.create({
      data: { ...data, permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) } },
    });
    res.status(201).json({ item });
  }),
);

rolesRouter.patch(
  "/:id",
  requirePermission("roles", "update"),
  asyncHandler(async (req, res) => {
    const roleId = req.params.id!;
    const { permissionIds, ...data } = roleSchema.partial().parse(req.body);
    if (permissionIds) {
      await prisma.rolePermission.deleteMany({ where: { roleId } });
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      });
    }
    const item = await prisma.role.update({ where: { id: roleId }, data });
    res.json({ item });
  }),
);

rolesRouter.delete(
  "/:id",
  requirePermission("roles", "delete"),
  asyncHandler(async (req, res) => {
    const role = await prisma.role.findUnique({ where: { id: req.params.id } });
    if (role?.isSystem) {
      res.status(400).json({ error: "System roles cannot be deleted" });
      return;
    }
    await prisma.role.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);

permissionsRouter.get(
  "/",
  requireAuth,
  requirePermission("permissions", "view"),
  asyncHandler(async (_req, res) => {
    res.json({ items: await prisma.permission.findMany({ orderBy: { resource: "asc" } }) });
  }),
);

usersRouter.use(requireAuth);

usersRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    res.json({ permissions: Array.from(req.user?.permissions ?? []) });
  }),
);

usersRouter.get(
  "/",
  requirePermission("users", "view"),
  asyncHandler(async (_req, res) => {
    const items = await prisma.user.findMany({
      select: { id: true, name: true, email: true, banned: true, createdAt: true, role: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  }),
);

usersRouter.patch(
  "/:id",
  requirePermission("users", "update"),
  asyncHandler(async (req, res) => {
    const { roleId, banned } = req.body;
    const item = await prisma.user.update({ where: { id: req.params.id }, data: { roleId, banned } });
    res.json({ item });
  }),
);
