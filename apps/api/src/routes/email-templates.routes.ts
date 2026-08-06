import { Router } from "express";
import { prisma, EMAIL_TEMPLATE_DEFAULTS } from "@agency/database";
import { emailTemplateUpdateSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { ensureEmailTemplatesSeeded } from "../lib/email-templates.js";

export const emailTemplatesRouter = Router();

emailTemplatesRouter.get(
  "/",
  requireAuth,
  requirePermission("emailTemplates", "view"),
  asyncHandler(async (_req, res) => {
    await ensureEmailTemplatesSeeded();
    const items = await prisma.emailTemplate.findMany({ orderBy: { name: "asc" } });
    res.json({ items });
  }),
);

emailTemplatesRouter.patch(
  "/:key",
  requireAuth,
  requirePermission("emailTemplates", "update"),
  asyncHandler(async (req, res) => {
    const key = req.params.key;
    if (!key || !(key in EMAIL_TEMPLATE_DEFAULTS)) {
      res.status(404).json({ error: "Unknown email template" });
      return;
    }
    const data = emailTemplateUpdateSchema.parse(req.body);
    const item = await prisma.emailTemplate.update({ where: { key }, data });
    res.json({ item });
  }),
);
