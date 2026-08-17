"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

const NAV = [
  { href: "/serein#menu", label: "Menu" },
  { href: "/serein#room", label: "The Room" },
  { href: "/serein/membership", label: "The Blue Hour" },
];

/**
 * Fixed header over the film: RESERVE is reachable from the first frame,
 * so a guest who arrives ready to book never has to scroll the sequence.
 *
 * The header wordmark would compete with Act I's huge SEREIN, so it fades
 * in only once the guest has moved past the opening frame. That's driven
 * by a plain scroll listener rather than the scroll-timeline engines, so
 * it behaves identically in every browser and in reduced-motion mode.
 */
export function SereinHeader() {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > window.innerHeight * 0.35);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={clsx(
        // Transparent over the film; an ink bar once the page begins, so
        // the cream type never lands on the parchment chapter unreadable.
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        past ? "bg-[#05070B]/92 backdrop-blur-sm" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-5 py-5 sm:px-8">
        <a
          href="#top"
          aria-label="SEREIN, top of page"
          className={clsx(
            "srn-serif text-[19px] tracking-[0.34em] text-[#E9E5DB] transition-opacity duration-500",
            past ? "opacity-100" : "opacity-0",
          )}
        >
          SEREIN
        </a>

        <div className="flex items-center gap-6 sm:gap-8">
          <nav aria-label="Primary" className="hidden items-center gap-8 sm:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="srn-label text-[#E9E5DB]/65 transition-colors hover:text-[#E9E5DB]"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <a
            href="/serein/reserve"
            className="srn-label border border-[#C9884B]/70 px-5 py-3 text-[#E9E5DB] backdrop-blur-[2px] transition-colors hover:bg-[#C9884B] hover:text-[#05070B]"
          >
            Reserve
          </a>
        </div>
      </div>
    </header>
  );
}
