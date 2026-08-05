import { env } from "../env.js";
import { emailButton } from "./email-shell.js";
import { send, getAdminRecipient } from "./influencer-mailer.js";

interface BookingEmailContext {
  bookingNumber: string;
  businessName: string;
  contactPerson: string;
  contactEmail: string;
}

export async function sendBookingReceivedClientEmail(booking: BookingEmailContext) {
  await send(
    booking.contactEmail,
    `Booking request received — ${booking.bookingNumber}`,
    "Booking request received",
    `<p>Hi ${booking.contactPerson},</p>
     <p>Thanks for submitting a booking request (<strong>${booking.bookingNumber}</strong>) for ${booking.businessName}. Our team reviews every request by hand and will be in touch shortly with next steps.</p>`,
    "We've received your booking request.",
  );
}

export async function sendBookingReceivedAdminAlert(booking: BookingEmailContext & { influencerName: string }) {
  const to = await getAdminRecipient();
  if (!to) return;
  await send(
    to,
    `New booking request — ${booking.bookingNumber}`,
    "New booking request",
    `<p>${booking.businessName} (${booking.contactEmail}) just requested to book <strong>${booking.influencerName}</strong> — reference ${booking.bookingNumber}.</p>
     ${emailButton("Review booking", `${env.WEB_APP_URL}`)}`,
  );
}

export async function sendBookingApprovedClientEmail(booking: BookingEmailContext) {
  await send(
    booking.contactEmail,
    `An influencer has been assigned — ${booking.bookingNumber}`,
    "Influencer assigned to your campaign",
    `<p>Hi ${booking.contactPerson},</p>
     <p>Good news — we've assigned your booking (<strong>${booking.bookingNumber}</strong>) to an influencer and they've been notified. We'll follow up as soon as they confirm availability, before requesting payment.</p>`,
    "An influencer has been assigned to your campaign.",
  );
}

export async function sendBookingAcceptedClientEmail(booking: BookingEmailContext) {
  await send(
    booking.contactEmail,
    `Your influencer confirmed availability — ${booking.bookingNumber}`,
    "Influencer confirmed",
    `<p>Hi ${booking.contactPerson},</p>
     <p>The influencer assigned to your booking (<strong>${booking.bookingNumber}</strong>) has confirmed their availability. Next up, we'll send payment instructions to get the campaign underway.</p>`,
    "Your influencer confirmed availability.",
  );
}

export async function sendBookingDeclinedClientEmail(booking: BookingEmailContext, reason: string | null) {
  await send(
    booking.contactEmail,
    `Update on your booking — ${booking.bookingNumber}`,
    "Influencer unavailable",
    `<p>Hi ${booking.contactPerson},</p>
     <p>Unfortunately the influencer assigned to your booking (<strong>${booking.bookingNumber}</strong>) isn't able to take on this campaign${reason ? `: "${reason}"` : "."}</p>
     <p>No payment has been collected. Our team is finding an alternative and will be in touch shortly.</p>`,
    "The assigned influencer isn't available for this booking.",
  );
}

export async function sendBookingAssignedInfluencerEmail(
  booking: BookingEmailContext,
  influencer: { name: string; email: string },
) {
  await send(
    influencer.email,
    `New booking assigned — ${booking.bookingNumber}`,
    "New booking assigned to you",
    `<p>Hi ${influencer.name},</p>
     <p>You've been booked for a new campaign by ${booking.businessName} (reference ${booking.bookingNumber}). Please review the brief and accept or decline from your dashboard.</p>
     ${emailButton("Review booking", `${env.WEB_APP_URL}/influencer/dashboard/bookings`)}`,
    "You have a new booking to review.",
  );
}

export async function sendPaymentReceivedClientEmail(booking: BookingEmailContext, amount: number, currency: string) {
  await send(
    booking.contactEmail,
    `Payment received — ${booking.bookingNumber}`,
    "Payment received",
    `<p>Hi ${booking.contactPerson},</p>
     <p>We've recorded a payment of <strong>${currency} ${amount.toLocaleString()}</strong> against booking ${booking.bookingNumber}. Thank you!</p>`,
    "We've received your payment.",
  );
}

export async function sendCampaignCompletedClientEmail(booking: BookingEmailContext) {
  await send(
    booking.contactEmail,
    `Campaign completed — ${booking.bookingNumber}`,
    "Campaign completed",
    `<p>Hi ${booking.contactPerson},</p>
     <p>Your campaign (<strong>${booking.bookingNumber}</strong>) has been marked complete. Thanks for booking through our marketplace — we'd love to work with you again.</p>`,
    "Your campaign is complete.",
  );
}
