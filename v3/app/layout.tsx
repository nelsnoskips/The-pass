import type { Metadata } from "next";
import { Bebas_Neue, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

/* The brand system's three voices: Bebas for the big condensed
   headlines, Inter for everything a person reads or clicks, Plex Mono
   for the technical register — eyebrows, states, timestamps. */
const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orravan | The Building Knows. Now You Do.",
  description:
    "Orravan turns what your building already knows into plain language, a clear priority and a recommended next step — then documents the resolution. Building automation, HVAC, remote monitoring and inventory.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable} ${plex.variable}`}>
      <body>{children}</body>
    </html>
  );
}
