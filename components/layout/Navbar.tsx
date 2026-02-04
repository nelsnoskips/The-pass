"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/membership", label: "Membership" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [compact, setCompact] = useState(false);
  const { scrollY } = useScroll();
  const prevScrollY = useRef(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setCompact(latest > prevScrollY.current && latest > 60);
    prevScrollY.current = latest;
  });

  return (
    <header className="sticky top-0 z-50 flex justify-center px-4 pt-4 md:pt-6">
      <motion.nav
        layout
        initial={false}
        animate={{
          scale: compact ? 0.94 : 1,
          paddingTop: compact ? 10 : 14,
          paddingBottom: compact ? 10 : 14,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
        className="relative flex w-full max-w-2xl items-center justify-between rounded-full border border-white/20 bg-white/80 px-6 shadow-lg backdrop-blur-md md:px-8"
      >
        {/* Logo – serif, far left */}
        <Link
          href="/"
          className="font-display relative z-10 text-lg font-bold tracking-tight text-[#0f281e] md:text-xl"
        >
          Aesthetix
        </Link>

        {/* Center links with sliding pill */}
        <div className="relative flex items-center gap-1 md:gap-2">
          {navLinks.map((link, i) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="relative z-10 flex py-2.5 px-3 text-sm font-medium text-[#0f281e]/85 transition-colors hover:text-[#0f281e] md:px-4 md:text-[15px]"
            >
              {hoveredIndex === i && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-[#0f281e]/8"
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}
              <span className="relative z-10">{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Book Now – sage green pill, far right */}
        <div className="relative z-10">
          <button
            type="button"
            onClick={() =>
              document.dispatchEvent(new CustomEvent("open-booking-modal"))
            }
            className="rounded-full bg-[#1A3C34] px-5 py-2.5 text-sm font-medium text-[#F9F7F2] shadow-md transition-all hover:bg-[#0f281e] active:scale-[0.98] md:px-6 md:py-2.5 md:text-[15px]"
          >
            Book Now
          </button>
        </div>
      </motion.nav>
    </header>
  );
}
