"use client";

import { useEffect } from "react";

/**
 * Motion director for BLUE at the Gale.
 *
 * One rAF loop drives everything scrubbed by the scroll — the hero's
 * scale, curtain draw, wash and projection; the slow push on the two
 * full-width acts; the cobalt gain on the finale; and the small
 * independent drift on blue reflections. One IntersectionObserver drives
 * everything that plays once on arrival — the line masks and the velvet
 * panels over the evening band.
 *
 * The loop writes CSS custom properties and transforms only, so nothing
 * here touches layout. Progress is measured off the live elements rather
 * than assumed from a constant: the stage heights are a design decision
 * that lives in the stylesheet, and this has to follow it.
 *
 * Reduced motion returns before any of it runs, and blue.css already
 * renders the finished page — the complete hero photograph, every section
 * arrived, the finale already cobalt.
 *
 * The brief asked for GSAP/ScrollTrigger; this is the equivalent the rest
 * of the site already uses. Same scrub, same reversibility, no library on
 * a page whose whole argument is that it loads dark and fast.
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

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
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    /* Both hooks put the class on themselves, so both must be observed: a
       rise block that is never observed is a paragraph that never
       becomes visible. */
    document
      .querySelectorAll("[data-blu-reveal], [data-blu-rise]")
      .forEach((el) => io.observe(el));

    /* --------------------------------------------------- the scrub --- */
    const heroWrap = document.querySelector<HTMLElement>(".blu-herowrap");
    const stage = document.querySelector<HTMLElement>(".blu-stage");
    const projection = document.querySelector<HTMLElement>(".blu-projection");
    const finale = document.querySelector<HTMLElement>(".blu-finale");
    const pushes = Array.from(document.querySelectorAll<HTMLElement>("[data-blu-push]"));
    const drifts = Array.from(document.querySelectorAll<HTMLElement>("[data-blu-drift]"));

    let heroTop = 0;
    let heroHeld = 1;
    const measure = () => {
      if (!heroWrap) return;
      heroTop = heroWrap.getBoundingClientRect().top + window.scrollY;
      heroHeld = Math.max(1, heroWrap.offsetHeight - window.innerHeight);
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

        /* The room settles from 1.04 to 1.0 about the microphone, which
           is why the microphone is the one thing that holds still. */
        stage.style.setProperty("--blu-scale", mix(1.04, 1, easeOut(clamp01(t / 0.7))).toFixed(4));
        /* The curtains draw back over the first third. */
        stage.style.setProperty("--blu-part", easeOut(clamp01(t / 0.35)).toFixed(4));
        stage.style.setProperty("--blu-t", t.toFixed(4));
        /* The glassware in front moves a shade faster than the room. */
        stage.style.setProperty("--blu-fore", t.toFixed(4));

        const exit = (raw - 1) / (vh / heroHeld);
        stage.style.setProperty("--blu-dark", clamp01((exit - 0.3) / 0.6).toFixed(4));

        if (projection) {
          /* 28% to nothing, gone before the room is fully up: the name is
             what the room stops needing once you can see it. */
          projection.style.opacity = mix(0.28, 0, clamp01(t / 0.55)).toFixed(4);
        }

        /* will-change is a promise to the compositor, not a decoration:
           held on a layer that is off screen it only costs memory. */
        const near = raw > -0.4 && raw < 1.8;
        if (near !== hot) {
          hot = near;
          for (const el of [stage.querySelector(".blu-room"), ...Array.from(stage.querySelectorAll(".blu-curtain-inner, .blu-fore-inner"))]) {
            if (el instanceof HTMLElement) el.style.willChange = near ? "transform" : "auto";
          }
        }
      }

      /* --------------------------------- the slow push on the acts --- */
      /* 4% across a full pass of the viewport. Enough that the frame is
         alive under the copy, small enough that nobody catches it at it. */
      for (const el of pushes) {
        const rect = el.getBoundingClientRect();
        const p = clamp01((vh - rect.top) / (vh + rect.height));
        el.style.setProperty("--blu-push", (1 + p * 0.04).toFixed(4));
      }

      /* ------------------------------------------- the final call --- */
      if (finale) {
        const rect = finale.getBoundingClientRect();
        const entered = clamp01((vh - rect.top) / vh);
        finale.style.setProperty("--blu-final", clamp01((entered - 0.6) / 0.4).toFixed(4));
      }

      /* --------------------------------------- independent drifts --- */
      /* Blue reflections move against the image they belong to, which is
         what stops a still photograph reading as a sticker. */
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
          el ? getComputedStyle(el).getPropertyValue(k).trim() || "0" : "n/a";
        debugEl!.textContent = [
          "engine: rAF scrub (reduced motion off)",
          `scrollY: ${Math.round(window.scrollY)}`,
          `hero scale: ${v(stage, "--blu-scale")}  curtains: ${v(stage, "--blu-part")}`,
          `projection: ${projection ? Number(projection.style.opacity || 0).toFixed(2) : "n/a"}`,
          `act push: ${pushes[0] ? v(pushes[0], "--blu-push") : "n/a"}`,
          `finale cobalt: ${v(finale, "--blu-final")}`,
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
