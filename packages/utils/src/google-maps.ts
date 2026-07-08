const GOOGLE_MAPS_HOSTS = new Set(["google.com", "www.google.com", "maps.google.com", "goo.gl", "maps.app.goo.gl"]);

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** A plain Google Maps link — a full share/place URL or a goo.gl short link. */
export function isGoogleMapsUrl(value: string): boolean {
  const url = parseUrl(value);
  if (!url || url.protocol !== "https:") return false;
  if (!GOOGLE_MAPS_HOSTS.has(url.hostname)) return false;
  if ((url.hostname === "google.com" || url.hostname === "www.google.com") && !url.pathname.startsWith("/maps")) {
    return false;
  }
  return true;
}

/** The `https://www.google.com/maps/embed?...` form Google Maps only allows framing for. */
export function isGoogleMapsEmbedUrl(value: string): boolean {
  const url = parseUrl(value);
  if (!url || url.protocol !== "https:") return false;
  return (url.hostname === "google.com" || url.hostname === "www.google.com") && url.pathname.startsWith("/maps/embed");
}

/**
 * Best-effort conversion of a plain Google Maps URL into an embeddable
 * iframe src. Google only allows framing `/maps/embed` pages — a normal
 * share/place link is blocked by X-Frame-Options, which is why pasting one
 * directly into an iframe silently renders a blank box. Appending
 * `output=embed` is the standard key-less way to make a regular maps.google.com
 * URL embeddable. goo.gl short links are passed through unmodified since
 * resolving the redirect would require a network call — most still work, but
 * the Embed Code field is the more reliable option for those.
 */
export function toGoogleMapsEmbedSrc(value: string): string | null {
  if (!isGoogleMapsUrl(value)) return null;
  const url = parseUrl(value)!;
  if (url.pathname.startsWith("/maps/embed")) return url.toString();
  if (url.hostname === "goo.gl" || url.hostname === "maps.app.goo.gl") return url.toString();
  url.searchParams.set("output", "embed");
  return url.toString();
}

const IFRAME_SRC_PATTERN = /<iframe[^>]*\ssrc=["']([^"']+)["'][^>]*>/i;

/**
 * Extracts and validates the `src` of a pasted Google Maps `<iframe>` embed
 * snippet. Only this extracted, validated URL is ever rendered (in our own
 * iframe element) — the pasted markup itself is never rendered — so there is
 * no script/HTML injection surface regardless of what else is in the paste.
 */
export function extractGoogleMapsEmbedSrc(embedCode: string): string | null {
  const match = embedCode.match(IFRAME_SRC_PATTERN);
  if (!match) return null;
  const src = match[1]!.replace(/&amp;/g, "&");
  return isGoogleMapsEmbedUrl(src) ? src : null;
}

/** Display priority: a valid embed code wins, then the plain URL, else null (hide the map). */
export function resolveGoogleMapsEmbedSrc(embedCode?: string | null, url?: string | null): string | null {
  if (embedCode) {
    const fromEmbedCode = extractGoogleMapsEmbedSrc(embedCode);
    if (fromEmbedCode) return fromEmbedCode;
  }
  if (url) return toGoogleMapsEmbedSrc(url);
  return null;
}
