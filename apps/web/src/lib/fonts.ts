import { Manrope, Playfair_Display, IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";

export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

// Headings (Noir Lime): Syne is a variable font (600-800 in one file), self-hosted
// from src/fonts. Loaded locally rather than via next/font/google because the
// Google loader fails to resolve Syne's font-file URL at build time.
export const syne = localFont({
  src: "../fonts/syne-latin.woff2",
  weight: "600 800",
  style: "normal",
  variable: "--font-syne",
  display: "swap",
});

export const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  style: ["italic", "normal"],
});

export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});
