import type { Metadata } from "next";
import { Toaster } from "@agency/ui";
import { manrope, playfairDisplay, ibmPlexMono } from "@/lib/fonts";
import { getNav, getSettings } from "@/lib/api";
import { withFallback } from "@/lib/safe-fetch";
import { resolveBranding } from "@/lib/branding";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { env } from "@/lib/env";
import { TrackingScripts } from "@/lib/tracking";
import { renderRawHtml } from "@/lib/raw-html-to-elements";
import { extractGoogleSiteVerificationCode } from "@/lib/seo-verification";
import { getInfluencerFlags } from "@/lib/influencer-flags";
import { AuthModalProvider } from "@/components/influencer/auth-modal-provider";
import "./globals.css";

// Dynamic (not a static `export const metadata`) so the template suffix
// tracks the actual configured brand name from Settings instead of a
// hardcoded string that goes stale the moment the site is rebranded --
// every child page's title was getting "| MAB Digital" appended
// regardless of what the business is actually called today.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings().catch(() => null);
  const brandName = resolveBranding(settings ?? {}, "MAB Digital").name;
  const googleVerification = extractGoogleSiteVerificationCode(settings?.integrations?.googleSiteVerification);

  return {
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    title: {
      default: `${brandName} — Premium Web Design & Engineering`,
      template: `%s | ${brandName}`,
    },
    description: `${brandName} designs and engineers premium web products for startups and teams who refuse to ship something average.`,
    ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [headerNav, footerNav, settings, influencerFlags] = await Promise.all([
    withFallback(getNav("HEADER"), [], "header navigation"),
    withFallback(getNav("FOOTER"), [], "footer navigation"),
    withFallback(getSettings(), {}, "site settings"),
    getInfluencerFlags(),
  ]);

  const branding = resolveBranding(settings, "MAB Digital");

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.company_name ?? "MAB Digital",
    url: env.NEXT_PUBLIC_SITE_URL,
    email: settings.contact_email,
    telephone: settings.contact_phone,
    address: settings.address,
    sameAs: Object.values(settings.socials ?? {}),
  };

  const integrations = settings.integrations;

  return (
    <html lang="en" className={`${manrope.variable} ${playfairDisplay.variable} ${ibmPlexMono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {renderRawHtml(integrations?.headScript, "head-script")}
        {renderRawHtml(integrations?.bodyScript, "body-script")}
        <TrackingScripts integrations={integrations} />
        <AuthModalProvider registrationFlags={influencerFlags}>
          <SiteHeader navItems={headerNav} branding={branding} />
          <main className="pt-32">{children}</main>
          <SiteFooter navItems={footerNav} settings={settings} branding={branding} />
        </AuthModalProvider>
        <Toaster />
        {renderRawHtml(integrations?.footerScript, "footer-script")}
      </body>
    </html>
  );
}
