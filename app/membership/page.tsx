"use client";

import { motion } from "framer-motion";
import { MembershipAura } from "@/components/MembershipAura";
import { MembershipCard } from "@/components/membership/MembershipCard";

const NOISE_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

export default function MembershipPage() {
  return (
    <div className="relative min-h-screen bg-[#0A221C]">
      <MembershipAura />
      {/* Subtle noise over page */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-30 mix-blend-soft-light"
        style={{ backgroundImage: `url("${NOISE_SVG}")` }}
        aria-hidden
      />

      <main className="relative z-10 px-4 py-20 md:py-28">
        <motion.header
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h1 className="font-editorial text-4xl text-[#F9F7F2] sm:text-5xl md:text-6xl lg:text-7xl">
            Sanctuary, Reserved.
          </h1>
          <p className="mt-5 font-sans text-sm leading-relaxed text-[#F9F7F2]/75 md:text-base">
            A limited membership for those dedicated to the ritual of self-care.
          </p>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10"
        >
          <MembershipCard
            title="The Maintenance"
            price="$199/mo"
            description="Priority booking and one signature facial per month. Your ritual, guaranteed."
            variant="glass"
          />
          <MembershipCard
            title="The Signature"
            price="$399/mo"
            description="The inner circle. Full access to treatments, member-only events, and dedicated support."
            variant="glass"
          />
          <MembershipCard
            title="The Black Card"
            description="Concierge service. By invitation only. Bespoke protocols and unlimited access."
            variant="black"
          />
        </motion.section>
      </main>
    </div>
  );
}
