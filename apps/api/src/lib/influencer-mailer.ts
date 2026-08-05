import { prisma } from "@agency/database";
import { env } from "../env.js";
import { transporter } from "./mail-transport.js";
import { renderEmailShell, emailButton } from "./email-shell.js";

export async function getAdminRecipient(): Promise<string | undefined> {
  if (env.ADMIN_NOTIFICATION_EMAIL) return env.ADMIN_NOTIFICATION_EMAIL;
  const setting = await prisma.siteSetting.findUnique({ where: { key: "contact_email" } });
  return typeof setting?.value === "string" ? setting.value : undefined;
}

// Exported for booking-mailer.ts (and any future influencer-marketplace
// mailer file) to reuse the exact same send/no-op/log behavior rather than
// re-implementing it.
export async function send(to: string, subject: string, title: string, bodyHtml: string, preheader?: string) {
  if (!transporter) {
    console.warn(`Email not configured — skipping "${subject}" to ${to}`);
    return;
  }
  try {
    const html = await renderEmailShell({ title, bodyHtml, preheader });
    await transporter.sendMail({ from: env.SMTP_FROM || env.SMTP_USER, to, subject, html });
    console.log(`Sent "${subject}" to ${to}`);
  } catch (error) {
    console.error(`Failed to send "${subject}" to ${to}:`, error);
  }
}

export async function sendApplicationSubmittedEmail(applicant: { name: string; email: string }) {
  await send(
    applicant.email,
    "We've received your influencer application",
    "Application received",
    `<p>Hi ${applicant.name},</p>
     <p>Thanks for applying to join our Influencer Marketplace. Our team reviews every application by hand, so it may take a few days.</p>
     <p>We'll email you as soon as there's an update — no action is needed from you right now.</p>`,
    "We've received your influencer application.",
  );
}

export async function sendApplicationReceivedAdminAlert(applicant: { name: string; email: string; username: string }) {
  const to = await getAdminRecipient();
  if (!to) return;
  await send(
    to,
    `New influencer application from ${applicant.name}`,
    "New influencer application",
    `<p>${applicant.name} (${applicant.email}, @${applicant.username}) just applied to the Influencer Marketplace.</p>
     ${emailButton("Review application", `${env.WEB_APP_URL}`)}`,
  );
}

export async function sendApplicationApprovedEmail(applicant: { name: string; email: string }) {
  await send(
    applicant.email,
    "You're approved — welcome to the Influencer Marketplace",
    "Application approved",
    `<p>Hi ${applicant.name},</p>
     <p>Good news — your influencer application has been approved. Your profile is now visible to clients, and you can log in to your dashboard to manage bookings, pricing, and payouts.</p>
     ${emailButton("Log in to your dashboard", `${env.WEB_APP_URL}/influencer/login`)}`,
    "Your influencer application has been approved.",
  );
}

export async function sendApplicationRejectedEmail(applicant: { name: string; email: string }, reason?: string) {
  await send(
    applicant.email,
    "An update on your influencer application",
    "Application update",
    `<p>Hi ${applicant.name},</p>
     <p>After review, we're not able to approve your influencer application at this time.</p>
     ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
     <p>You're welcome to apply again in the future if your profile changes.</p>`,
  );
}

export async function sendPayoutSentEmail(
  influencer: { name: string; email: string },
  payout: { payoutNumber: string; totalAmount: number; currency: string; method: string },
) {
  await send(
    influencer.email,
    `Payout sent — ${payout.payoutNumber}`,
    "Payout sent",
    `<p>Hi ${influencer.name},</p>
     <p>We've sent your payout <strong>${payout.payoutNumber}</strong> for <strong>${payout.currency} ${payout.totalAmount.toLocaleString()}</strong> via ${payout.method.replace(/_/g, " ")}. It should reflect on your end shortly.</p>
     ${emailButton("View payout details", `${env.WEB_APP_URL}/influencer/dashboard/earnings`)}`,
    "Your payout has been sent.",
  );
}

export async function sendApplicationNeedsInfoEmail(applicant: { name: string; email: string }, note?: string) {
  await send(
    applicant.email,
    "We need a bit more information",
    "More information needed",
    `<p>Hi ${applicant.name},</p>
     <p>We're reviewing your influencer application and need a little more information before we can make a decision.</p>
     ${note ? `<p><strong>What we need:</strong> ${note}</p>` : ""}
     <p>Just reply to this email with the requested information and we'll continue the review.</p>`,
  );
}

export async function sendPasswordResetEmail(influencer: { name: string; email: string }, resetUrl: string) {
  await send(
    influencer.email,
    "Reset your influencer account password",
    "Reset your password",
    `<p>Hi ${influencer.name},</p>
     <p>We received a request to reset your influencer account password. This link expires in 1 hour and can only be used once.</p>
     ${emailButton("Reset password", resetUrl)}
     <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>`,
    "Reset your influencer account password.",
  );
}

export async function sendLoginOtpEmail(influencer: { name: string; email: string }, otp: string) {
  await send(
    influencer.email,
    `Your login code is ${otp}`,
    "Your login code",
    `<p>Hi ${influencer.name},</p>
     <p>Use this code to finish logging in. It expires in 5 minutes.</p>
     <p style="font-size:28px;font-weight:700;letter-spacing:0.3em;margin:24px 0;">${otp}</p>
     <p>If you didn't try to log in, you can ignore this email.</p>`,
    `Your login code is ${otp}.`,
  );
}
