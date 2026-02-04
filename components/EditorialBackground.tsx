"use client";

import { motion } from "framer-motion";

export function EditorialBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Animated gradient orbs – Teal & Sage */}
      <motion.div
        className="absolute h-[80vmax] w-[80vmax] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(13,148,136,0.35) 0%, rgba(13,148,136,0.08) 45%, transparent 65%)",
          filter: "blur(100px)",
          left: "-20%",
          top: "-10%",
        }}
        animate={{
          x: [0, 80, -60, 0],
          y: [0, -40, 60, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute h-[70vmax] w-[70vmax] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(212,220,214,0.5) 0%, rgba(212,220,214,0.12) 50%, transparent 70%)",
          filter: "blur(120px)",
          right: "-15%",
          bottom: "-20%",
        }}
        animate={{
          x: [0, -100, 70, 0],
          y: [0, 50, -80, 0],
          scale: [1, 0.85, 1.15, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Noise/grain texture overlay */}
      <div
        className="noise-overlay fixed inset-0 pointer-events-none z-[1]"
        style={{ mixBlendMode: "overlay" }}
      />
    </div>
  );
}
