import { Router } from "express";
import { prisma, Prisma } from "@agency/database";
import { teamMemberSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { parseListQuery, paginationMeta, searchFilter, exactFilter } from "../lib/list-query.js";

export const teamRouter = Router();

const teamSortableFields = ["name", "role", "status", "order", "createdAt", "updatedAt"];

teamRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const items = await prisma.teamMember.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { order: "asc" },
      include: { skills: true, avatar: true },
    });
    res.json({ items });
  }),
);

// Admin-scoped listing: sees every status (draft/published), with
// pagination/search/sort/filters for the admin list toolbar.
teamRouter.get(
  "/admin",
  requireAuth,
  requirePermission("team", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: teamSortableFields,
      defaultSort: "order",
    });

    const where = {
      ...searchFilter(search, ["name", "role", "bio"]),
      ...exactFilter(req.query, "status"),
    } as Prisma.TeamMemberWhereInput;

    const [items, total] = await Promise.all([
      prisma.teamMember.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: { skills: true, avatar: true },
      }),
      prisma.teamMember.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

teamRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = await prisma.teamMember.findUnique({
      where: { id: req.params.id },
      include: { skills: true, avatar: true },
    });
    if (!item) {
      res.status(404).json({ error: "Team member not found" });
      return;
    }
    res.json({ item });
  }),
);

teamRouter.post(
  "/",
  requireAuth,
  requirePermission("team", "create"),
  asyncHandler(async (req, res) => {
    const { skillIds, socials, ...data } = teamMemberSchema.parse(req.body);
    const createData: Prisma.TeamMemberUncheckedCreateInput = {
      id: data.id,
      name: data.name,
      role: data.role,
      bio: data.bio,
      avatarId: data.avatarId,
      status: data.status,
      order: data.order,
      socials: socials === null ? Prisma.JsonNull : socials,
      skills: { connect: skillIds.map((id) => ({ id })) },
    };
    const item = await prisma.teamMember.create({ data: createData });
    res.status(201).json({ item });
  }),
);

teamRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("team", "update"),
  asyncHandler(async (req, res) => {
    const { skillIds, socials, ...data } = teamMemberSchema.partial().parse(req.body);
    const updateData: Prisma.TeamMemberUncheckedUpdateInput = {
      ...data,
      // Only touch `socials` when the client actually sent the key — an
      // absent key (e.g. saving just a new profile image) must never wipe
      // out social links that already exist.
      ...(socials !== undefined ? { socials: socials === null ? Prisma.JsonNull : socials } : {}),
      ...(skillIds ? { skills: { set: skillIds.map((id) => ({ id })) } } : {}),
    };
    const item = await prisma.teamMember.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json({ item });
  }),
);

teamRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("team", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.teamMember.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
