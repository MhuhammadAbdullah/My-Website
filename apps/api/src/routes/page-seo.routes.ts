import { Router } from "express";
import { prisma } from "@agency/database";
import { pageSeoSchema, SEO_PAGE_KEYS } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ApiError } from "../middleware/error-handler.js";

export const pageSeoRouter = Router();

const pageSeoInclude = { socialImage: true };

function assertKnownPage(page: string) {
  if (!(SEO_PAGE_KEYS as readonly string[]).includes(page)) {
    throw new ApiError(404, `Unknown page "${page}"`);
  }
}

pageSeoRouter.get(
  "/:page",
  asyncHandler(async (req, res) => {
    const page = req.params.page ?? "";
    assertKnownPage(page);
    const item = await prisma.pageSeo.findUnique({ where: { page }, include: pageSeoInclude });
    res.json({ item });
  }),
);

pageSeoRouter.put(
  "/:page",
  requireAuth,
  requirePermission("seo", "update"),
  asyncHandler(async (req, res) => {
    const page = req.params.page ?? "";
    assertKnownPage(page);
    const data = pageSeoSchema.parse(req.body);

    const item = await prisma.pageSeo.upsert({
      where: { page },
      update: data,
      create: { page, ...data },
      include: pageSeoInclude,
    });
    res.json({ item });
  }),
);
