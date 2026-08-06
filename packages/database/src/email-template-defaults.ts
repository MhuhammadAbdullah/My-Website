export type EmailRecipientRoleValue = "ADMIN" | "CLIENT" | "INFLUENCER";

export interface EmailTemplateDefault {
  key: string;
  name: string;
  description: string;
  recipientRole: EmailRecipientRoleValue;
  subject: string;
  bodyHtml: string;
  // {{tokens}} usable in subject/bodyHtml. "cta" is special -- when present,
  // it's replaced with a styled call-to-action button (see EMAIL_TEMPLATE_CTA
  // below) rather than plain data, so it can be repositioned or removed by
  // an admin editing the body without touching any code.
  variables: string[];
}

export const EMAIL_TEMPLATE_KEYS = [
  "contact.admin_notification",
  "influencer.application_submitted",
  "influencer.application_received_admin_alert",
  "influencer.application_approved",
  "influencer.application_rejected",
  "influencer.application_needs_info",
  "influencer.payout_sent",
  "influencer.password_reset",
  "influencer.login_otp",
  "booking.received_client",
  "booking.received_admin_alert",
  "booking.influencer_assigned_client",
  "booking.influencer_confirmed_client",
  "booking.influencer_declined_client",
  "booking.assigned_influencer",
  "booking.payment_received_client",
  "booking.campaign_completed_client",
] as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

// Which variable holds the destination URL for the {{cta}} button, and what
// label the button gets -- kept out of admin-editable content (and off the
// EmailTemplate row entirely) since the URL is always computed at send time
// from live app state, never something an admin should hand-type.
export const EMAIL_TEMPLATE_CTA: Partial<Record<EmailTemplateKey, { label: string; urlVar: string }>> = {
  "influencer.application_received_admin_alert": { label: "Review application", urlVar: "reviewUrl" },
  "influencer.application_approved": { label: "Log in to your dashboard", urlVar: "loginUrl" },
  "influencer.payout_sent": { label: "View payout details", urlVar: "earningsUrl" },
  "influencer.password_reset": { label: "Reset password", urlVar: "resetUrl" },
  "booking.received_admin_alert": { label: "Review booking", urlVar: "reviewUrl" },
  "booking.assigned_influencer": { label: "Review booking", urlVar: "bookingsUrl" },
};

