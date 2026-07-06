import nodemailer from "nodemailer";
import { prisma } from "@agency/database";
import { env } from "../env.js";

const transporter =
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      })
    : null;

interface ContactSubmissionEmailData {
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  budget: string | null;
  message: string;
  source: string | null;
}

export async function sendContactNotificationEmail(submission: ContactSubmissionEmailData) {
  if (!transporter) {
    console.warn("Email not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD missing) — skipping contact notification email");
    return;
  }

  const contactEmailSetting = await prisma.siteSetting.findUnique({ where: { key: "contact_email" } });
  const settingEmail = typeof contactEmailSetting?.value === "string" ? contactEmailSetting.value : undefined;
  const to = env.ADMIN_NOTIFICATION_EMAIL || settingEmail;
  if (!to) {
    console.warn("No admin notification recipient configured — skipping contact notification email");
    return;
  }

  const rows: [string, string][] = [
    ["Name", submission.name],
    ["Email", submission.email],
    ["Phone", submission.phone],
    ["Country", submission.country],
    ["City", submission.city],
    ["Budget", submission.budget ?? "—"],
    ["Source", submission.source ?? "—"],
  ];

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to,
      subject: `New contact form submission from ${submission.name}`,
      text: [
        ...rows.map(([label, value]) => `${label}: ${value}`),
        "",
        "Message:",
        submission.message,
      ].join("\n"),
      html: `
        <table cellpadding="6" style="border-collapse:collapse">
          ${rows.map(([label, value]) => `<tr><td><strong>${label}</strong></td><td>${value}</td></tr>`).join("")}
        </table>
        <p><strong>Message:</strong></p>
        <p>${submission.message.replace(/\n/g, "<br />")}</p>
      `,
    });
    console.log(`Contact notification email sent to ${to}`);
  } catch (error) {
    console.error("Failed to send contact notification email:", error);
  }
}
