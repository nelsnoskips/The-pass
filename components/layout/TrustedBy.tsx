"use client";

import { motion } from "framer-motion";

const brands = [
  "Allergan",
  "Dysport",
  "Galderma",
  "Merz",
  "Revance",
];

export function TrustedBy() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      className="border-y border-[#e4e4e7] bg-white py-8"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-6 text-center text-sm font-medium tracking-widest text-[#a1a1aa] uppercase">
          Trusted By
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {brands.map((brand, i) => (
            <span
              key={brand}
              className="text-lg font-semibold text-[#a1a1aa] grayscale transition hover:grayscale-0 hover:text-[#52525b]"
              style={{ filter: "grayscale(1)" }}
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
