import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { LangProvider } from "@/lib/i18n";
import "./globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Nara Agent",
  description: "An Arabic-first agent that prepares a verified study-abroad application pack for counsellor review.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${plexArabic.variable} antialiased`}>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
