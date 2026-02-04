"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1552693673-1bf958298935?q=80&w=2946&auto=format&fit=crop";

export function EditorialHero() {
  return (
    <section className="relative flex h-screen w-full items-center justify-center">
      {/* Background image – plain img, object-cover */}
      <div className="absolute inset-0 z-0">
        <img
          src={HERO_IMAGE}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      {/* Glass overlay for readability */}
      <div
        className="absolute inset-0 z-[2] bg-[#0f281e]/40 backdrop-blur-[2px]"
        aria-hidden
      />
      {/* Content – centered, huge serif italic */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="font-editorial text-6xl leading-[0.95] text-white drop-shadow-lg sm:text-7xl md:text-8xl lg:text-9xl"
        >
          The Science of Natural.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-technical mt-8 text-white/90"
        >
          Medical grade results in a sanctuary setting.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12"
        >
          <Button
            variant="primary"
            size="lg"
            onClick={() =>
              document.dispatchEvent(new CustomEvent("open-booking-modal"))
            }
            className="border border-white/30 bg-white/20 text-white backdrop-blur-md hover:bg-white/30"
          >
            Book Consultation
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
