import type { Metadata } from "next";
import { DM_Serif_Display, Instrument_Serif, Inter } from "next/font/google";
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
  title: "The Pass by Madison Four — Restaurant Growth, Conducted.",
  description:
    "Madison Four connects strategy, creative, technology, and conversion into one complete guest experience — with The Pass, our proprietary restaurant intelligence platform.",
  openGraph: {
    title: "The Pass by Madison Four",
    description: "Restaurant growth, conducted.",
    type: "website",
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
    </html>
  );
}
