"use client";

import { useEffect, useRef } from "react";

/**
 * The sky, painted rather than photographed.
 *
 * SEREIN's hero used three graded photographs cross-fading to fake the
 * light leaving. This draws the light itself: a computed sky running
 * golden hour → sun at the water → the serein moment → night, with the
 * sun's glint narrowing on the sea as it goes and stars arriving after.
 * Scroll is the evening — the damped loop maps the pinned stage onto
 * t ∈ [0,1] and the canvas repaints. No photograph, no video file,
 * nothing to compress: the gradients are exact at any viewport.
 *
 * The plane never transforms; the light is the only motion. Under
 * reduced motion the sky paints once at the serein moment and holds —
 * the most beautiful stop on the arc as the still. With no JavaScript
 * the stage's CSS fallback gradient stands in.
 *
 * It also reports where the evening is: --srn-after on the stage runs
 * 0 → 1 as the sun goes, so the serein rain (a separate canvas) can
 * begin only after sunset, which is when the phenomenon exists.
 */

type Stop = { t: number; zen: string; mid: string; low: string; seaT: string; seaB: string };

/* The arc, keyframed. Between stops every channel lerps. */
const ARC: Stop[] = [
  { t: 0.0,  zen: "#5C7A96", mid: "#A8B0AC", low: "#E8C084", seaT: "#3A4A57", seaB: "#1C2733" },
  { t: 0.3,  zen: "#3E5877", mid: "#97819B", low: "#EFA35E", seaT: "#2E3D50", seaB: "#141E2B" },
  { t: 0.55, zen: "#223A5C", mid: "#5D5C7E", low: "#D97E4E", seaT: "#1D2A40", seaB: "#0C1420" },
  { t: 0.78, zen: "#0D1B31", mid: "#22304C", low: "#6B5468", seaT: "#0E1626", seaB: "#060B14" },
  { t: 1.0,  zen: "#04060C", mid: "#0A1424", low: "#182238", seaT: "#070D18", seaB: "#030509" },
];

const HORIZON = 0.64;       // of height
const SUN_X = 0.63;         // of width — right of the copy column
const SUN_SET_AT = 0.52;    // t where the disc touches the water
const SUN_GONE_AT = 0.6;    // t where it is fully under

function hex(c: string): [number, number, number] {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}
function mixc(a: string, b: string, u: number): string {
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  return `rgb(${Math.round(ar + (br - ar) * u)},${Math.round(ag + (bg - ag) * u)},${Math.round(ab + (bb - ab) * u)})`;
}
function palette(t: number) {
  let i = 0;
  while (i < ARC.length - 2 && t >= ARC[i + 1].t) i++;
  const a = ARC[i], b = ARC[i + 1];
  const u = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)));
  return {
    zen: mixc(a.zen, b.zen, u), mid: mixc(a.mid, b.mid, u), low: mixc(a.low, b.low, u),
    seaT: mixc(a.seaT, b.seaT, u), seaB: mixc(a.seaB, b.seaB, u),
  };
}