export const EMAIL_TEMPLATE_DEFAULTS: Record<EmailTemplateKey, EmailTemplateDefault> = {
  "contact.admin_notification": {
    key: "contact.admin_notification",
    name: "New contact form submission",
    description: "Sent to the admin notification address whenever someone submits the public contact form.",
    recipientRole: "ADMIN",
    subject: "New contact form submission from {{name}}",
    bodyHtml: `<table cellpadding="6" style="border-collapse:collapse">
<tr><td><strong>Name</strong></td><td>{{name}}</td></tr>
<tr><td><strong>Email</strong></td><td>{{email}}</td></tr>
<tr><td><strong>Phone</strong></td><td>{{phone}}</td></tr>
<tr><td><strong>Country</strong></td><td>{{country}}</td></tr>
<tr><td><strong>City</strong></td><td>{{city}}</td></tr>
<tr><td><strong>Budget</strong></td><td>{{budget}}</td></tr>
<tr><td><strong>Source</strong></td><td>{{source}}</td></tr>
</table>
<p><strong>Message:</strong></p>
<p>{{message}}</p>`,
    variables: ["name", "email", "phone", "country", "city", "budget", "source", "message"],
  },
  "influencer.application_submitted": {
    key: "influencer.application_submitted",
    name: "Application received (applicant)",
    description: "Sent to an applicant right after they submit an influencer application.",
    recipientRole: "INFLUENCER",
    subject: "We've received your influencer application",
    bodyHtml: `<p>Hi {{name}},</p>
<p>Thanks for applying to join our Influencer Marketplace. Our team reviews every application by hand, so it may take a few days.</p>
<p>We'll email you as soon as there's an update — no action is needed from you right now.</p>`,
    variables: ["name"],
  },
  "influencer.application_received_admin_alert": {
    key: "influencer.application_received_admin_alert",
    name: "New application (admin alert)",
    description: "Sent to the admin notification address whenever a new influencer application comes in.",
    recipientRole: "ADMIN",
    subject: "New influencer application from {{name}}",
    bodyHtml: `<p>{{name}} ({{email}}, @{{username}}) just applied to the Influencer Marketplace.</p>
{{cta}}`,
    variables: ["name", "email", "username", "cta"],
  },
  "influencer.application_approved": {
    key: "influencer.application_approved",
    name: "Application approved",
    description: "Sent to an applicant when their influencer application is approved.",
    recipientRole: "INFLUENCER",
    subject: "You're approved — welcome to the Influencer Marketplace",
    bodyHtml: `<p>Hi {{name}},</p>
<p>Good news — your influencer application has been approved. Your profile is now visible to clients, and you can log in to your dashboard to manage bookings, pricing, and payouts.</p>
{{cta}}`,
    variables: ["name", "cta"],
  },
  "influencer.application_rejected": {
    key: "influencer.application_rejected",
    name: "Application not approved",
    description: "Sent to an applicant when their influencer application is turned down.",
    recipientRole: "INFLUENCER",
    subject: "An update on your influencer application",
    bodyHtml: `<p>Hi {{name}},</p>
<p>After review, we're not able to approve your influencer application at this time.</p>
{{reasonBlock}}
<p>You're welcome to apply again in the future if your profile changes.</p>`,
    variables: ["name", "reasonBlock"],
  },
  "influencer.application_needs_info": {
    key: "influencer.application_needs_info",
    name: "Application needs more information",
    description: "Sent to an applicant when the review team needs additional details.",
    recipientRole: "INFLUENCER",
    subject: "We need a bit more information",
    bodyHtml: `<p>Hi {{name}},</p>
<p>We're reviewing your influencer application and need a little more information before we can make a decision.</p>
{{noteBlock}}
<p>Just reply to this email with the requested information and we'll continue the review.</p>`,
    variables: ["name", "noteBlock"],
  },
  "influencer.payout_sent": {
    key: "influencer.payout_sent",
    name: "Payout sent",
    description: "Sent to an influencer once a payout has been marked as sent.",
    recipientRole: "INFLUENCER",
    subject: "Payout sent — {{payoutNumber}}",
    bodyHtml: `<p>Hi {{name}},</p>
<p>We've sent your payout <strong>{{payoutNumber}}</strong> for <strong>{{currency}} {{totalAmount}}</strong> via {{method}}. It should reflect on your end shortly.</p>
{{cta}}`,
    variables: ["name", "payoutNumber", "totalAmount", "currency", "method", "cta"],
  },
  "influencer.password_reset": {
    key: "influencer.password_reset",
    name: "Password reset",
    description: "Sent to an influencer who requested a password reset.",
    recipientRole: "INFLUENCER",
    subject: "Reset your influencer account password",
    bodyHtml: `<p>Hi {{name}},</p>
<p>We received a request to reset your influencer account password. This link expires in 1 hour and can only be used once.</p>
{{cta}}
<p>If you didn't request this, you can safely ignore this email — your password won't change.</p>`,
    variables: ["name", "cta"],
  },
  "influencer.login_otp": {
    key: "influencer.login_otp",
    name: "Login verification code",
    description: "Sent to an influencer with their one-time login code.",
    recipientRole: "INFLUENCER",
    subject: "Your login code is {{otp}}",
    bodyHtml: `<p>Hi {{name}},</p>
<p>Use this code to finish logging in. It expires in 5 minutes.</p>
<p style="font-size:28px;font-weight:700;letter-spacing:0.3em;margin:24px 0;">{{otp}}</p>
<p>If you didn't try to log in, you can ignore this email.</p>`,
    variables: ["name", "otp"],
  },
  "booking.received_client": {
    key: "booking.received_client",
    name: "Booking request received (client)",
    description: "Sent to the client immediately after they submit a booking request.",
    recipientRole: "CLIENT",
    subject: "Booking request received — {{bookingNumber}}",
    bodyHtml: `<p>Hi {{contactPerson}},</p>
<p>Thanks for submitting a booking request (<strong>{{bookingNumber}}</strong>) for {{businessName}}. Our team reviews every request by hand and will be in touch shortly with next steps.</p>`,
    variables: ["contactPerson", "bookingNumber", "businessName"],
  },
  "booking.received_admin_alert": {
    key: "booking.received_admin_alert",
    name: "New booking request (admin alert)",
    description: "Sent to the admin notification address whenever a client submits a booking request.",
    recipientRole: "ADMIN",
    subject: "New booking request — {{bookingNumber}}",
    bodyHtml: `<p>{{businessName}} ({{contactEmail}}) just requested to book <strong>{{influencerName}}</strong> — reference {{bookingNumber}}.</p>
{{cta}}`,
    variables: ["businessName", "contactEmail", "influencerName", "bookingNumber", "cta"],
  },
  "booking.influencer_assigned_client": {
    key: "booking.influencer_assigned_client",
    name: "Influencer assigned (client)",
    description: "Sent to the client once an influencer has been assigned to their booking.",
    recipientRole: "CLIENT",
    subject: "An influencer has been assigned — {{bookingNumber}}",
    bodyHtml: `<p>Hi {{contactPerson}},</p>
<p>Good news — we've assigned your booking (<strong>{{bookingNumber}}</strong>) to an influencer and they've been notified. We'll follow up as soon as they confirm availability, before requesting payment.</p>`,
    variables: ["contactPerson", "bookingNumber"],
  },
  "booking.influencer_confirmed_client": {
    key: "booking.influencer_confirmed_client",
    name: "Influencer confirmed availability (client)",
    description: "Sent to the client once the assigned influencer confirms they can take the booking.",
    recipientRole: "CLIENT",
    subject: "Your influencer confirmed availability — {{bookingNumber}}",
    bodyHtml: `<p>Hi {{contactPerson}},</p>
<p>The influencer assigned to your booking (<strong>{{bookingNumber}}</strong>) has confirmed their availability. Next up, we'll send payment instructions to get the campaign underway.</p>`,
    variables: ["contactPerson", "bookingNumber"],
  },
  "booking.influencer_declined_client": {
    key: "booking.influencer_declined_client",
    name: "Influencer unavailable (client)",
    description: "Sent to the client if the assigned influencer declines the booking.",
    recipientRole: "CLIENT",
    subject: "Update on your booking — {{bookingNumber}}",
    bodyHtml: `<p>Hi {{contactPerson}},</p>
<p>Unfortunately the influencer assigned to your booking (<strong>{{bookingNumber}}</strong>) isn't able to take on this campaign{{reasonSuffix}}</p>
<p>No payment has been collected. Our team is finding an alternative and will be in touch shortly.</p>`,
    variables: ["contactPerson", "bookingNumber", "reasonSuffix"],
  },
  "booking.assigned_influencer": {
    key: "booking.assigned_influencer",
    name: "New booking assigned (influencer)",
    description: "Sent to an influencer when a new booking is assigned to them.",
    recipientRole: "INFLUENCER",
    subject: "New booking assigned — {{bookingNumber}}",
    bodyHtml: `<p>Hi {{name}},</p>
<p>You've been booked for a new campaign by {{businessName}} (reference {{bookingNumber}}). Please review the brief and accept or decline from your dashboard.</p>
{{cta}}`,
    variables: ["name", "businessName", "bookingNumber", "cta"],
  },
  "booking.payment_received_client": {
    key: "booking.payment_received_client",
    name: "Payment received (client)",
    description: "Sent to the client after a payment is recorded against their booking.",
    recipientRole: "CLIENT",
    subject: "Payment received — {{bookingNumber}}",
    bodyHtml: `<p>Hi {{contactPerson}},</p>
<p>We've recorded a payment of <strong>{{currency}} {{amount}}</strong> against booking {{bookingNumber}}. Thank you!</p>`,
    variables: ["contactPerson", "amount", "currency", "bookingNumber"],
  },
  "booking.campaign_completed_client": {
    key: "booking.campaign_completed_client",
    name: "Campaign completed (client)",
    description: "Sent to the client once their campaign is marked complete.",
    recipientRole: "CLIENT",
    subject: "Campaign completed — {{bookingNumber}}",
    bodyHtml: `<p>Hi {{contactPerson}},</p>
<p>Your campaign (<strong>{{bookingNumber}}</strong>) has been marked complete. Thanks for booking through our marketplace — we'd love to work with you again.</p>`,
    variables: ["contactPerson", "bookingNumber"],
  },
};
