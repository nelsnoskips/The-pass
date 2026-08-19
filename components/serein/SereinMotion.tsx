"use client";

import { useEffect } from "react";

/**
 * Motion director for SEREIN, per the cinematic-scroll-hero technique.
 * Adds .srn-cine when motion is welcome; runs the damped rAF fallback
 * mirroring the CSS keyframe tables when scroll timelines are
 * unsupported. The hero's planes and its film carry their own scroll
 * loop inside SereinWindow; this director only choreographs the acts of
 * type moving across them.
 */

type Props = { o?: [number, number]; y?: [number, number]; s?: [number, number] };
type Track = {
  sel: string;
  yUnit?: "px" | "%";
  backdrop?: boolean;
  kf: [number, Props][];
};

const TRACKS: Track[] = [
  /* The planes are their own engine: SereinWindow drives all five from
     the same scroll, so there are no backdrop tracks here. */
  /* These stops mirror the keyframes in serein.css exactly. When one
     moves the other must, or the two engines tell different stories. */
  { sel: ".srn-act-title", yUnit: "%", kf: [[0, { o: [1, 1], s: [1, 1.03], y: [0, 0] }], [8, { o: [1, 0], s: [1.03, 1.3], y: [0, -6] }], [20, { o: [0, 0], s: [1.3, 1.3], y: [-6, -6] }], [100, {}]] },
  { sel: ".srn-act-line", yUnit: "px", kf: [[0, { o: [0, 0], y: [64, 64] }], [24, { o: [0, 1], y: [64, 0] }], [32, { o: [1, 1], y: [0, 0] }], [56, { o: [1, 0], y: [0, -64] }], [64, { o: [0, 0], y: [-64, -64] }], [100, {}]] },
  { sel: ".srn-act-final", yUnit: "px", kf: [[0, { o: [0, 0], y: [48, 48] }], [62, { o: [0, 1], y: [48, 0] }], [70, { o: [1, 1], y: [0, 0] }], [100, {}]] },
  { sel: ".srn-hint", kf: [[0, { o: [0.6, 0] }], [6, { o: [0, 0] }], [100, {}]] },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function SereinMotion() {
  useEffect(() => {
    const cssPath = CSS.supports("animation-timeline: scroll()");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) document.documentElement.classList.add("srn-cine");

    let debugFrame = 0;
    let debugEl: HTMLDivElement | null = null;
    if (new URLSearchParams(window.location.search).has("motion-debug")) {
      debugEl = document.createElement("div");
      debugEl.style.cssText =
        "position:fixed;bottom:12px;left:12px;z-index:9999;background:#05070B;color:#E9E5DB;font:12px/1.6 monospace;padding:10px 14px;border:1px solid #C9884B;white-space:pre;pointer-events:none";
      document.body.appendChild(debugEl);
      const readout = () => {
        const g = (s: string) => {
          const e = document.querySelector(s);
          return e ? Number(getComputedStyle(e).opacity).toFixed(2) : "n/a";
        };
        debugEl!.textContent = [
          `engine: ${reduced ? "OFF (reduced motion)" : cssPath ? "CSS scroll-timeline" : "JS fallback"}`,
          `scrollY: ${Math.round(window.scrollY)}`,
          `golden: ${g(".srn-img-golden")}  night: ${g(".srn-img-night")}`,
          `act I: ${g(".srn-act-title")}  final: ${g(".srn-act-final")}`,
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

    const tracks = TRACKS.map((track) => ({
      track,
      els: Array.from(document.querySelectorAll<HTMLElement>(track.sel)),
    })).filter(({ els }) => els.length > 0);

    let target = window.scrollY;
    let eased = target;
    let frame = 0;
    let running = false;

    const apply = () => {
      /* Progress is measured off the pin wrapper, not assumed: the
         stage height is a design decision that lives in CSS, and this
         engine has to follow it rather than hold its own copy. */
      const wrap = document.querySelector(".srn-stagewrap") as HTMLElement | null;
      const top = wrap ? wrap.getBoundingClientRect().top + window.scrollY : 0;
      const held = wrap
        ? Math.max(1, wrap.offsetHeight - window.innerHeight)
        : window.innerHeight;
      const pActs = clamp01((eased - top) / held) * 100;
      for (const { track, els } of tracks) {
        const p100 = pActs;
        let i = 0;
        while (i < track.kf.length - 2 && p100 >= track.kf[i + 1][0]) i++;
        const seg = track.kf[i][1];
        const span = Math.max(track.kf[i + 1][0] - track.kf[i][0], 0.0001);
        const t = clamp01((p100 - track.kf[i][0]) / span);
        for (const el of els) {
          if (seg.o) {
            const o = mix(seg.o[0], seg.o[1], t);
            el.style.opacity = String(o);
            if (!track.backdrop) el.style.visibility = o <= 0.01 ? "hidden" : "visible";
          }
          const parts: string[] = [];
          if (seg.s) parts.push(`scale(${mix(seg.s[0], seg.s[1], t)})`);
          if (seg.y) parts.push(`translateY(${mix(seg.y[0], seg.y[1], t)}${track.yUnit ?? "px"})`);
          if (parts.length) el.style.transform = parts.join(" ");
        }
      }
    };

    const tick = () => {
      eased += (target - eased) * 0.12;
      apply();
      if (Math.abs(target - eased) > 0.4) frame = requestAnimationFrame(tick);
      else {
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