/* Deterministic stars: the same sky every visit. */
function stars(): { x: number; y: number; r: number; a: number }[] {
  let seed = 20260819;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  return Array.from({ length: 110 }, () => ({
    x: rnd(), y: rnd() * HORIZON * 0.92, r: 0.4 + rnd() * 1.0, a: 0.25 + rnd() * 0.6,
  }));
}
const STARS = stars();

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const p = palette(t);
  const hy = h * HORIZON;

  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, p.zen);
  sky.addColorStop(0.62, p.mid);
  sky.addColorStop(1, p.low);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, hy + 1);

  // Sea: darker mirror of the sky.
  const sea = ctx.createLinearGradient(0, hy, 0, h);
  sea.addColorStop(0, p.seaT);
  sea.addColorStop(1, p.seaB);
  ctx.fillStyle = sea;
  ctx.fillRect(0, hy, w, h - hy);

  // The sun: descends, flattens a breath at contact, slips under.
  const sunT = Math.min(1, t / SUN_GONE_AT);
  const sy = h * 0.3 + (hy - h * 0.3) * Math.min(1, t / SUN_SET_AT)
    + (t > SUN_SET_AT ? ((t - SUN_SET_AT) / (SUN_GONE_AT - SUN_SET_AT)) * h * 0.05 : 0);
  const sx = w * SUN_X;
  const r = h * 0.032;
  if (t < SUN_GONE_AT + 0.05) {
    const glowA = 0.34 + 0.3 * Math.min(1, t / SUN_SET_AT) * (1 - Math.max(0, (t - SUN_SET_AT) / (SUN_GONE_AT - SUN_SET_AT)));
    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 7);
    glow.addColorStop(0, `rgba(238,182,120,${glowA})`);
    glow.addColorStop(1, "rgba(238,182,120,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(sx - r * 7, Math.max(0, sy - r * 7), r * 14, r * 14);

    // Clip the disc to the sky so it sets behind the water.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, hy);
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(sx, sy, r, r * (1 - 0.1 * sunT), 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(244,214,168,${1 - Math.max(0, (t - SUN_SET_AT) / (SUN_GONE_AT - SUN_SET_AT)) * 0.4})`;
    ctx.fill();
    ctx.restore();
  }

  // The glint: the sun's path on the water, narrowing as it sets.
  const glintA = 0.3 * (1 - Math.min(1, t / (SUN_GONE_AT + 0.06)));
  if (glintA > 0.005) {
    const gw = w * (0.085 - 0.055 * sunT);
    const glint = ctx.createLinearGradient(0, hy, 0, h * 0.92);
    glint.addColorStop(0, `rgba(240,190,130,${glintA})`);
    glint.addColorStop(1, "rgba(240,190,130,0)");
    ctx.fillStyle = glint;
    ctx.beginPath();
    ctx.moveTo(sx - gw * 0.5, hy);
    ctx.lineTo(sx + gw * 0.5, hy);
    ctx.lineTo(sx + gw * 1.6, h * 0.92);
    ctx.lineTo(sx - gw * 1.6, h * 0.92);
    ctx.closePath();
    ctx.fill();
  }

  // Horizon hairline.
  ctx.fillStyle = `rgba(233,229,219,${0.14 - t * 0.08})`;
  ctx.fillRect(0, hy - 0.5, w, 1);

  // Stars, after the sun is gone.
  const starA = Math.min(1, Math.max(0, (t - 0.66) / 0.26));
  if (starA > 0.01) {
    for (const s of STARS) {
      ctx.fillStyle = `rgba(216,226,234,${s.a * starA})`;
      ctx.fillRect(s.x * w, s.y * h, s.r, s.r);
    }
  }

  // Protection for the type. Strongest early, when the sky is at its
  // brightest and the opening act sits centred over the apricot band;
  // it relaxes as the sky darkens and stops fighting the stars.
  const early = 1 - Math.min(1, t / 0.5) * 0.55;
  const scrim = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  scrim.addColorStop(0, `rgba(5,7,11,${0.5 * early + 0.18})`);
  scrim.addColorStop(0.55, `rgba(5,7,11,${0.34 * early})`);
  scrim.addColorStop(1, "rgba(5,7,11,0)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, w, h * 0.62);
}

export function SereinSky({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0;
    const size = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.round(rect.width);
      h = Math.round(rect.height);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // The serein moment, once, as the still.
      draw(ctx, w, h, 0.55);
      const onResize = () => { size(); draw(ctx, w, h, 0.55); };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    const pin = canvas.closest(".srn-stagewrap") as HTMLElement | null;
    let start = 0, held = window.innerHeight * 3;
    const measure = () => {
      size();
      if (!pin) return;
      start = pin.getBoundingClientRect().top + window.scrollY;
      // The acts run over the first 300vh of a 400vh wrapper; the sky
      // completes with them and holds through the exit.
      held = Math.max(1, Math.min(pin.offsetHeight - window.innerHeight, window.innerHeight * 3));
    };
    measure();
    window.addEventListener("resize", measure);

    let raf = 0, eased = -1, drawn = -1;
    const loop = () => {
      const target = Math.min(1, Math.max(0, (window.scrollY - start) / held));
      eased = eased < 0 ? target : eased + (target - eased) * 0.14;
      const q = Math.round(eased * 500) / 500;
      if (q !== drawn) {
        drawn = q;
        draw(ctx, w, h, q);
        // After sunset, the serein rain may fall.
        pin?.style.setProperty("--srn-after", String(Math.min(1, Math.max(0, (q - 0.58) / 0.18))));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
