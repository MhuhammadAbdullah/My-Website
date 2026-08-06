export type EmailRecipientRole = "ADMIN" | "CLIENT" | "INFLUENCER";

export interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  recipientRole: EmailRecipientRole;
  subject: string;
  bodyHtml: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}
