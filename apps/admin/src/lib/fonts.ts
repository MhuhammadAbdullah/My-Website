import { Manrope, Playfair_Display, IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";

// Headings (Noir): the same self-hosted Syne the public site uses.
export const syne = localFont({ src: "../fonts/syne-latin.woff2", weight: "600 800", style: "normal", variable: "--font-syne", display: "swap" });


export const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-manrope", display: "swap" });
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
