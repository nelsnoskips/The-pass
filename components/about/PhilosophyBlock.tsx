"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

export function PhilosophyBlock() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section ref={ref} className="relative py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <motion.p
          initial={{ opacity: 0, y: 32 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="font-editorial text-4xl leading-tight text-[#0f281e] sm:text-5xl md:text-6xl lg:text-7xl"
        >
          We do not fight aging. We curate it.
        </motion.p>
      </div>
    </section>
  );
}
