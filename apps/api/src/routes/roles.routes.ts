import { Router } from "express";
import { APIError } from "better-auth/api";
import { auth } from "@agency/auth/server";
import { prisma } from "@agency/database";
import { roleSchema, createUserSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";

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
      data: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
      },
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

const userSelect = { id: true, name: true, email: true, banned: true, createdAt: true, role: true } as const;

// Goes through the same signUpEmail flow a self-service sign-up would (so
// the Account row gets a correctly-hashed password via Better Auth, not a
// hand-rolled one) rather than inserting the User row directly -- mirrors
// influencer-applications.routes.ts's identical pattern for the influencer
// auth instance. `roleId` is this app's own RBAC extension on top of
// Better Auth's base User (see schema.prisma's User model comment), so
// it's set in a separate, immediate follow-up update.
usersRouter.post(
  "/",
  requirePermission("users", "create"),
  asyncHandler(async (req, res) => {
    const data = createUserSchema.parse(req.body);

    let userId: string;
    try {
      const result = await auth.api.signUpEmail({ body: { name: data.name, email: data.email, password: data.password } });
      userId = result.user.id;
    } catch (error) {
      if (error instanceof APIError) {
        throw new ApiError(error.statusCode ?? 400, error.body?.message ?? "Could not create the user.");
      }
      throw error;
    }

    // Admin-created accounts skip email verification -- there's no
    // self-service signup flow to verify against, admin already vouched
    // for this address by creating the account.
    const item = await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, roleId: data.roleId ?? null },
      select: userSelect,
    });
    res.status(201).json({ item });
  }),
);

usersRouter.patch(
  "/:id",
  requirePermission("users", "update"),
  asyncHandler(async (req, res) => {
    const { roleId, banned } = req.body;
    const item = await prisma.user.update({ where: { id: req.params.id }, data: { roleId, banned }, select: userSelect });
    res.json({ item });
  }),
);
