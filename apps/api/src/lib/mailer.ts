import { getAdminRecipient, sendTemplatedEmail } from "./email-templates.js";

interface ContactSubmissionEmailData {
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  companyName: string | null;
  message: string;
  source: string | null;
}

export async function sendAdminPasswordResetEmail(user: { name: string; email: string }, resetUrl: string) {
  await sendTemplatedEmail("admin.password_reset", user.email, { name: user.name, resetUrl });
}

export async function sendInquiryAutoReply(to: string, name: string, message: string) {
  await sendTemplatedEmail("contact.auto_reply", to, { name, message: message.replace(/\n/g, "<br />") });
}

export async function sendContactNotificationEmail(submission: ContactSubmissionEmailData) {
  const to = await getAdminRecipient();
  if (!to) {
    console.warn("No admin notification recipient configured — skipping contact notification email");
    return;
  }

  await sendTemplatedEmail("contact.admin_notification", to, {
    name: submission.name,
    email: submission.email,
    phone: submission.phone,
    country: submission.country,
    city: submission.city,
    companyName: submission.companyName ?? "—",
    source: submission.source ?? "—",
    message: submission.message.replace(/\n/g, "<br />"),
  });
}
