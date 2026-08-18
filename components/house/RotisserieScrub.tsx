"use client";

import { useEffect, useRef } from "react";
import { setScrubProgress } from "./scrubStore";

/**
 * The rotisserie, scrubbed by the scroll.
 *
 * This layer cannot use a CSS scroll timeline: a timeline can drive
 * transforms and opacity, but a video's playhead is a JavaScript
 * property, so the damped loop here runs in every browser rather than
 * only as a fallback. The damping is the same one the rest of the site's
 * motion uses, and it is what makes the spit glide to rest instead of
 * snapping to the thumb.
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

    const loop = () => {
      /* The first viewport of scroll plays the whole clip, which lines the
         film up with the parallax planes already keyed to 0–100vh. */
      const target = Math.min(1, Math.max(0, window.scrollY / window.innerHeight));
      eased += (target - eased) * 0.12;
      setScrubProgress(eased);

      const duration = video.duration;
      if (seekable && duration && Number.isFinite(duration)) {
        // Stop just shy of the end: seeking to exactly duration can park
        // some decoders on a blank frame.
        const t = eased * (duration - 0.05);
        if (Math.abs(video.currentTime - t) > 0.012) video.currentTime = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
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
