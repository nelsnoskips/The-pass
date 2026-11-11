import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./home.css";

const sans = Geist({ variable: "--font-hm-sans", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-hm-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "The Pass — the restaurant platform run by agents you can see",
  description:
    "Website, reservations, guest list, texts, reviews and ads in one platform, with AI agents that do the work and show you every move before it happens. No per-cover fees.",
  // Not indexed until it replaces the studio homepage at /.
  robots: { index: false, follow: false },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <div className={`hm ${sans.variable} ${mono.variable}`}>{children}</div>;
}
