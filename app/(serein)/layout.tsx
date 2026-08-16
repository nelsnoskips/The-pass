import type { Metadata } from "next";
import { SereinHeader } from "@/components/serein/SereinHeader";
import { SereinMotion } from "@/components/serein/SereinMotion";
import "./serein.css";

export const metadata: Metadata = {
  title: "SEREIN — A coastal tasting room in Santa Barbara",
  description:
    "Ten courses at the edge of the Pacific, served as the light leaves. Thirty seats, Thursday through Monday, in Santa Barbara.",
  // A studio concept, not a real restaurant: keep it out of the index.
  robots: { index: false, follow: false },
};

export default function SereinLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="srn min-h-screen">
      <script
        // Switch the hero to its cinematic layout before first paint so
        // the still frame never flashes. SereinMotion repeats this
        // check idempotently and selects the engine.
        dangerouslySetInnerHTML={{
          __html:
            "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('srn-cine')}catch(e){}",
        }}
      />
      <SereinMotion />
      <SereinHeader />
      {children}
    </div>
  );
}
