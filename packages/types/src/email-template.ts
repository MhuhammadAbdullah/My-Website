import { z } from "zod";

// Admin only ever edits subject/bodyHtml -- key, name, description,
// recipientRole, and variables are fixed metadata describing the send (see
// packages/database/src/email-template-defaults.ts), not admin-editable.
export const emailTemplateUpdateSchema = z.object({
  subject: z.string().min(1).max(300),
  bodyHtml: z.string().min(1),
});
export type EmailTemplateUpdateInput = z.infer<typeof emailTemplateUpdateSchema>;
