"use client";

import { useEffect } from "react";

/**
 * Motion director for BLUE at the Gale.
 *
 * One rAF loop drives everything that is scrubbed by the scroll — the
 * hero's curtains and planes, the dinner-to-after-hours wipe, the cobalt
 * gain on the final call, and the small independent drifts on blue
 * reflections. One IntersectionObserver drives everything that plays
 * once on arrival — the line masks and the velvet panels.
 *
 * The loop writes CSS custom properties and transforms only, so nothing
 * here touches layout: the browser composites it. Progress is measured
 * off the live wrappers rather than assumed from a constant, because the
 * stage heights are a design decision that lives in the stylesheet.
 *
 * Reduced motion returns before any of it runs, and blue.css already
 * renders the finished frames: curtains open, room blue, CTA cobalt.
 *
 * The house technique here is the two-engine cinematic scroll hero. The
 * brief asked for GSAP/ScrollTrigger; this is the equivalent the rest of
 * the site already uses, and it ships no library — the same scrub, the
 * same reversibility, ~4KB instead of ~60KB on a page whose whole point
 * is that it loads dark and fast.
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Ease-out, so the curtains slow into their open position rather than
 *  arriving at speed and stopping dead. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Plane speeds as fractions of the scrolled distance, per the brief:
 *  rear scrim 0.06, microphone 0.12, foreground tables 0.20. The
 *  microphone plane travels; the microphone itself is never animated. */
const PLANES: [string, number][] = [
  [".blu-p-scrim", 0.06],
  [".blu-p-mic", 0.12],
  [".blu-p-tables", 0.2],
];

