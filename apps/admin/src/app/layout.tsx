import type { Metadata, Viewport } from "next";
import { PwaInstallPrompt, PwaRegister, Toaster } from "@agency/ui";
import { manrope, playfairDisplay, ibmPlexMono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | Admin",
  },
  robots: { index: false, follow: false },
  applicationName: "Admin",
  appleWebApp: { capable: true, title: "Admin", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  other: { "apple-mobile-web-app-capable": "yes" },
  icons: { apple: [{ url: "/pwa-icon/180", sizes: "180x180", type: "image/png" }] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b0b0c" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${playfairDisplay.variable} ${ibmPlexMono.variable}`}>
      <body className="bg-neutral-50">
        {children}
        <Toaster />
        <PwaRegister enabled={process.env.NODE_ENV === "production"} />
        <PwaInstallPrompt appName="Admin" iconUrl="/pwa-icon/192" />
      </body>
    </html>
  );
}
