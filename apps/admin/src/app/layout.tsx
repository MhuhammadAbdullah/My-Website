import type { Metadata } from "next";
import { Toaster } from "@agency/ui";
import { manrope, playfairDisplay, ibmPlexMono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Admin | Calibre Digital",
    template: "%s | Calibre Digital Admin",
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${playfairDisplay.variable} ${ibmPlexMono.variable}`}>
      <body className="bg-neutral-50">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
