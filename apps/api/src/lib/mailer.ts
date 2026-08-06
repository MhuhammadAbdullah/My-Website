import { getAdminRecipient, sendTemplatedEmail } from "./email-templates.js";

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
    budget: submission.budget ?? "—",
    source: submission.source ?? "—",
    message: submission.message.replace(/\n/g, "<br />"),
  });
}