export function BlueMotion() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      document.documentElement.classList.remove("blu-cine");
      return;
    }
    document.documentElement.classList.add("blu-cine");

    /* ------------------------------------------------- one-shots --- */
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    /* Both hooks are one-shots and both need the class on themselves:
       a `data-blu-rise` block that is never observed is a paragraph that
       never becomes visible. */
    const revealed = Array.from(
      document.querySelectorAll("[data-blu-reveal], [data-blu-rise]"),
    );
    revealed.forEach((el) => io.observe(el));

    /* --------------------------------------------------- the scrub --- */
    const heroWrap = document.querySelector<HTMLElement>(".blu-herowrap");
    const stage = document.querySelector<HTMLElement>(".blu-stage");
    const projection = document.querySelector<HTMLElement>(".blu-projection");
    const turnWrap = document.querySelector<HTMLElement>(".blu-turnwrap");
    const turnStage = document.querySelector<HTMLElement>(".blu-turnstage");
    const final = document.querySelector<HTMLElement>(".blu-final");
    const drifts = Array.from(document.querySelectorAll<HTMLElement>("[data-blu-drift]"));

    const planes = PLANES.map(([sel, speed]) => ({
      speed,
      els: Array.from(document.querySelectorAll<HTMLElement>(sel)),
    })).filter((p) => p.els.length > 0);

    let heroTop = 0;
    let heroHeld = 1;
    let turnTop = 0;
    let turnHeld = 1;
    const measure = () => {
      if (heroWrap) {
        heroTop = heroWrap.getBoundingClientRect().top + window.scrollY;
        heroHeld = Math.max(1, heroWrap.offsetHeight - window.innerHeight);
      }
      if (turnWrap) {
        turnTop = turnWrap.getBoundingClientRect().top + window.scrollY;
        turnHeld = Math.max(1, turnWrap.offsetHeight - window.innerHeight);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    /* Fonts and lazy images change the document height under us; a
       measurement taken before they land puts every stop in the wrong
       place. */
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);

    let eased = window.scrollY;
    let raf = 0;
    let hot = false;

    const paint = () => {
      const vh = window.innerHeight;

      /* ------------------------------------------------- the hero --- */
      if (heroWrap && stage) {
        const raw = (eased - heroTop) / heroHeld;
        const t = clamp01(raw);
        const scrolled = t * heroHeld;

        /* Curtains: 28% occlusion each side, drawn fully back over the
           first 35% of the sequence. */
        stage.style.setProperty("--blu-open", easeOut(clamp01(t / 0.35)).toFixed(4));
        stage.style.setProperty("--blu-t", t.toFixed(4));
        /* Cobalt and haze gain, held back until the room is open and the
           page is about to hand off to the calendar. */
        stage.style.setProperty("--blu-heat", clamp01((t - 0.62) / 0.38).toFixed(4));
        /* The stage's exit is always exactly one viewport tall. The room
           loses its last light across it, so the calendar arrives out of
           black instead of off a hard edge — but not until the hero has
           actually started to leave: a headline that dims while it is
           still squarely on screen reads as a fault, not as a fade. */
        const exit = (raw - 1) / (vh / heroHeld);
        stage.style.setProperty("--blu-dark", clamp01((exit - 0.3) / 0.6).toFixed(4));

        if (projection) {
          /* 1.08 -> 0.94 while 0.42 -> 0. Gone before the room is fully
             revealed: the name is what the room stops needing once you
             can see it. */
          const p = clamp01(t / 0.55);
          projection.style.transform = `scale(${mix(1.08, 0.94, p).toFixed(4)})`;
          projection.style.opacity = mix(0.42, 0, p).toFixed(4);
        }

        for (const plane of planes) {
          const y = -(scrolled * plane.speed);
          for (const el of plane.els) el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
        }

        /* will-change is a promise to the compositor, not a decoration:
           held on a layer that is off screen it just costs memory. */
        const near = raw > -0.4 && raw < 1.8;
        if (near !== hot) {
          hot = near;
          for (const plane of planes) {
            for (const el of plane.els) el.style.willChange = near ? "transform" : "auto";
          }
        }
      }

      /* ------------------------------- dinner to the after hours --- */
      if (turnWrap && turnStage) {
        const t = clamp01((eased - turnTop) / turnHeld);
        /* A beat of warm room before the light moves, and a beat of full
           blue after it lands, so neither state is a flash. */
        const w = clamp01((t - 0.14) / 0.62);
        turnStage.style.setProperty("--blu-wipe", (w * 100).toFixed(2));
        /* The seam only exists while it is doing the wiping. */
        turnStage.style.setProperty("--blu-seam", (w > 0.002 && w < 0.998 ? 1 : 0).toFixed(2));
      }

      /* ------------------------------------------- the final call --- */
      if (final) {
        const rect = final.getBoundingClientRect();
        const entered = clamp01((vh - rect.top) / vh);
        final.style.setProperty("--blu-final", clamp01((entered - 0.6) / 0.4).toFixed(4));
      }

      /* --------------------------------------- independent drifts --- */
      /* Blue reflections move 8-16px against the image they belong to,
         which is what stops a still photograph reading as a sticker. */
      for (const el of drifts) {
        const amount = Number(el.dataset.bluDrift || 12);
        const rect = el.getBoundingClientRect();
        const centre = (rect.top + rect.height / 2) / vh;
        el.style.transform = `translate3d(0, ${((0.5 - centre) * amount * 2).toFixed(2)}px, 0)`;
      }
    };

    let running = false;
    const tick = () => {
      const target = window.scrollY;
      eased += (target - eased) * 0.16;
      paint();
      if (Math.abs(target - eased) > 0.3) {
        raf = requestAnimationFrame(tick);
      } else {
        eased = target;
        paint();
        running = false;
      }
    };
    const wake = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    wake();
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", wake, { passive: true });

    /* ------------------------------------------------ the readout --- */
    let debugRaf = 0;
    let debugEl: HTMLDivElement | null = null;
    if (new URLSearchParams(window.location.search).has("motion-debug")) {
      debugEl = document.createElement("div");
      debugEl.style.cssText =
        "position:fixed;bottom:14px;left:14px;z-index:9999;background:#030812;color:#F1EDE4;font:12px/1.65 monospace;padding:10px 14px;border:1px solid #0647D9;white-space:pre;pointer-events:none";
      document.body.appendChild(debugEl);
      const readout = () => {
        const v = (el: HTMLElement | null, k: string) =>
          el ? (getComputedStyle(el).getPropertyValue(k).trim() || "0") : "n/a";
        debugEl!.textContent = [
          "engine: rAF scrub (reduced motion off)",
          `scrollY: ${Math.round(window.scrollY)}`,
          `curtains: ${v(stage, "--blu-open")}  heat: ${v(stage, "--blu-heat")}`,
          `projection: ${projection ? Number(projection.style.opacity || 0).toFixed(2) : "n/a"}`,
          `turn wipe: ${v(turnStage, "--blu-wipe")}%`,
          `final cobalt: ${v(final, "--blu-final")}`,
        ].join("\n");
        debugRaf = requestAnimationFrame(readout);
      };
      debugRaf = requestAnimationFrame(readout);
    }

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(debugRaf);
      debugEl?.remove();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return null;
}
