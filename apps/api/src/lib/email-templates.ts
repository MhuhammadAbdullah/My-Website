import {
  prisma,
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_CTA,
  type EmailTemplateKey,
} from "@agency/database";
import { env } from "../env.js";
import { transporter } from "./mail-transport.js";
import { renderEmailShell, emailButton } from "./email-shell.js";

export type { EmailTemplateKey } from "@agency/database";

export async function getAdminRecipient(): Promise<string | undefined> {
  if (env.ADMIN_NOTIFICATION_EMAIL) return env.ADMIN_NOTIFICATION_EMAIL;
  const setting = await prisma.siteSetting.findUnique({ where: { key: "contact_email" } });
  return typeof setting?.value === "string" ? setting.value : undefined;
}

// Creates any template rows missing from the DB (new keys added in code
// after the last seed run, or a DB that predates this feature) so the admin
// list is always complete and every key is guaranteed sendable. Never
// overwrites an existing row -- that would clobber admin edits.
export async function ensureEmailTemplatesSeeded() {
  const existing = await prisma.emailTemplate.findMany({ select: { key: true } });
  const existingKeys = new Set(existing.map((t) => t.key));
  const missing = Object.values(EMAIL_TEMPLATE_DEFAULTS).filter((t) => !existingKeys.has(t.key));
  if (missing.length === 0) return;
  await Promise.all(
    missing.map((t) =>
      prisma.emailTemplate.create({
        data: {
          key: t.key,
          name: t.name,
          description: t.description,
          recipientRole: t.recipientRole,
          subject: t.subject,
          bodyHtml: t.bodyHtml,
          variables: t.variables,
        },
      }),
    ),
  );
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => vars[name] ?? "");
}

async function send(to: string, subject: string, bodyHtml: string) {
  if (!transporter) {
    console.warn(`Email not configured — skipping "${subject}" to ${to}`);
    return;
  }
  try {
    const html = await renderEmailShell({ title: subject, bodyHtml });
    await transporter.sendMail({ from: env.SMTP_FROM || env.SMTP_USER, to, subject, html });
    console.log(`Sent "${subject}" to ${to}`);
  } catch (error) {
    console.error(`Failed to send "${subject}" to ${to}:`, error);
  }
}

// The single send path for every transactional email the platform sends.
// Loads the admin-editable subject/bodyHtml for `key` (falling back to the
// code default if the row is somehow missing), fills in {{variables}} --
// including the special {{cta}} token, which becomes a styled button built
// fresh from the live URL rather than anything stored/editable -- and sends.
export async function sendTemplatedEmail(key: EmailTemplateKey, to: string, vars: Record<string, string>) {
  const def = EMAIL_TEMPLATE_DEFAULTS[key];
  const stored = await prisma.emailTemplate.findUnique({ where: { key } });

  const cta = EMAIL_TEMPLATE_CTA[key];
  const fullVars = { ...vars };
  if (cta) {
    const url = vars[cta.urlVar];
    fullVars.cta = url ? emailButton(cta.label, url) : "";
  }

  const subject = interpolate(stored?.subject ?? def.subject, fullVars);
  const bodyHtml = interpolate(stored?.bodyHtml ?? def.bodyHtml, fullVars);
  await send(to, subject, bodyHtml);
}
