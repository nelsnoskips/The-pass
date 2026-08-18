"use client";

import { useEffect, useRef } from "react";
import { setScrubProgress } from "./scrubStore";

/**
 * The rotisserie, scrubbed by the scroll.
 *
 * This layer cannot use a CSS scroll timeline: a timeline can drive
 * transforms and opacity, but a video's playhead is a JavaScript
 * property, so the damped loop here runs in every browser rather than
 * only as a fallback. The damping is what makes the spit glide to rest
 * instead of snapping to the thumb.
 *
 * Nothing else in this layer moves. An earlier version also drifted the
 * plane on a parallax transform, and a rectangle that slides while its
 * contents play does not read as depth — it reads as the video
 * repositioning itself.
 *
 * With no JavaScript, with reduced motion, or before the file has
 * loaded, the poster frame stands in — a finished composition of the
 * birds at their best, which is exactly what the still hero wants.
 */
export function RotisserieScrub({
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let eased = 0;
    let seekable = false;

    /* The clip's frame rate. Seeking between two times that land on the
       same frame costs a decode and changes nothing on screen, so the
       target is quantised to frame boundaries first. */
    const FPS = 24;

    /* Safari will not honour currentTime on a video it has never played.
       Playing it muted and pausing on the same tick makes it seekable
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

    /* Where the hold starts and how long it lasts, measured from the
       wrapper rather than assumed, so changing the pin height in CSS
       needs no change here.

       The offset matters. The masthead scrolls away before the stage
       reaches the top, and if the film began scrubbing at the very first
       pixel it would be playing while its own plane was still travelling
       up the page — which reads as the video repositioning itself rather
       than as one continuous piece of motion. So it holds on frame one
       until the stage is actually pinned, and only then starts. */
    const pin = video.closest(".hse-pin") as HTMLElement | null;
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
      setScrubProgress(eased);

      const duration = video.duration;
      if (seekable && duration && Number.isFinite(duration)) {
        // Stop just shy of the end: seeking to exactly duration can park
        // some decoders on a blank frame.
        const raw = eased * (duration - 0.05);
        const t = Math.round(raw * FPS) / FPS;
        if (Math.abs(video.currentTime - t) > 0.5 / FPS) video.currentTime = t;
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
