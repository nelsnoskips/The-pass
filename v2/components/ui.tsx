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
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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
    <div ref={host} data-in={entered} className={`o-settle ${className ?? ""}`}>
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


/* -------------------------------------------------------- ParallaxY --- */

/** A slow vertical counter-drift for non-photo elements — numerals and
    panels — so the page has depth between layers, not just in frames. */
export function ParallaxY({
  by = 14,
  children,
  className,
}: {
  by?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const inner = useRef<HTMLDivElement>(null);
  const ref = useSectionProgress<HTMLDivElement>((p) => {
    inner.current?.style.setProperty(
      "transform",
      `translate3d(0, ${((p - 0.5) * 2 * by).toFixed(1)}px, 0)`,
    );
  });
  return (
    <div ref={ref} className={className}>
      <div ref={inner} style={{ willChange: "transform" }}>
        {children}
      </div>
    </div>
  );
}


/* -------------------------------------------------------- SignalLine --- */

/** The mock's signal line, horizontal only: a glowing hairline that
    draws across the section as it arrives, a pulse of light traveling
    its length. Blue while working, green once verified. */
export function SignalLine({
  color = "blue",
  className,
}: {
  color?: "blue" | "green";
  className?: string;
}) {
  const line = useRef<HTMLDivElement>(null);
  const ref = useSectionProgress<HTMLDivElement>((p) => {
    line.current?.style.setProperty(
      "transform",
      `scaleX(${Math.min(1, p / 0.6).toFixed(3)})`,
    );
  });
  const tone = color === "green" ? "var(--thread-green)" : "var(--thread-blue)";
  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute h-[2px] ${className ?? ""}`}
    >
      <div
        ref={line}
        className="relative h-full w-full origin-left overflow-hidden"
        style={{
          background: `linear-gradient(90deg, transparent, ${tone} 10%, ${tone} 90%, transparent)`,
          boxShadow: `0 0 14px ${tone}, 0 0 4px ${tone}`,
          willChange: "transform",
        }}
      >
        <span className="o-line-pulse" />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- DeepSeam --- */

/** The deep-parallax turn between sections: a frame that opens like a
    window as the section arrives — the clip widens while the photograph
    inside counter-drifts on a deeper layer, so the page slides over the
    image instead of carrying it. */
export function DeepSeam({
  children,
  className,
  drift = 46,
}: {
  children: React.ReactNode;
  className?: string;
  /** Pixels of counter-drift across the section's travel. */
  drift?: number;
}) {
  const still = useRef(false);
  useEffect(() => {
    still.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
  const frame = useRef<HTMLDivElement>(null);
  const depth = useRef<HTMLDivElement>(null);
  const ref = useSectionProgress<HTMLDivElement>((p) => {
    if (still.current) return;
    const open = 1 - Math.pow(1 - Math.min(1, p / 0.55), 3);
    const y = (1 - open) * 22;
    const x = (1 - open) * 32;
    frame.current?.style.setProperty(
      "clip-path",
      `inset(${y.toFixed(2)}% ${x.toFixed(2)}% ${y.toFixed(2)}% ${x.toFixed(2)}%)`,
    );
    depth.current?.style.setProperty(
      "transform",
      `translate3d(0, ${((p - 0.5) * -2 * drift).toFixed(1)}px, 0)`,
    );
  });
  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <div
        ref={frame}
        className="absolute inset-0 overflow-hidden"
        style={{ willChange: "clip-path" }}
      >
        {/* Oversized on the vertical so the drift never shows an edge. */}
        <div
          ref={depth}
          className="absolute inset-x-0 -inset-y-16"
          style={{ willChange: "transform" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ PointerDepth --- */

/** The dark bands answer the cursor: the photograph shifts a few pixels
    against the overlaid type. Desktop, fine pointers only. */
export function usePointerDepth<T extends HTMLElement>(strength = 6) {
  const host = useRef<T>(null);
  const target = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    target.current = node.querySelector<HTMLElement>("[data-depth]");
    let frame = 0;
    let x = 0;
    let y = 0;
    let dx = 0;
    let dy = 0;
    let running = false;

    const tick = () => {
      dx += (x - dx) * 0.08;
      dy += (y - dy) * 0.08;
      target.current?.style.setProperty(
        "transform",
        `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(1.03)`,
      );
      if (Math.abs(x - dx) > 0.05 || Math.abs(y - dy) > 0.05) {
        frame = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };
    const kick = () => {
      if (!running) {
        running = true;
        frame = requestAnimationFrame(tick);
      }
    };
    const move = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      x = ((event.clientX - rect.left) / rect.width - 0.5) * -2 * strength;
      y = ((event.clientY - rect.top) / rect.height - 0.5) * -2 * strength;
      kick();
    };
    const leave = () => {
      x = 0;
      y = 0;
      kick();
    };
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
    };
  }, [strength]);

  return host;
}
