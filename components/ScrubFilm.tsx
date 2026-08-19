"use client";

import { useEffect, useRef } from "react";

/**
 * A film whose playhead is the scroll. Generalised from the HOUSE ISSUE
 * rotisserie scrubber so any concept's pinned stage can carry one: the
 * component finds its pin wrapper by selector, measures how far the
 * stage stays held, and maps that scroll span onto the clip.
 *
 * It cannot use a CSS scroll timeline — a timeline drives transforms
 * and opacity, but a video's playhead is a JavaScript property — so the
 * damped loop runs in every browser rather than only as a fallback. The
 * damping is what makes the film glide to rest instead of snapping to
 * the thumb, and seeks are quantised to frame boundaries so scrolling
 * never issues decodes for a frame already on screen.
 *
 * The plane this sits in must never transform. A layer that slides
 * while its contents play reads as the video repositioning itself, not
 * as depth — that lesson is paid for.
 *
 * With no JavaScript, with reduced motion, or before the file loads,
 * the poster stands in. Choose it accordingly: it is the still hero,
 * so it should be the clip's *finished* frame, not its opening one.
 */
export function ScrubFilm({
  src,
  poster,
  wrapper,
  fps = 24,
  className = "",
}: {
  src: string;
  poster: string;
  /** Selector for the tall pin wrapper this film answers to. */
  wrapper: string;
  /** The clip's frame rate, for seek quantisation. */
  fps?: number;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let eased = 0;
    let seekable = false;

    /* Safari will not honour currentTime on a video it has never played.
       Play muted and pause on the same tick to make it seekable without
       the visitor ever seeing it run. */
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

    const pin = video.closest(wrapper) as HTMLElement | null;
    let start = 0;
    let held = window.innerHeight;
    const measure = () => {
      if (!pin) return;
      start = pin.getBoundingClientRect().top + window.scrollY;
      held = Math.max(1, pin.offsetHeight - window.innerHeight);
    };
    measure();
    window.addEventListener("resize", measure);

    const loop = () => {
      const target = Math.min(1, Math.max(0, (window.scrollY - start) / held));
      eased += (target - eased) * 0.14;

      const duration = video.duration;
      if (seekable && duration && Number.isFinite(duration)) {
        // Stop shy of the end: seeking to exactly duration can park some
        // decoders on a blank frame.
        const raw = eased * (duration - 0.05);
        const t = Math.round(raw * fps) / fps;
        if (Math.abs(video.currentTime - t) > 0.5 / fps) video.currentTime = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [wrapper, fps]);

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
