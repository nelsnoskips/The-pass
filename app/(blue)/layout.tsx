import type { Metadata } from "next";
import { Bodoni_Moda, Manrope } from "next/font/google";
import { BlueHeader } from "@/components/blue/BlueHeader";
import { BlueMotion } from "@/components/blue/BlueMotion";
import "./blue.css";

/* The room's pairing, scoped to this route rather than the root layout:
   loaded in the root it would preload two extra families on every page
   of the app that never renders a word of them. */
const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BLUE at the Gale South Beach — Dinner, live music, and the night that follows",
  description:
    "One seating, two sets and the hours after, beneath the Gale South Beach. Dinner at eight, the first note at nine, 1690 Collins Avenue.",
  // A studio concept, not a real venue: keep it out of the index.
  robots: { index: false, follow: false },
};

export default function BlueLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`blu ${bodoni.variable} ${manrope.variable} min-h-screen`}>
      <script
        // The cinematic layout is chosen before first paint, so the still
        // hero never flashes on its way to the pinned stage. BlueMotion
        // repeats the same check idempotently and owns the teardown.
        dangerouslySetInnerHTML={{
          __html:
            "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('blu-cine')}catch(e){}",
        }}
      />
      <BlueMotion />
      <BlueHeader />
      {children}
    </div>
  );
}
