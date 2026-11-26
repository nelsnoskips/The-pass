"use client";

import { useEffect, useRef, useState } from "react";
import { IMAGES, asset } from "@/lib/images";

/**
 * A photograph that is quietly alive.
 *
 * The cinemagraph plays where motion is allowed and the file exists;
 * everywhere else — reduced motion, save-data, a missing or failed
 * video — the plate is simply the still it was made from. The loop is
 * seamless because the clip was generated with the still as both its
 * first and last frame.
 */
export function LivePlate({
  slot,
  video,
  className,
  imgClassName,
  parallax = 0,
}: {
  slot: string;
  video: string;
  className?: string;
  imgClassName?: string;
  parallax?: number;
}) {
  const meta = IMAGES[slot];
  const [mode, setMode] = useState<"still" | "live">("still");
  const media = useRef<HTMLElement | null>(null);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const connection = (navigator as { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    setMode("live");
  }, []);

  /* Same parallax contract as Plate, applied to whichever element is
     currently showing. */
  useEffect(() => {
    if (!parallax) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = host.current;
    if (!node) return;
    let frame = 0;
    let queued = false;
    const read = () => {
      queued = false;
      const rect = node.getBoundingClientRect();
      const span = rect.height + window.innerHeight * 0.55;
      const p = Math.min(1, Math.max(0, (window.innerHeight * 0.82 - rect.top) / span));
      const y = (p - 0.5) * -2 * parallax;
      media.current?.style.setProperty(
        "transform",
        `translate3d(0, ${y.toFixed(1)}px, 0) scale(${(1 + (parallax * 2.4) / 600).toFixed(3)})`,
      );
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [parallax]);

  if (!meta) return null;

  return (
    <div ref={host} className={className}>
      {mode === "live" ? (
        <video
          ref={(node) => {
            media.current = node;
          }}
          src={asset(video)}
          poster={asset(meta.src)}
          autoPlay
          muted
          loop
          playsInline
          aria-label={meta.alt}
          className={imgClassName}
          style={{ willChange: "transform" }}
          onError={() => setMode("still")}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={(node) => {
            media.current = node;
          }}
          src={asset(meta.src)}
          alt={meta.alt}
          className={imgClassName}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  );
}
