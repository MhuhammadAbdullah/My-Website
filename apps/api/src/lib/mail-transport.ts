import nodemailer from "nodemailer";
import { env } from "../env.js";

// Shared by mailer.ts (contact form) and influencer-mailer.ts (Influencer
// Marketplace) -- one transporter, `null` (not an error) when SMTP isn't
// configured so every caller degrades the same way: log and skip, never
// fail the request that triggered the email.
export const transporter =
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      })
    : null;
