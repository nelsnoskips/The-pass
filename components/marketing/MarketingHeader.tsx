"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import clsx from "clsx";
import { Wordmark } from "./PassMark";

const NAV = [
  { href: "#craft", label: "The Craft" },
  { href: "#digital-experiences", label: "Digital Experiences" },
  { href: "#about", label: "Our Story" },
];

/**
 * Transparent over the hero; becomes a solid ink surface after scrolling.
 */
export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled || open
          ? "bg-[#0A0A09]/95 backdrop-blur-sm shadow-[0_1px_0_rgba(183,154,104,0.25)]"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link href="/" aria-label="The Pass by Madison Four — home">
          <Wordmark tone="light" compact />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="mk-label group relative py-1 text-[#F1EDE5]/75 transition-colors hover:text-[#F1EDE5]"
            >
              {item.label}
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-[#B79A68] transition-transform duration-300 group-hover:scale-x-100"
              />
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          <Link
            href="/dashboard"
            className="mk-label flex items-center gap-1.5 text-[#F1EDE5]/70 transition-colors hover:text-[#F1EDE5]"
          >
            <span aria-hidden className="h-1 w-1 rounded-full bg-[#83A978]" />
            Client Login
          </Link>
          <a
            href="#consultation"
            className="mk-label border border-[#B79A68]/60 px-4 py-2.5 text-[#F1EDE5] transition-colors hover:border-[#B79A68] hover:bg-[#B79A68]/10"
          >
            Request a Consultation
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="p-1.5 text-[#F1EDE5] lg:hidden"
        >
          {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
        </button>
      </div>

      {open && (
        <nav
          aria-label="Mobile"
          className="border-t border-[#B79A68]/20 bg-[#0A0A09] px-5 pb-8 pt-4 lg:hidden"
        >
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 font-editorial text-[24px] text-[#F1EDE5]"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-3">
            <a
              href="#consultation"
              onClick={() => setOpen(false)}
              className="mk-label border border-[#B79A68]/60 px-4 py-3.5 text-center text-[#F1EDE5]"
            >
              Request a Consultation
            </a>
            <Link
              href="/dashboard"
              className="mk-label py-2 text-center text-[#F1EDE5]/70"
            >
              Client Login
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
