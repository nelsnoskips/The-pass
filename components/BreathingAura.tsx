"use client";

import { motion } from "framer-motion";

export function BreathingAura() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {/* Deep Forest Green orb */}
      <motion.div
        className="absolute h-[600px] w-[600px] rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(26,60,52,0.5) 0%, rgba(26,60,52,0.15) 50%, transparent 70%)",
          filter: "blur(100px)",
          left: "10%",
          top: "20%",
        }}
        animate={{
          x: [0, 60, -40, 0],
          y: [0, -50, 30, 0],
          scale: [1, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Muted Sage orb */}
      <motion.div
        className="absolute h-[500px] w-[500px] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(212,220,214,0.6) 0%, rgba(212,220,214,0.2) 50%, transparent 70%)",
          filter: "blur(120px)",
          right: "5%",
          bottom: "10%",
        }}
        animate={{
          x: [0, -80, 50, 0],
          y: [0, 40, -60, 0],
          scale: [1, 0.9, 1.2, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
