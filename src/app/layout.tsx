import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL.trim()}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Cricket Dues Tracker",
  description: "Track match fees and player dues",
  openGraph: {
    title: "Cricket Dues Tracker",
    description: "Match fees — unpaid and paid at a glance",
    url: "/",
    siteName: "Cricket Dues Tracker",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cricket Dues Tracker",
    description: "Match fees — unpaid and paid at a glance",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
