import type { Metadata, Viewport } from "next";
import type * as React from "react";
import { ACCENT_OPTIONS } from "@agency/types";
import { PwaInstallPrompt, PwaRegister, Toaster } from "@agency/ui";
import { manrope, syne, playfairDisplay, ibmPlexMono } from "@/lib/fonts";
import { getNav, getSettings, getActivePopups } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";
import { fillTokens, resolveBranding } from "@/lib/branding";
import { toJsonLd } from "@/lib/seo";
import { SiteChrome } from "@/components/site-chrome";
import { env } from "@/lib/env";
import { TrackingScripts } from "@/lib/tracking";
import { renderRawHtml } from "@/lib/raw-html-to-elements";
import { extractGoogleSiteVerificationCode } from "@/lib/seo-verification";
import { getInfluencerFlags } from "@/lib/influencer-flags";
import { AuthModalProvider } from "@/components/influencer/auth-modal-provider";
import { APP_BG_DARK, APP_BG_LIGHT } from "@/lib/pwa";
import "./globals.css";

// Everything here is read from Site Settings (Admin > Site Settings / Settings)
// -- there is no brand name or copy in code. `{brand}` and `%s` tokens in the
// SEO defaults are filled in below.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings().catch(() => null);
  const brandName = resolveBranding(settings ?? {}, "").name;
  const seo = settings?.seo_defaults;
  const googleVerification = extractGoogleSiteVerificationCode(settings?.integrations?.googleSiteVerification);
  const favicon = settings?.branding?.faviconUrl;

  const titleTemplate = brandName ? fillTokens(seo?.titleTemplate ?? "%s | {brand}", brandName) : "%s";
  const defaultTitle = fillTokens(seo?.defaultTitle ?? "{brand}", brandName) || "Home";
  const description = seo?.description ? fillTokens(seo.description, brandName) : undefined;
  const twitterHandle = seo?.twitterHandle ? `@${seo.twitterHandle.replace(/^@/, "")}` : undefined;

  return {
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    title: { default: defaultTitle, template: titleTemplate.includes("%s") ? titleTemplate : "%s" },
    ...(description ? { description } : {}),
    // PWA: manifest is app/manifest.ts; iPhone/iPad read the apple-touch icon and these meta tags.
    applicationName: brandName || undefined,
    appleWebApp: { capable: true, title: brandName || undefined, statusBarStyle: "default" },
    formatDetection: { telephone: false },
    other: { "apple-mobile-web-app-capable": "yes" },
    icons: { ...(favicon ? { icon: favicon } : {}), apple: [{ url: "/pwa-icon/180", sizes: "180x180", type: "image/png" }] },
    openGraph: {
      type: "website",
      siteName: brandName || undefined,
      ...(seo?.ogImageUrl ? { images: [{ url: seo.ogImageUrl }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      ...(twitterHandle ? { creator: twitterHandle, site: twitterHandle } : {}),
    },
    ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: APP_BG_LIGHT },
    { media: "(prefers-color-scheme: dark)", color: APP_BG_DARK },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [headerNav, footerNav, settings, influencerFlags, popups] = await Promise.all([
    withFallback(getNav("HEADER"), [], "header navigation"),
    withFallback(getNav("FOOTER"), [], "footer navigation"),
    withFallback(getSettings(), {}, "site settings"),
    getInfluencerFlags(),
    withFallback(getActivePopups(), [], "popups"),
  ]);

  const branding = resolveBranding(settings, "");
  // A custom colour (picked in Admin > Site Settings > Theme) overrides the preset through the --accent variable.
  const customColor = settings.theme?.accent === "custom" && settings.theme.customColor && /^#[0-9a-fA-F]{6}$/.test(settings.theme.customColor) ? settings.theme.customColor : null;
  const accent = customColor ? "custom" : settings.theme?.accent && (ACCENT_OPTIONS as readonly string[]).includes(settings.theme.accent) ? settings.theme.accent : "lime";

  const defaultMode = settings.theme?.mode === "light" ? "light" : "dark";

  const org = settings.organization;
  const sameAs = Object.values(settings.socials ?? {}).filter(Boolean);
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: branding.name || undefined,
    legalName: org?.legalName || undefined,
    description: org?.description || undefined,
    foundingDate: org?.foundingDate || undefined,
    areaServed: org?.areaServed || undefined,
    url: env.NEXT_PUBLIC_SITE_URL,
    logo: branding.logoUrl || undefined,
    email: settings.contact_email || undefined,
    telephone: settings.contact_phone || undefined,
    address: settings.address || undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: branding.name || undefined,
    url: env.NEXT_PUBLIC_SITE_URL,
  };

  const integrations = settings.integrations;

  return (
    <html
      lang="en"
      data-theme="noir"
      data-accent={accent}
      style={customColor ? ({ ["--accent"]: customColor } as React.CSSProperties) : undefined}
      data-mode={defaultMode}
      suppressHydrationWarning
      className={`${manrope.variable} ${syne.variable} ${playfairDisplay.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        {/* Apply the visitor's saved light/dark choice before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: `try{var m=localStorage.getItem("site-mode");if(m==="light"||m==="dark")document.documentElement.dataset.mode=m}catch(e){}` }} />
      </head>
      <body suppressHydrationWarning>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(websiteJsonLd) }} />
        {renderRawHtml(integrations?.headScript, "head-script")}
        {renderRawHtml(integrations?.bodyScript, "body-script")}
        <TrackingScripts integrations={integrations} />
        <AuthModalProvider registrationFlags={influencerFlags}>
          <SiteChrome headerNav={headerNav} footerNav={footerNav} settings={settings} branding={branding} popups={popups}>
            {children}
          </SiteChrome>
        </AuthModalProvider>
        <Toaster />
        <PwaRegister enabled={process.env.NODE_ENV === "production"} />
        {settings.theme?.installPrompt !== false && <PwaInstallPrompt appName={branding.name} iconUrl="/pwa-icon/192" />}
        {renderRawHtml(integrations?.footerScript, "footer-script")}
      </body>
    </html>
  );
}
