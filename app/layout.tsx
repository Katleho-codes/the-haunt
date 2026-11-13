import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

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
    <html lang="en-ZA">
      <body>{children}</body>
    </html>
  );
}
