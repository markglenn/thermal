import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const helveticaBoldCondensed = localFont({
  src: "../fonts/HelveticaBoldCondensedCustom.ttf",
  variable: "--font-zpl-0",
  weight: "400 700",
});

const dejaVuSansMono = localFont({
  src: [
    { path: "../fonts/DejaVuSansMono.ttf", weight: "400" },
    { path: "../fonts/DejaVuSansMonoBold.ttf", weight: "700" },
  ],
  variable: "--font-zpl-bitmap",
});

export const metadata: Metadata = {
  title: { default: "Thermal", template: "%s — Thermal" },
  description: "WYSIWYG editor for Zebra printer labels",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${helveticaBoldCondensed.variable} ${dejaVuSansMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
