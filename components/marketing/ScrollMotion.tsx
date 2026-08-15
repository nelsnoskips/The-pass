"use client";

import { useEffect } from "react";

/**
 * Fallback scroll motion for browsers without CSS scroll-driven
 * animations (Safari < 26, older Firefox). Reproduces the same four
 * effects globals.css defines — hero art parallax, hero copy lift,
 * section reveals, in-frame photo parallax — with a damped rAF loop, so
 * the motion eases to rest instead of tracking the scroll 1:1.
 *
 * Renders nothing. Does nothing when the CSS path is supported or the
 * guest prefers reduced motion.
 */
export function ScrollMotion() {
  useEffect(() => {
    if (
      CSS.supports("animation-timeline: scroll()") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const q = <T extends Element>(sel: string) =>
      Array.from(document.querySelectorAll<T>(sel));
    const art = q<HTMLElement>(".mk-scroll-art");
    const copy = q<HTMLElement>(".mk-scroll-copy");
    const reveals = q<HTMLElement>(".mk-reveal");
    const parallax = q<HTMLElement>(".mk-parallax");

    const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
    const mix = (a: number, b: number, t: number) => a + (b - a) * t;

    let target = window.scrollY;
    let eased = target;
    let frame = 0;
    let running = false;

    const apply = () => {
      const vh = window.innerHeight;

      const heroP = clamp01(eased / vh);
      for (const el of art) {
        el.style.transform = `scale(1.1) translateY(${mix(-2.5, 4.5, heroP)}%)`;
      }
      const copyP = clamp01(eased / (vh * 0.9));
      for (const el of copy) {
        el.style.opacity = String(mix(1, 0.15, copyP));
        el.style.transform = `translateY(${mix(0, -7, copyP)}%)`;
      }
      // Reveals scrub over the element's entry into the viewport,
      // approximating animation-range: entry 8% entry 52%.
      for (const el of reveals) {
        const r = el.getBoundingClientRect();
        const entered = (vh - r.top) / Math.min(r.height, vh * 0.6);
        const p = clamp01((entered - 0.08) / 0.44);
        el.style.opacity = String(p);
        el.style.transform = `translateY(${mix(26, 0, p)}px)`;
      }
      // Photography drifts inside its frame across the whole viewport
      // crossing, approximating animation-range: cover.
      for (const el of parallax) {
        const r = el.getBoundingClientRect();
        const p = clamp01((vh - r.top) / (vh + r.height));
        el.style.transform = `scale(1.12) translateY(${mix(-3.5, 3.5, p)}%)`;
      }
    };

    const tick = () => {
      eased += (target - eased) * 0.12;
      apply();
      if (Math.abs(target - eased) > 0.4) {
        frame = requestAnimationFrame(tick);
      } else {
        eased = target;
        apply();
        running = false;
      }
    };

    const wake = () => {
      target = window.scrollY;
      if (!running) {
        running = true;
        frame = requestAnimationFrame(tick);
      }
    };

    wake();
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
    };
  }, []);

  return null;
}
