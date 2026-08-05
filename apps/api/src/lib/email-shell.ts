import { prisma } from "@agency/database";

// Wraps a transactional email's body in a consistent branded header/footer
// instead of every send hand-rolling its own <table> boilerplate (the one
// pre-existing email in this codebase, sendContactNotificationEmail, does
// exactly that -- fine for one email, not for the ~9 the Influencer
// Marketplace needs). Brand name is read from the same SiteSetting the rest
// of the app uses, so a rebrand doesn't require touching email code.
export async function renderEmailShell(opts: { title: string; bodyHtml: string; preheader?: string }): Promise<string> {
  const companyNameSetting = await prisma.siteSetting.findUnique({ where: { key: "company_name" } });
  const brandName = typeof companyNameSetting?.value === "string" ? companyNameSetting.value : "MAB Digital";

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${opts.title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${opts.preheader}</div>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
            <tr>
              <td style="background-color:#18181b;padding:20px 28px;">
                <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.02em;">${brandName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:14px;line-height:1.6;color:#27272a;">
                ${opts.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a;">
                Sent by ${brandName}. If you weren't expecting this email, you can ignore it.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function emailButton(label: string, href: string): string {
  return `<p style="margin:24px 0;"><a href="${href}" style="background-color:#18181b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;display:inline-block;">${label}</a></p>`;
}
