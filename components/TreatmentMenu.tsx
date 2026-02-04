"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface TreatmentItem {
  name: string;
  price: string;
  description: string;
}

const treatments: TreatmentItem[] = [
  {
    name: "Botox",
    price: "from $399",
    description: "Smooth lines with precision. FDA-approved neurotoxin.",
  },
  {
    name: "Dermal Filler",
    price: "from $649",
    description: "Restore volume and contour. Hyaluronic acid–based.",
  },
  {
    name: "Laser Resurfacing",
    price: "from $899",
    description: "Improve texture and tone. Fractional or full-face.",
  },
  {
    name: "Chemical Peel",
    price: "from $249",
    description: "Reveal brighter skin. Custom depth and formulation.",
  },
  {
    name: "Microneedling",
    price: "from $449",
    description: "Stimulate collagen. Minimal downtime.",
  },
];

export function TreatmentMenu() {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <section id="treatments" className="relative border-t border-[#D4DCD6]/60 bg-[#F9F7F2] py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display mb-16 text-center text-3xl text-[#1A3C34] md:text-4xl">
          Treatments
        </h2>

        <ul className="list-none">
          {treatments.map((item, index) => (
            <li
              key={item.name}
              onMouseEnter={() => setHoveredId(index)}
              onMouseLeave={() => setHoveredId(null)}
              className="group border-b border-[#D4DCD6]/80 py-5 transition-colors"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <span
                  className={`font-display text-2xl transition-colors sm:text-3xl ${
                    hoveredId === index ? "text-[#1A3C34]" : "text-[#1A3C34]/70"
                  }`}
                >
                  {item.name}
                </span>
                <span
                  className={`text-technical transition-colors ${
                    hoveredId === index ? "text-[#1A3C34]" : "text-[#1A3C34]/60"
                  }`}
                >
                  {item.price}
                </span>
              </div>
              <AnimatePresence>
                {hoveredId === index && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mt-2 overflow-hidden font-display text-sm italic text-[#1A3C34]/80"
                  >
                    {item.description}
                  </motion.p>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
