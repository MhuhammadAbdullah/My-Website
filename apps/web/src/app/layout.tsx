import type { Metadata } from "next";
import { Toaster } from "@agency/ui";
import { manrope, playfairDisplay, ibmPlexMono } from "@/lib/fonts";
import { getNav, getSettings } from "@/lib/api";
import { resolveBranding } from "@/lib/branding";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { env } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "Calibre Digital — Premium Web Design & Engineering",
    template: "%s | Calibre Digital",
  },
  description:
    "Calibre Digital designs and engineers premium web products for startups and teams who refuse to ship something average.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [headerNav, footerNav, settings] = await Promise.all([
    getNav("HEADER"),
    getNav("FOOTER"),
    getSettings(),
  ]);

  const branding = resolveBranding(settings, "Calibre Digital");

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.company_name ?? "Calibre Digital",
    url: env.NEXT_PUBLIC_SITE_URL,
    email: settings.contact_email,
    telephone: settings.contact_phone,
    address: settings.address,
    sameAs: Object.values(settings.socials ?? {}),
  };

  return (
    <html lang="en" className={`${manrope.variable} ${playfairDisplay.variable} ${ibmPlexMono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <SiteHeader navItems={headerNav} branding={branding} />
        <main className="pt-32">{children}</main>
        <SiteFooter navItems={footerNav} settings={settings} branding={branding} />
        <Toaster />
      </body>
    </html>
  );
}
