import type { Metadata } from "next";
import { Bebas_Neue, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/analytics";

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

/* The review mock builds under a path (MOCK_BASE) and stays out of
   search; the launch build sits at the root of orravan.ai and is indexed. */
const isMock = Boolean(process.env.MOCK_BASE);

export const metadata: Metadata = {
  metadataBase: new URL("https://orravan.ai"),
  title: "Orravan | The Building Knows. Now You Do.",
  description:
    "Orravan turns what your building already knows into plain language, a clear priority and a recommended next step — then documents the resolution. Building automation, HVAC, remote monitoring and inventory.",
  robots: isMock ? { index: false, follow: false } : { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${bebas.variable} ${plex.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
