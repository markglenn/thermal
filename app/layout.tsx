import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto_Condensed, Source_Code_Pro } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const robotoCondensed = Roboto_Condensed({
  variable: "--font-zpl-0",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-zpl-bitmap",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thermal - ZPL Label Editor",
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
        className={`${geistSans.variable} ${geistMono.variable} ${robotoCondensed.variable} ${sourceCodePro.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
