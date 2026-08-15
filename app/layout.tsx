import type { Metadata } from "next";
import { DM_Serif_Display, Instrument_Serif, Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://madisonfour.com"),
  title: "The Pass by Madison Four | Restaurant Websites, Crafted.",
  description:
    "The Pass by Madison Four is a design studio for restaurants: custom websites, search and AI visibility, and guest-first digital experiences.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "The Pass by Madison Four",
    description: "Restaurant websites, crafted.",
    type: "website",
    url: "https://madisonfour.com",
    siteName: "Madison Four",
    images: [{ url: "/images/hero-pass.jpg", width: 1200, height: 800 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${instrumentSerif.variable} ${inter.variable}`}
    >
      <body className="min-h-screen antialiased">{children}</body>
      <GoogleAnalytics gaId="G-FCXWZB4R7M" />
    </html>
  );
}
