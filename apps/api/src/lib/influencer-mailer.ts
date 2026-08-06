import { env } from "../env.js";
import { getAdminRecipient, sendTemplatedEmail } from "./email-templates.js";

export { getAdminRecipient };

export async function sendApplicationSubmittedEmail(applicant: { name: string; email: string }) {
  await sendTemplatedEmail("influencer.application_submitted", applicant.email, { name: applicant.name });
}

export async function sendApplicationReceivedAdminAlert(applicant: { name: string; email: string; username: string }) {
  const to = await getAdminRecipient();
  if (!to) return;
  await sendTemplatedEmail("influencer.application_received_admin_alert", to, {
    name: applicant.name,
    email: applicant.email,
    username: applicant.username,
    reviewUrl: env.WEB_APP_URL,
  });
}

export async function sendApplicationApprovedEmail(applicant: { name: string; email: string }) {
  await sendTemplatedEmail("influencer.application_approved", applicant.email, {
    name: applicant.name,
    loginUrl: `${env.WEB_APP_URL}/influencer/login`,
  });
}

export async function sendApplicationRejectedEmail(applicant: { name: string; email: string }, reason?: string) {
  await sendTemplatedEmail("influencer.application_rejected", applicant.email, {
    name: applicant.name,
    reasonBlock: reason ? `<p><strong>Reason:</strong> ${reason}</p>` : "",
  });
}

export async function sendPayoutSentEmail(
  influencer: { name: string; email: string },
  payout: { payoutNumber: string; totalAmount: number; currency: string; method: string },
) {
  await sendTemplatedEmail("influencer.payout_sent", influencer.email, {
    name: influencer.name,
    payoutNumber: payout.payoutNumber,
    totalAmount: payout.totalAmount.toLocaleString(),
    currency: payout.currency,
    method: payout.method.replace(/_/g, " "),
    earningsUrl: `${env.WEB_APP_URL}/influencer/dashboard/earnings`,
  });
}

export async function sendApplicationNeedsInfoEmail(applicant: { name: string; email: string }, note?: string) {
  await sendTemplatedEmail("influencer.application_needs_info", applicant.email, {
    name: applicant.name,
    noteBlock: note ? `<p><strong>What we need:</strong> ${note}</p>` : "",
  });
}

export async function sendPasswordResetEmail(influencer: { name: string; email: string }, resetUrl: string) {
  await sendTemplatedEmail("influencer.password_reset", influencer.email, {
    name: influencer.name,
    resetUrl,
  });
}

export async function sendLoginOtpEmail(influencer: { name: string; email: string }, otp: string) {
  await sendTemplatedEmail("influencer.login_otp", influencer.email, {
    name: influencer.name,
    otp,
  });
}
