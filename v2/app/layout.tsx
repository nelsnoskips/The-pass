import type { Metadata } from "next";
import { Inter, Kaushan_Script, Oswald } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", display: "swap" });
const script = Kaushan_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orravan Mechanical | Every Signal Has a Next Move",
  description:
    "Orravan connects the person servicing the system to the intelligence operating the building — and stays with it through resolution. Commercial HVAC, controls and monitoring. Long Beach, CA.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable} ${script.variable}`}>
      <body>{children}</body>
    </html>
  );
}
