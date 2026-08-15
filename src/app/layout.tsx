import type { Metadata } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ClientToaster } from "@/components/cryptosieve/client-toaster";
import { I18nProvider, ThemeScript } from "@/i18n/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CryptoSieve — Crypto Investment Decision Engine",
  description:
    "Discover → Verify → Evaluate → Value → Decide. A locked-framework decision engine for the crypto market with pluggable free data sources.",
  keywords: ["CryptoSieve", "crypto", "investment", "decision engine", "DeFi", "scoring"],
  authors: [{ name: "CryptoSieve" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "CryptoSieve — Crypto Investment Decision Engine",
    description: "Discover → Verify → Evaluate → Value → Decide",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable} antialiased bg-background text-foreground`}
      >
        <I18nProvider>
          {children}
          <Toaster />
          <ClientToaster />
        </I18nProvider>
      </body>
    </html>
  );
}
