"use client";

import { motion } from "framer-motion";

/** Dim, slow orbs for dark luxury pages (e.g. /membership) */
export function MembershipAura() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <motion.div
        className="absolute h-[70vmax] w-[70vmax] rounded-full opacity-[0.12]"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.25) 0%, rgba(212,175,55,0.06) 45%, transparent 65%)",
          filter: "blur(100px)",
          left: "5%",
          top: "10%",
        }}
        animate={{
          x: [0, 40, -30, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.08, 0.96, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute h-[60vmax] w-[60vmax] rounded-full opacity-[0.1]"
        style={{
          background:
            "radial-gradient(circle, rgba(249,247,242,0.15) 0%, rgba(249,247,242,0.04) 50%, transparent 70%)",
          filter: "blur(120px)",
          right: "0%",
          bottom: "5%",
        }}
        animate={{
          x: [0, -50, 35, 0],
          y: [0, 25, -40, 0],
          scale: [1, 0.92, 1.1, 1],
        }}
        transition={{
          duration: 32,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
