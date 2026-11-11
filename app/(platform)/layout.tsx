import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./platform.css";

/* The platform's own typeface pair, scoped here so restaurant sites and
   the studio site never load it: a precise grotesk for words, its mono
   for every number a host scans. */
const mono = Geist_Mono({ variable: "--font-pf-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "The Pass",
  robots: { index: false, follow: false },
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <div className={`pf ${mono.variable}`}>{children}</div>;
}
