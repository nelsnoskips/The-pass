"use client";

import { useEffect, useRef } from "react";

/**
 * The window: five planes over one pinned stage, all answering the same
 * scroll at different rates.
 *
 * Depth here is not decoration — it is what a window is. The view sits
 * furthest back and barely moves; the timber frame and sill sit in the
 * room and move faster; the type floats between; the sheer veil is
 * nearest the lens and moves fastest of all. The grain and the interface
 * marks do not move at all, because they belong to the screen rather
 * than to the room.
 *
 * The film's playhead is the scroll, eased rather than assigned, so a
 * trackpad flick reads as fluid footage instead of a strobe. Seeks are
 * quantised to frame boundaries so scrolling never issues a decode for
 * a frame already on screen.
 *
 * The dolly lives here rather than in the footage. The clip is pinned
 * at both ends to the room's own dusk and night frames, which is what
 * guarantees the grade shift and the candles igniting; a camera move
 * that had to return to its start framing would read as drifting out
 * and back, and reverse scroll would show it. So the push is a scale on
 * this plane — one real, perfectly smooth camera move that cannot
 * glitch, and costs nothing.
 *
 * Reduced motion, no JavaScript, or a codec the browser will not decode
 * all land on the same place: the night frame, held, with the
 * reservation hero over it.
 *
 * The playhead runs past the end of the pin, because the viewport-tall
 * exit that every sticky stage has is scroll this component still owns.
 * The film and the planes finish with the pin; the exit drives only the
 * curtain that takes the room's last light as it leaves.
 */

const FPS = 24;

/** Plane speeds, as fractions of scroll. Nearest moves fastest.
 *  The hero plane is deliberately not here: it is the destination the
 *  scroll is travelling towards, and a destination that drifts is one
 *  the guest has to chase. */
const PLANES: { sel: string; speed: number; travel: number }[] = [
  { sel: ".srn-p-view", speed: 0.1, travel: 1 },
  { sel: ".srn-p-frame", speed: 0.24, travel: 1 },
  { sel: ".srn-p-type", speed: 0.4, travel: 1 },
  { sel: ".srn-p-veil", speed: 0.65, travel: 1 },
];

export function SereinWindow({
  src,
  poster,
  className = "",
}: {
  src: string;
  poster: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const stage = video.closest(".srn-stagewrap") as HTMLElement | null;
    if (!stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const planes = PLANES.map((p) => ({
      ...p,
      els: Array.from(stage.querySelectorAll<HTMLElement>(p.sel)),
    })).filter((p) => p.els.length > 0);

    let raf = 0;
    let eased = 0;
    let seekable = false;

    /* Safari will not honour currentTime on a video it has never
       played. Play muted and pause on the same tick to make it seekable
       without the visitor ever seeing it run. */
    const prime = () => {
      const started = video.play();
      const settle = () => {
        video.pause();
        video.currentTime = 0;
        seekable = true;
      };
      if (started && typeof started.then === "function") {
        started.then(settle).catch(() => {
          seekable = true;
        });
      } else {
        settle();
      }
    };
    if (video.readyState >= 2) prime();
    else video.addEventListener("loadeddata", prime, { once: true });

    let start = 0;
    let held = window.innerHeight;
    const measure = () => {
      start = stage.getBoundingClientRect().top + window.scrollY;
      held = Math.max(1, stage.offsetHeight - window.innerHeight);
    };
    measure();
    window.addEventListener("resize", measure);

    const loop = () => {
      /* Progress runs past 1: the pin is only the held part of the
         wrapper, and the viewport-tall exit after it is scroll the
         stage still owns. Easing the whole thing and splitting it
         afterwards keeps one playhead for both. */
      const vh = window.innerHeight;
      const span = vh / held;
      const target = Math.min(1 + span, Math.max(0, (window.scrollY - start) / held));
      eased += (target - eased) * 0.14;
      const t = Math.min(1, eased);
      const exit = Math.min(1, Math.max(0, (eased - 1) / span));

      stage.style.setProperty("--srn-t", t.toFixed(4));
      /* Under the veil's occlusion, the night grade rises over the
         footage — the crossfade is hidden by the curtain rather than
         being a visible dissolve. */
      stage.style.setProperty(
        "--srn-night",
        String(Math.min(1, Math.max(0, (t - 0.55) / 0.22))),
      );
      /* The curtain rides the exit, not the pin. Nothing dims while the
         hero is held — it stays fully lit for every pixel it is on
         screen — and the room loses its last light only once the stage
         has started to leave, so the section beneath arrives out of
         black instead of off a hard edge. Closed well before the stage
         is gone, so the last thing to cross the fold is ink. */
      stage.style.setProperty(
        "--srn-dark",
        String(Math.min(1, Math.max(0, (exit - 0.08) / 0.5))),
      );

      for (const p of planes) {
        // Nearer planes travel further across the same scroll.
        const y = -t * vh * p.speed * p.travel;
        // The dolly: a slow push that belongs to the camera, not the film.
        const scale = p.sel === ".srn-p-view" ? 1 + t * 0.06 : 1;
        for (const el of p.els) {
          el.style.transform =
            scale === 1
              ? `translate3d(0, ${y.toFixed(2)}px, 0)`
              : `translate3d(0, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
        }
      }

      const duration = video.duration;
      if (seekable && duration && Number.isFinite(duration)) {
        const raw = t * (duration - 0.05);
        const q = Math.round(raw * FPS) / FPS;
        if (Math.abs(video.currentTime - q) > 0.5 / FPS) video.currentTime = q;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      muted
      playsInline
      preload="auto"
      controls={false}
      disablePictureInPicture
      aria-hidden
      tabIndex={-1}
    />
  );
}
