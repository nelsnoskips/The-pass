"use client";

import { useEffect, useRef } from "react";

/**
 * Warm motes drifting up through the hero photograph — the light a kitchen
 * throws, not a particle demo. Deliberately sparse and slow: at any moment
 * only a few are legible, and they read as atmosphere rather than effect.
 *
 * Canvas rather than DOM nodes so drift can be organic (sine sway, per-mote
 * speed) at negligible cost. Honors prefers-reduced-motion by rendering
 * nothing, and idles when the tab is hidden.
 */

interface Mote {
  x: number; // 0–1 of width
  y: number; // 0–1 of height
  r: number; // radius in CSS px
  speed: number; // upward drift, height-fractions per second
  sway: number; // horizontal amplitude, width-fractions
  phase: number;
  alpha: number;
}

const COUNT = 44;
const COLOR = "196, 166, 112"; // champagne, warmed

function makeMote(seedY?: number): Mote {
  return {
    x: Math.random(),
    y: seedY ?? Math.random(),
    r: 0.9 + Math.random() * 2.4,
    speed: 0.012 + Math.random() * 0.032,
    sway: 0.006 + Math.random() * 0.02,
    phase: Math.random() * Math.PI * 2,
    alpha: 0.26 + Math.random() * 0.58,
  };
}

export function EmberField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let last = performance.now();
    const motes = Array.from({ length: COUNT }, () => makeMote());

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const draw = (now: number) => {
      // Seconds since last frame, clamped so a backgrounded tab doesn't
      // teleport every mote on return.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      ctx.clearRect(0, 0, width, height);
      for (const m of motes) {
        m.y -= m.speed * dt;
        m.phase += dt * 0.6;
        if (m.y < -0.04) Object.assign(m, makeMote(1.04));

        const px = (m.x + Math.sin(m.phase) * m.sway) * width;
        const py = m.y * height;

        // Fade in at the bottom and out at the top so nothing pops.
        const edge = Math.min(1, m.y * 6, (1 - m.y) * 6);
        const a = m.alpha * Math.max(0, edge);

        const glow = ctx.createRadialGradient(px, py, 0, px, py, m.r * 4);
        glow.addColorStop(0, `rgba(${COLOR}, ${a})`);
        glow.addColorStop(0.4, `rgba(${COLOR}, ${a * 0.35})`);
        glow.addColorStop(1, `rgba(${COLOR}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, m.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={className}
      style={{ pointerEvents: "none" }}
    />
  );
}
