import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { prisma } from "@agency/database";
import { contactSubmissionSchema } from "@agency/types";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireAnyPermission, requireAuth } from "../middleware/require-auth.js";
import { sendContactNotificationEmail } from "../lib/mailer.js";
import { signCloudinaryUpload } from "../lib/cloudinary.js";
import { env } from "../env.js";
import { parseListQuery, paginationMeta, searchFilter, exactFilter } from "../lib/list-query.js";

export const contactRouter = Router();

const bulkDeleteSchema = z.object({ ids: z.array(z.string().min(1)).min(1) });

const contactSortableFields = ["name", "email", "status", "createdAt", "updatedAt"];

// Tighter limit on the public write endpoint specifically — this is the
// most likely target for spam/abuse on the whole API.
//
// `message` as an object (not a string) matters: express-rate-limit's
// handler does `response.send(message)`, and Express's res.send() only
// delegates to res.json() for object/array bodies -- a plain string message
// (the library's default) comes back as text/plain, which silently breaks
// every client-side `res.json()` call site and surfaces as a generic
// "Something went wrong" instead of a real rate-limit message.
const contactFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages submitted. Please try again in a few minutes." },
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
        companyName: data.companyName || null,
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

// ---------------------------------------------------------------- job applications (Careers page)
// Stored as a contact submission with source "career:<position>" -- no extra table. The CV goes straight from the
// browser to Cloudinary (signed, rate-limited), and only its link is saved here.
const CV_FOLDER = "agency-website/cv";

const careerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many applications from this connection. Please try again later." },
});

const careerApplicationSchema = z.object({
  position: z.string().trim().min(1).max(120),
  name: z.string().trim().min(2, "Please enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(160),
  phone: z.string().trim().min(5, "Enter a phone number").max(40),
  country: z.string().trim().min(2, "Enter your country").max(80),
  city: z.string().trim().min(2, "Enter your city").max(80),
  linkedin: z.string().trim().max(300).optional().default(""),
  portfolio: z.string().trim().max(300).optional().default(""),
  experience: z.string().trim().max(60).optional().default(""),
  expectedSalary: z.string().trim().max(80).optional().default(""),
  noticePeriod: z.string().trim().max(60).optional().default(""),
  coverNote: z.string().trim().max(3000).optional().default(""),
  cvUrl: z.string().trim().url().max(500),
  cvName: z.string().trim().max(200).optional().default("CV"),
  consent: z.literal(true, { message: "Please confirm that we may contact you about this application" }),
  website: z.string().max(0).optional(), // honeypot
});

contactRouter.post(
  "/career/sign",
  careerLimiter,
  asyncHandler(async (_req, res) => {
    res.json(signCloudinaryUpload(CV_FOLDER));
  }),
);

contactRouter.post(
  "/career",
  careerLimiter,
  asyncHandler(async (req, res) => {
    const d = careerApplicationSchema.parse(req.body);
    // Only links to files uploaded through the signed CV folder on our own Cloudinary account are accepted.
    const allowedPrefix = `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/`;
    if (!d.cvUrl.startsWith(allowedPrefix) || !d.cvUrl.includes(`/${CV_FOLDER}/`)) {
      res.status(400).json({ error: "Please upload your CV again." });
      return;
    }
    const message = [
      `Position: ${d.position}`,
      d.experience && `Experience: ${d.experience}`,
      d.expectedSalary && `Expected salary: ${d.expectedSalary}`,
      d.noticePeriod && `Notice period: ${d.noticePeriod}`,
      d.linkedin && `LinkedIn: ${d.linkedin}`,
      d.portfolio && `Portfolio: ${d.portfolio}`,
      `CV: ${d.cvUrl}`,
      d.cvName && `CV file: ${d.cvName}`,
      d.coverNote && `\nCover note:\n${d.coverNote}`,
    ]
      .filter(Boolean)
      .join("\n");
    const submission = await prisma.contactSubmission.create({
      data: { name: d.name, email: d.email, phone: d.phone, country: d.country, city: d.city, message, source: `career:${d.position}`.slice(0, 190) },
    });
    res.status(201).json({ ok: true, id: submission.id });
    void sendContactNotificationEmail(submission);
  }),
);

contactRouter.get(
  "/",
  requireAuth,
  requireAnyPermission(["leads", "view"], ["settings", "view"]),
  asyncHandler(async (req, res) => {
    const { page, limit, skip, search, sortBy, sortOrder } = parseListQuery(req.query, {
      sortableFields: contactSortableFields,
      defaultSort: "createdAt",
    });

    const where = {
      ...searchFilter(search, ["name", "email", "message"]),
      ...exactFilter(req.query, "status"),
      ...exactFilter(req.query, "country"),
      ...(typeof req.query.sourcePrefix === "string" && req.query.sourcePrefix ? { source: { startsWith: req.query.sourcePrefix } } : {}),
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
  requireAnyPermission(["leads", "update"], ["settings", "update"]),
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
  requireAnyPermission(["leads", "delete"], ["settings", "delete"]),
  asyncHandler(async (req, res) => {
    const { ids } = bulkDeleteSchema.parse(req.body);
    const { count } = await prisma.contactSubmission.deleteMany({ where: { id: { in: ids } } });
    res.json({ count });
  }),
);

contactRouter.delete(
  "/:id",
  requireAuth,
  requireAnyPermission(["leads", "delete"], ["settings", "delete"]),
  asyncHandler(async (req, res) => {
    await prisma.contactSubmission.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }),
);
