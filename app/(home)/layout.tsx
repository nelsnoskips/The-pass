import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./home.css";

const mono = Geist_Mono({ variable: "--font-hm-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "The Pass — one agent runs your front of house",
  description:
    "Bookings, the floor, online orders, texts, reviews, your website and your ads. The Pass does the work and shows you every move before it reaches a guest. No per-cover fees.",
  // Not indexed until it replaces the studio homepage at /.
  robots: { index: false, follow: false },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <div className={`hm ${mono.variable}`}>{children}</div>;
}
