"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { FounderSignature } from "@/components/about/FounderSignature";
import { PhilosophyBlock } from "@/components/about/PhilosophyBlock";
import { SpaceGallery } from "@/components/about/SpaceGallery";

const FOUNDER_IMAGE =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2864&auto=format&fit=crop";

export default function AboutPage() {
  const letterRef = useRef(null);
  const isInView = useInView(letterRef, { once: true, amount: 0.2 });

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#0f281e]">
      {/* Section 1: Founder's Letter – split screen */}
      <section className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <div className="relative min-h-[50vh] lg:min-h-full">
          <img
            src={FOUNDER_IMAGE}
            alt=""
            className="h-full w-full object-cover object-top"
          />
        </div>
        <div
          ref={letterRef}
          className="flex flex-col justify-center px-6 py-16 lg:px-12 lg:py-24"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="font-editorial text-3xl text-[#0f281e] md:text-4xl"
          >
            Why I started Aesthetix
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 space-y-4 font-sans text-[#0f281e]/90 leading-relaxed"
          >
            <p>
              I spent years in dermatology watching people chase a single idea of
              “perfect” skin—often at the cost of what made their face theirs.
              Aesthetix exists because I wanted a place that treats the whole
              person, not just a checklist of concerns.
            </p>
            <p>
              Here we don’t fight aging; we work with it. Every treatment is
              chosen to enhance your natural structure and skin, so you look like
              yourself—refined, rested, and at ease. This is the standard I hold
              for my own practice and the one I want for everyone who walks
              through our door.
            </p>
          </motion.div>
          <FounderSignature />
        </div>
      </section>

      {/* Section 2: Philosophy */}
      <PhilosophyBlock />

      {/* Section 3: The Space – masonry gallery with parallax */}
      <SpaceGallery />
    </div>
  );
}
