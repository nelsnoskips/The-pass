"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Smooth scrolling, because on this page the scroll wheel is an
 * instrument: it is what cooks the burger, and a native scroll's
 * stepped jumps make the cook frames snap rather than travel.
 *
 * Turned off entirely under reduced motion — there, scroll is scroll.
 */

let lenis: Lenis | null = null;

/** Scroll the window to a document position, smoothly if we can. */
export function scrollToY(y: number, immediate = false) {
  if (lenis) {
    lenis.scrollTo(y, { duration: immediate ? 0 : 0.6 });
    return;
  }
  window.scrollTo({ top: y, behavior: immediate ? "auto" : "smooth" });
}

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const instance = new Lenis({
      duration: 0.9,
      // Slightly heavier than default: the hero is a long scrub and the
      // extra weight is what makes turning it up feel like effort.
      wheelMultiplier: 0.9,
      touchMultiplier: 1.6,
    });
    lenis = instance;

    let frame = 0;
    const raf = (time: number) => {
      instance.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      instance.destroy();
      lenis = null;
    };
  }, []);

  return null;
}
