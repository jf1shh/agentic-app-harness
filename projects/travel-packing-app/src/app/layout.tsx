import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LoggerInit from "../components/LoggerInit";
import { I18nProvider } from "../i18n/context";

// Self-hosted via next/font so the page fetches no render-blocking Google Fonts
// stylesheet at runtime (the old globals.css `@import` did exactly that, and
// the Geist/Geist_Mono fonts it was bundled with were never referenced by any
// shipped stylesheet). Inter stays the app typeface, per the spec.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SmartPack",
  description: "A wardrobe analyzer and packing optimizer that schedules outfits and packing physics for your trip.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <LoggerInit />
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
