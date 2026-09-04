"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { NAV, VENUE } from "@/lib/blue";

/**
 * The house bar. Transparent over the hero so the curtains open on an
 * uninterrupted room, then a 90% blue-black bar once the page begins.
 *
 * That state is a plain scroll listener rather than part of the scrub
 * engine, so it behaves identically in every browser and under reduced
 * motion: a guest who arrives ready to book can always find Reserve.
 */
export function BlueHeader() {
  const [past, setPast] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > window.innerHeight * 0.62);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A menu that stays open behind a closed drawer is a trap on a phone.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        past || open ? "bg-[#030812]/90 backdrop-blur-[6px]" : "bg-transparent",
      )}
    >
      <div className="blu-shell flex h-[68px] items-center justify-between gap-8 md:h-[84px]">
        <a href="#top" className="flex flex-col leading-none" aria-label={`${VENUE.name} — top of page`}>
          <span className="blu-display text-[22px] tracking-[0.4em] md:text-[26px]">BLUE</span>
          <span className="blu-label mt-[6px] text-[9px] tracking-[0.24em] text-[#BEBAB2] md:text-[10px]">
            At the Gale South Beach
          </span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-9 lg:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="blu-label text-[#BEBAB2] transition-colors hover:text-[#F1EDE4]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a href="#reserve" className="blu-btn blu-label hidden sm:inline-flex">
            Reserve
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="blu-menu"
            className="blu-label flex h-11 min-w-11 items-center justify-center gap-2 px-2 text-[#F1EDE4] lg:hidden"
          >
            <span className="sr-only sm:not-sr-only">{open ? "Close" : "Menu"}</span>
            <span aria-hidden className="flex w-5 flex-col gap-[5px]">
              <span className="h-px w-full bg-current" />
              <span className="h-px w-full bg-current" />
            </span>
          </button>
        </div>
      </div>

      <div
        id="blu-menu"
        hidden={!open}
        className="border-t border-[rgba(241,237,228,0.18)] bg-[#030812]/95 lg:hidden"
      >
        <nav aria-label="Primary, compact" className="blu-shell flex flex-col py-4">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="blu-label flex min-h-[48px] items-center border-b border-[rgba(241,237,228,0.1)] text-[#BEBAB2]"
            >
              {item.label}
            </a>
          ))}
          <a
            href="#reserve"
            onClick={() => setOpen(false)}
            className="blu-btn blu-btn-primary blu-label mt-5 sm:hidden"
          >
            Reserve
          </a>
        </nav>
      </div>
    </header>
  );
}
