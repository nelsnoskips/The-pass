"use client";

import { useEffect } from "react";

/**
 * Motion director for the marketing page.
 *
 * Adds the .mk-cine class that switches the hero from its still layout
 * to the pinned cinematic stage whenever any motion engine is available
 * (never under prefers-reduced-motion). Browsers with CSS scroll-driven
 * animations then run everything with zero JavaScript per frame; other
 * browsers get the same choreography from the damped rAF loop below,
 * mirroring the keyframes in globals.css.
 *
 * Also hosts the ?motion-debug overlay reporting the active engine.
 */

type Props = { o?: [number, number]; y?: [number, number]; s?: [number, number] };
type Track = {
  sel: string;
  yUnit?: "px" | "%";
  /** [startPercent, props-at-start] pairs; values lerp between stops. */
  kf: [number, Props][];
};

// Mirrors the mk-cine-* keyframes in globals.css (percent of 300vh).
const CINE: Track[] = [
  { sel: ".mk-act-veil", kf: [[0, { o: [0.82, 0.82] }], [45, { o: [0.82, 0.42] }], [100, { o: [0.42, 0.34] }]] },
  { sel: ".mk-act-title", yUnit: "%", kf: [[0, { o: [1, 1], s: [1, 1.04], y: [0, 0] }], [12, { o: [1, 0], s: [1.04, 1.34], y: [0, -6] }], [37, { o: [0, 0], s: [1.34, 1.34], y: [-6, -6] }], [100, { o: [0, 0], s: [1.34, 1.34], y: [-6, -6] }]] },
  { sel: ".mk-act-line1", yUnit: "px", kf: [[0, { o: [0, 0], y: [64, 64] }], [33, { o: [0, 1], y: [64, 0] }], [50, { o: [1, 1], y: [0, 0] }], [72, { o: [1, 0], y: [0, -64] }], [88, { o: [0, 0], y: [-64, -64] }], [100, { o: [0, 0], y: [-64, -64] }]] },
  { sel: ".mk-act-final", yUnit: "px", kf: [[0, { o: [0, 0], y: [48, 48] }], [84, { o: [0, 1], y: [48, 0] }], [97, { o: [1, 1], y: [0, 0] }], [100, { o: [1, 1], y: [0, 0] }]] },
  { sel: ".mk-act-hint", kf: [[0, { o: [0.65, 0] }], [10, { o: [0, 0] }], [100, { o: [0, 0] }]] },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function applyTrack(el: HTMLElement, track: Track, p100: number) {
  let i = 0;
  while (i < track.kf.length - 2 && p100 >= track.kf[i + 1][0]) i++;
  const [start, props] = track.kf[i];
  const end = track.kf[i + 1][0];
  const t = clamp01((p100 - start) / Math.max(end - start, 0.0001));

  if (props.o) {
    const o = mix(props.o[0], props.o[1], t);
    el.style.opacity = String(o);
    if (el.classList.contains("mk-act-veil") || el.classList.contains("mk-act-photo")) {
      // Backdrop layers never toggle visibility.
    } else {
      el.style.visibility = o <= 0.01 ? "hidden" : "visible";
    }
  }
  const parts: string[] = [];
  if (props.s) parts.push(`scale(${mix(props.s[0], props.s[1], t)})`);
  if (props.y) parts.push(`translateY(${mix(props.y[0], props.y[1], t)}${track.yUnit ?? "px"})`);
  if (parts.length) el.style.transform = parts.join(" ");
}

export function ScrollMotion() {
  useEffect(() => {
    const cssPath = CSS.supports("animation-timeline: scroll()");
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!reduced) {
      document.documentElement.classList.add("mk-cine");
    }

    // Diagnostic overlay: visit any marketing page with ?motion-debug to
    // see which motion engine is active and live readouts. Harmless and
    // invisible without the parameter.
    let debugFrame = 0;
    let debugEl: HTMLDivElement | null = null;
    if (new URLSearchParams(window.location.search).has("motion-debug")) {
      debugEl = document.createElement("div");
      debugEl.style.cssText =
        "position:fixed;bottom:12px;left:12px;z-index:9999;background:#0A0A09;color:#F1EDE5;font:12px/1.6 monospace;padding:10px 14px;border:1px solid #B79A68;white-space:pre;pointer-events:none";
      document.body.appendChild(debugEl);
      const readout = () => {
        const title = document.querySelector(".mk-act-title");
        const cs = title ? getComputedStyle(title) : null;
        debugEl!.textContent = [
          `engine: ${reduced ? "OFF (reduced motion)" : cssPath ? "CSS scroll-timeline" : "JS fallback"}`,
          `css support: ${cssPath}`,
          `reduced motion: ${reduced}`,
          `scrollY: ${Math.round(window.scrollY)}`,
          `act I opacity: ${cs ? Number(cs.opacity).toFixed(2) : "n/a"}`,
        ].join("\n");
        debugFrame = requestAnimationFrame(readout);
      };
      debugFrame = requestAnimationFrame(readout);
    }

    if (cssPath || reduced) {
      return () => {
        cancelAnimationFrame(debugFrame);
        debugEl?.remove();
      };
    }

    // ------------------------------------------------- JS fallback ---
    const q = <T extends Element>(sel: string) =>
      Array.from(document.querySelectorAll<T>(sel));
    const tracks = CINE.map((track) => ({
      track,
      els: q<HTMLElement>(track.sel),
    })).filter(({ els }) => els.length > 0);
    const reveals = q<HTMLElement>(".mk-reveal");
    const parallax = q<HTMLElement>(".mk-parallax");

    let target = window.scrollY;
    let eased = target;
    let frame = 0;
    let running = false;

    const apply = () => {
      const vh = window.innerHeight;
      const p100 = clamp01(eased / (vh * 3)) * 100;
      for (const { track, els } of tracks) {
        for (const el of els) applyTrack(el, track, p100);
      }
      // Reveals scrub over the element's entry into the viewport,
      // approximating animation-range: entry 10% entry 65%.
      for (const el of reveals) {
        const r = el.getBoundingClientRect();
        const entered = (vh - r.top) / Math.min(r.height, vh * 0.6);
        const p = clamp01((entered - 0.1) / 0.55);
        el.style.opacity = String(p);
        el.style.transform = `translateY(${mix(56, 0, p)}px)`;
      }
      // Photography drifts inside its frame across the viewport
      // crossing, approximating animation-range: cover.
      for (const el of parallax) {
        const r = el.getBoundingClientRect();
        const p = clamp01((vh - r.top) / (vh + r.height));
        el.style.transform = `scale(1.16) translateY(${mix(-6, 6, p)}%)`;
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
      cancelAnimationFrame(debugFrame);
      debugEl?.remove();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
    };
  }, []);

  return null;
}
