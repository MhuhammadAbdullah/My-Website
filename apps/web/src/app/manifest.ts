import type { MetadataRoute } from "next";
import type { SiteSettings } from "@/lib/types";
import { getNav, getSettings } from "@/lib/api";
import { fillTokens, resolveBranding } from "@/lib/branding";
import { appBackground } from "@/lib/pwa";

// Web app manifest: what the browser reads to install the site as an app (Android, desktop Chrome/Edge;
// iPhone uses the apple-touch icon + meta tags from the layout). Name, colours and shortcuts all come
// from Site Settings -- nothing brand-specific lives in code.
export const revalidate = 300;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [settings, nav] = await Promise.all([getSettings().catch(() => ({}) as SiteSettings), getNav("HEADER").catch(() => [])]);
  const name = resolveBranding(settings, "").name || "App";
  const bg = appBackground(settings);
  const seo = settings.seo_defaults;
  const description = seo?.description ? fillTokens(seo.description, name) : undefined;

  return {
    id: "/",
    name,
    short_name: name.length > 12 ? name.slice(0, 12).trim() : name,
    ...(description ? { description } : {}),
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: bg,
    theme_color: bg,
    lang: "en",
    categories: ["business", "productivity"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: nav
      .filter((n) => n.href.startsWith("/") && n.label)
      .slice(0, 4)
      .map((n) => ({ name: n.label, url: n.href, icons: [{ src: "/pwa-icon/192", sizes: "192x192", type: "image/png" }] })),
  };
}
