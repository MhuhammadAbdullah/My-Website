import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { prisma } from "@agency/database";
import { contactSubmissionSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAuth, requirePermission } from "../middleware/require-auth.js";
import { sendContactNotificationEmail } from "../lib/mailer.js";
import { parseListQuery, paginationMeta, searchFilter, exactFilter } from "../lib/list-query.js";

export const contactRouter = Router();

const bulkDeleteSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });

const contactSortableFields = ["name", "email", "status", "createdAt", "updatedAt"];

// Tighter limit on the public write endpoint specifically — this is the
// most likely target for spam/abuse on the whole API.
const contactFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

contactRouter.post(
  "/",
  contactFormLimiter,
  asyncHandler(async (req, res) => {
    const data = contactSubmissionSchema.parse(req.body);
    const submission = await prisma.contactSubmission.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        country: data.country,
        city: data.city,
        budget: data.budget || null,
        message: data.message,
        source: data.source,
      },
    });
    res.status(201).json({ item: submission });

    // Notification is best-effort — a broken mail config should never fail
    // the submission itself, so this runs after the response is sent.
    void sendContactNotificationEmail(submission);
  }),
);

contactRouter.get(
  "/",
  requireAuth,
  requirePermission("settings", "view"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: contactSortableFields,
      defaultSort: "createdAt",
    });

    const where = {
      ...searchFilter(search, ["name", "email", "message"]),
      ...exactFilter(req.query, "status"),
      ...exactFilter(req.query, "country"),
    };

    const [items, total] = await Promise.all([
      prisma.contactSubmission.findMany({ where, orderBy: { [sortBy]: sortOrder }, skip, take: limit }),
      prisma.contactSubmission.count({ where }),
    ]);

    res.json({ items, ...paginationMeta(total, page, limit) });
  }),
);

contactRouter.patch(
  "/:id",
  requireAuth,
  requirePermission("settings", "update"),
  asyncHandler(async (req, res) => {
    const item = await prisma.contactSubmission.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    res.json({ item });
  }),
);

contactRouter.post(
  "/bulk-delete",
  requireAuth,
  requirePermission("settings", "delete"),
  asyncHandler(async (req, res) => {
    const { ids } = bulkDeleteSchema.parse(req.body);
    const { count } = await prisma.contactSubmission.deleteMany({ where: { id: { in: ids } } });
    res.json({ count });
  }),
);

contactRouter.delete(
  "/:id",
  requireAuth,
  requirePermission("settings", "delete"),
  asyncHandler(async (req, res) => {
    await prisma.contactSubmission.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
