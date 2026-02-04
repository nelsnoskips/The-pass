"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

/** SVG signature that draws itself when in view (pathLength animation) */
export function FounderSignature() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <div ref={ref} className="mt-10">
      <motion.svg
        viewBox="0 0 320 80"
        className="h-16 w-auto max-w-[280px] text-[#0f281e]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Cursive-style signature path: draws as one continuous stroke */}
        <motion.path
          d="M18 54 Q28 42 42 48 Q56 54 52 64 Q48 74 36 72 Q24 70 22 58 Q20 46 32 44 Q44 42 52 50 L58 54 M62 48 Q72 40 84 46 Q96 52 94 62 Q92 72 80 74 Q68 76 64 66 Q60 56 70 52 L76 56 M82 44 Q92 38 102 44 Q112 50 110 60 Q108 70 98 72 Q88 74 84 64 L88 58 M98 52 Q108 46 118 52 Q128 58 126 68 Q124 78 114 80 Q104 82 100 72 L104 66 M118 54 Q128 48 138 54 Q148 60 136 70 L130 64 M150 50 Q160 44 170 50 Q180 56 178 66 Q176 76 166 78 Q156 80 152 70 L156 64 M172 52 Q182 46 192 52 Q202 58 200 68 Q198 78 188 80 Q178 82 174 72 L178 66 M194 54 Q204 48 214 54 Q224 60 222 70 Q220 80 210 82 Q200 84 196 74 L200 68 M218 56 Q228 50 238 56 Q248 62 246 72 L242 66"
          initial={{ pathLength: 0.001 }}
          animate={{ pathLength: isInView ? 1 : 0.001 }}
          transition={{ duration: 2.2, ease: "easeInOut" }}
        />
      </motion.svg>
      <p className="mt-2 font-sans text-xs uppercase tracking-widest text-[#0f281e]/70">
        Dr. Alexandra Reed, Founder
      </p>
    </div>
  );
}
