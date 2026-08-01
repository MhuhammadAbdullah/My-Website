// Admins paste whatever Google's "HTML tag" verification instructions show
// them -- a full <meta> tag, the bare `google-site-verification=xxx` string
// (also used for the DNS TXT method), or just the raw token. Next's
// `verification.google` metadata field only wants the token/content value,
// so normalize whatever shape comes in rather than making the admin guess
// which one is "correct".
export function extractGoogleSiteVerificationCode(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const metaTagMatch = trimmed.match(/content=["']([^"']+)["']/i);
  if (metaTagMatch) return metaTagMatch[1];

  const keyValueMatch = trimmed.match(/google-site-verification=([^"'\s]+)/i);
  if (keyValueMatch) return keyValueMatch[1];

  return trimmed;
}
