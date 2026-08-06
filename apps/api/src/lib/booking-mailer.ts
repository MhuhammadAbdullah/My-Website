import { env } from "../env.js";
import { getAdminRecipient, sendTemplatedEmail } from "./email-templates.js";

interface BookingEmailContext {
  bookingNumber: string;
  businessName: string;
  contactPerson: string;
  contactEmail: string;
}

export async function sendBookingReceivedClientEmail(booking: BookingEmailContext) {
  await sendTemplatedEmail("booking.received_client", booking.contactEmail, {
    contactPerson: booking.contactPerson,
    bookingNumber: booking.bookingNumber,
    businessName: booking.businessName,
  });
}

export async function sendBookingReceivedAdminAlert(booking: BookingEmailContext & { influencerName: string }) {
  const to = await getAdminRecipient();
  if (!to) return;
  await sendTemplatedEmail("booking.received_admin_alert", to, {
    businessName: booking.businessName,
    contactEmail: booking.contactEmail,
    influencerName: booking.influencerName,
    bookingNumber: booking.bookingNumber,
    reviewUrl: env.WEB_APP_URL,
  });
}

export async function sendBookingApprovedClientEmail(booking: BookingEmailContext) {
  await sendTemplatedEmail("booking.influencer_assigned_client", booking.contactEmail, {
    contactPerson: booking.contactPerson,
    bookingNumber: booking.bookingNumber,
  });
}

export async function sendBookingAcceptedClientEmail(booking: BookingEmailContext) {
  await sendTemplatedEmail("booking.influencer_confirmed_client", booking.contactEmail, {
    contactPerson: booking.contactPerson,
    bookingNumber: booking.bookingNumber,
  });
}

export async function sendBookingDeclinedClientEmail(booking: BookingEmailContext, reason: string | null) {
  await sendTemplatedEmail("booking.influencer_declined_client", booking.contactEmail, {
    contactPerson: booking.contactPerson,
    bookingNumber: booking.bookingNumber,
    reasonSuffix: reason ? `: "${reason}"` : ".",
  });
}

export async function sendBookingAssignedInfluencerEmail(
  booking: BookingEmailContext,
  influencer: { name: string; email: string },
) {
  await sendTemplatedEmail("booking.assigned_influencer", influencer.email, {
    name: influencer.name,
    businessName: booking.businessName,
    bookingNumber: booking.bookingNumber,
    bookingsUrl: `${env.WEB_APP_URL}/influencer/dashboard/bookings`,
  });
}

export async function sendPaymentReceivedClientEmail(booking: BookingEmailContext, amount: number, currency: string) {
  await sendTemplatedEmail("booking.payment_received_client", booking.contactEmail, {
    contactPerson: booking.contactPerson,
    amount: amount.toLocaleString(),
    currency,
    bookingNumber: booking.bookingNumber,
  });
}

export async function sendCampaignCompletedClientEmail(booking: BookingEmailContext) {
  await sendTemplatedEmail("booking.campaign_completed_client", booking.contactEmail, {
    contactPerson: booking.contactPerson,
    bookingNumber: booking.bookingNumber,
  });
}
