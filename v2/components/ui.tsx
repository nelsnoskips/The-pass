"use client";

import { useEffect, useRef, useState } from "react";
import { IMAGES, asset } from "@/lib/images";

/* ------------------------------------------------------------ Plate --- */

/**
 * An image slot that is never empty: renders the photograph the moment
 * the file exists at its path, and a composed placeholder until then —
 * so the page is reviewable before the asset library is uploaded, and
 * uploading it is the whole deployment step.
 */
export function Plate({
  slot,
  className,
  imgClassName,
  parallax = 0,
}: {
  slot: string;
  className?: string;
  imgClassName?: string;
  /** Pixels of vertical drift across the section's travel. The image is
      oversized to cover the drift, so the frame never shows an edge. */
  parallax?: number;
}) {
  const meta = IMAGES[slot];
  const [missing, setMissing] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  const host = useSectionProgress<HTMLDivElement>((p) => {
    if (!parallax || !img.current) return;
    const y = (p - 0.5) * -2 * parallax;
    img.current.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${(
      1 + (parallax * 2.4) / 600
    ).toFixed(3)})`;
  });

  if (!meta) return null;

  if (missing) {
    return (
      <div className={className}>
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#26272b] p-3">
          <svg viewBox="0 0 48 34" className="w-10 opacity-40" aria-hidden>
            <path
              d="M2 30 L14 14 L24 24 L33 12 L46 30"
              fill="none"
              stroke="#8b8d96"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="38" cy="8" r="4" fill="#8b8d96" />
          </svg>
          <p className="o-label text-center text-[9px] leading-relaxed text-[#8b8d96]">
            {slot}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={host} className={className}>
      {/* Plain img: half these files do not exist until the library is
          uploaded, and the fallback depends on catching the error. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={(node) => {
          img.current = node;
          if (node?.complete && node.naturalWidth === 0) setMissing(true);
        }}
        src={asset(meta.src)}
        alt={meta.alt}
        className={imgClassName}
        style={parallax ? { willChange: "transform" } : undefined}
        onError={() => setMissing(true)}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

/* ----------------------------------------------------------- Reveal --- */

/** One scroll-reveal primitive for the whole site. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-in={seen}
      className={`o-reveal ${className ?? ""}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------- useSectionProgress --- */

/**
 * How far a section has travelled through the viewport, 0-1, pushed to
 * a callback on animation frames. This is what draws the thread: each
 * section's segment inks in as the visitor carries the line down the
 * page. One rAF-throttled listener per section, asleep while off-screen.
 */
export function useSectionProgress<T extends HTMLElement>(
  onChange: (p: number) => void,
) {
  const ref = useRef<T>(null);
  const handler = useRef(onChange);
  useEffect(() => {
    handler.current = onChange;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let queued = false;
    let frame = 0;
    let visible = true;

    const read = () => {
      queued = false;
      const rect = node.getBoundingClientRect();
      const span = rect.height + window.innerHeight * 0.55;
      const value = Math.min(
        1,
        Math.max(0, (window.innerHeight * 0.82 - rect.top) / span),
      );
      handler.current(value);
    };
    const onScroll = () => {
      if (queued || !visible) return;
      queued = true;
      frame = requestAnimationFrame(read);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) read();
      },
      { rootMargin: "25% 0px" },
    );
    observer.observe(node);
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return ref;
}
