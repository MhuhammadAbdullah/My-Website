import { prisma } from "@agency/database";
import { env } from "../env.js";

export interface BrandIdentity {
  /** Brand name from Site Settings (Branding). Empty string when never configured. */
  name: string;
  /** Display name for outgoing email; falls back to `name`. */
  senderName: string;
}

// Single place the API reads the brand from. There is deliberately no brand
// literal in code: the name always comes from the `branding` / `company_name`
// SiteSetting rows (editable in Admin > Branding).
export async function getBrandIdentity(): Promise<BrandIdentity> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { in: ["branding", "company_name"] } } });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const branding = byKey.get("branding") as { brandName?: string; emailSenderName?: string } | undefined;
  const companyName = byKey.get("company_name");

  const name = branding?.brandName || (typeof companyName === "string" ? companyName : "") || "";
  return { name, senderName: branding?.emailSenderName || name };
}

function extractAddress(from: string | undefined): string | undefined {
  if (!from) return undefined;
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1];
  return from.includes("@") ? from.trim() : undefined;
}

/** `"Sender Name" <address>`; the address always stays server-side config (env). */
export function formatFromHeader(senderName: string): string | undefined {
  const address = extractAddress(env.SMTP_FROM) ?? env.SMTP_USER;
  if (!address) return env.SMTP_FROM;
  return senderName ? `"${senderName.replace(/"/g, "'")}" <${address}>` : address;
}
