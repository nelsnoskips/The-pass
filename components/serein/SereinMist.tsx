"use client";

import { useEffect, useRef } from "react";

/**
 * Serein: the fine rain that falls from a clear sky after sunset. Sparse
 * cool motes drifting downward over the hero photograph — the inverse of
 * The Pass's rising embers. Atmosphere, not a particle demo. Honors
 * prefers-reduced-motion by rendering nothing; idles when hidden.
 */

interface Mote {
  x: number;
  y: number;
  r: number;
  speed: number;
  sway: number;
  phase: number;
  alpha: number;
}

const COUNT = 30;
const COLOR = "168, 185, 199"; // cool mist blue-grey

function makeMote(seedY?: number): Mote {
  return {
    x: Math.random(),
    y: seedY ?? Math.random(),
    r: 0.6 + Math.random() * 1.8,
    speed: 0.008 + Math.random() * 0.02,
    sway: 0.004 + Math.random() * 0.014,
    phase: Math.random() * Math.PI * 2,
    alpha: 0.16 + Math.random() * 0.4,
  };
}

export function SereinMist({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, width, height);
      for (const m of motes) {
        m.y += m.speed * dt; // falling, not rising
        m.phase += dt * 0.5;
        if (m.y > 1.04) Object.assign(m, makeMote(-0.04));
        const px = (m.x + Math.sin(m.phase) * m.sway) * width;
        const py = m.y * height;
        const edge = Math.min(1, (m.y + 0.04) * 6, (1.04 - m.y) * 6);
        const a = m.alpha * Math.max(0, edge);
        const glow = ctx.createRadialGradient(px, py, 0, px, py, m.r * 3.5);
        glow.addColorStop(0, `rgba(${COLOR}, ${a})`);
        glow.addColorStop(0.5, `rgba(${COLOR}, ${a * 0.3})`);
        glow.addColorStop(1, `rgba(${COLOR}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, m.r * 3.5, 0, Math.PI * 2);
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

  return <canvas ref={canvasRef} aria-hidden className={className} style={{ pointerEvents: "none" }} />;
}
