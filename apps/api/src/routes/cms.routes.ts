import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { prisma } from "@agency/database";
import { asyncHandler } from "../middleware/async-handler.js";
import { ApiError } from "../middleware/error-handler.js";
import { env } from "../env.js";
import { sendContactNotificationEmail, sendInquiryAutoReply } from "../lib/mailer.js";

// Public inquiry / newsletter endpoint used by the homepage sections.
export const cmsRouter = Router();

// One endpoint for the homepage inquiry form and the newsletter box. Spam
// defences, in order: honeypot field, per-IP rate limit, and (when the
// TURNSTILE_SECRET_KEY env var is set) a Cloudflare Turnstile check. The
// secret never leaves the server; the browser only knows the public site key.

const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages submitted. Please try again in a few minutes." },
});

const inquirySchema = z.object({
  kind: z.enum(["inquiry", "newsletter"]).default("inquiry"),
  name: z.string().trim().max(100).optional().default(""),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30).optional().default(""),
  company: z.string().trim().max(150).optional().default(""),
  service: z.string().trim().max(100).optional().default(""),
  budget: z.string().trim().max(60).optional().default(""),
  message: z.string().trim().max(4000).optional().default(""),
  source: z.string().trim().max(120).optional().default(""),
  website: z.string().max(200).optional().default(""), // honeypot
  turnstileToken: z.string().max(4096).optional().default(""),
});

async function verifyTurnstile(token: string, ip: string | undefined): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true; // not configured: honeypot + rate limit only
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    const body = (await res.json()) as { success?: boolean };
    return body.success === true;
  } catch {
    return false;
  }
}

cmsRouter.post(
  "/inquiry",
  inquiryLimiter,
  asyncHandler(async (req, res) => {
    const data = inquirySchema.parse(req.body);

    // Honeypot tripped: pretend it worked so the bot learns nothing, store nothing.
    if (data.website) {
      res.status(201).json({ ok: true });
      return;
    }

    const isInquiry = data.kind === "inquiry";
    if (isInquiry && data.name.length < 2) throw new ApiError(422, "Please enter your name.");
    if (isInquiry && data.message.length < 10) throw new ApiError(422, "Please tell us a little more about your project.");

    if (!(await verifyTurnstile(data.turnstileToken, req.ip))) {
      throw new ApiError(422, "Spam check failed. Please reload and try again.");
    }

    const details = [data.service && `Service: ${data.service}`, data.budget && `Budget: ${data.budget}`].filter(Boolean).join("\n");
    const message = isInquiry ? [data.message, details].filter(Boolean).join("\n\n") : "Newsletter signup";
    const submission = await prisma.contactSubmission.create({
      data: {
        name: data.name || "Newsletter subscriber",
        email: data.email,
        phone: data.phone,
        country: "",
        city: "",
        companyName: data.company || null,
        message,
        source: isInquiry ? `inquiry ${data.source}`.trim() : `newsletter ${data.source}`.trim(),
      },
    });
    res.status(201).json({ ok: true });

    // Best-effort, after the response: a broken mail config must never fail the submission.
    void sendContactNotificationEmail(submission);
    if (isInquiry) void sendInquiryAutoReply(data.email, data.name, data.message);
  }),
);
