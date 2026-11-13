import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by Next.js: no request to Google Fonts from the visitor's browser, and no render-blocking
// stylesheet. `display: swap` shows fallback text first; the CSS fallbacks are Georgia, Arial and Courier New.
const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"], display: "swap", variable: "--font-display", fallback: ["Georgia", "serif"] });
const ui = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-ui", fallback: ["Arial", "sans-serif"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-mono", fallback: ["Courier New", "monospace"] });

export const metadata: Metadata = {
  title: "THE HAUNT — Keep life's loose ends from coming back to haunt you",
  description:
    "A personal commitments manager for the things you cannot afford to forget.",
  applicationName: "THE HAUNT",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "THE HAUNT",
  },
};

export const viewport: Viewport = {
  themeColor: "#080b0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-ZA" className={`${display.variable} ${ui.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
