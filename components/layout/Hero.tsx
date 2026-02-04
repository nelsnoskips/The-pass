"use client";

import { motion } from "framer-motion";
import { BreathingAura } from "@/components/BreathingAura";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-4 py-24 text-center">
      <BreathingAura />

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="font-display text-5xl leading-tight text-[#1A3C34] sm:text-6xl md:text-7xl lg:text-8xl"
      >
        The Science of Natural.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-technical mt-6 text-[#1A3C34]/80"
      >
        Medical grade results in a sanctuary setting.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-12"
      >
        <Button
          variant="primary"
          size="lg"
          onClick={() =>
            document.dispatchEvent(new CustomEvent("open-booking-modal"))
          }
        >
          Book Consultation
        </Button>
      </motion.div>
    </section>
  );
}
