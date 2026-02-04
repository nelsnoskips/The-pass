"use client";

import { EditorialBackground } from "@/components/EditorialBackground";
import { EditorialHero } from "@/components/layout/EditorialHero";
import { EditorialStorySection } from "@/components/EditorialStorySection";

export default function Home() {
  return (
    <main className="relative">
      {/* Fixed z-0: animated orbs + noise overlay (in EditorialBackground) */}
      <EditorialBackground />

      {/* Hero: full-screen, image + glass overlay, huge italic serif */}
      <section className="relative z-10">
        <EditorialHero />
      </section>

      {/* Story: sticky left text, scrolling right gallery – transparent/blur so background shows */}
      <EditorialStorySection />

      {/* Spacer for sticky footer on mobile */}
      <div className="h-24 md:hidden" />
    </main>
  );
}
