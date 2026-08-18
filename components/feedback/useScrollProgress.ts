"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * How far a section has travelled through the viewport, 0—1.
 *
 * Returned as a ref plus an optional coarse state, because almost
 * everything that wants this writes straight to a transform and only a
 * couple of things need to re-render. One rAF-throttled scroll listener
 * per section, and nothing runs when the section is off screen.
 */
export function useScrollProgress<T extends HTMLElement>(options?: {
  /** Re-render at this many steps. Omit for no re-renders at all. */
  steps?: number;
  onChange?: (progress: number) => void;
}) {
  const ref = useRef<T>(null);
  const progress = useRef(0);
  const [step, setStep] = useState(0);
  const steps = options?.steps;
  const onChange = options?.onChange;
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
      const span = rect.height + window.innerHeight;
      // 0 as the section's top edge reaches the bottom of the viewport,
      // 1 as its bottom edge leaves the top.
      const value = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / span));
      progress.current = value;
      handler.current?.(value);
      if (steps) {
        const next = Math.round(value * steps);
        setStep((prev) => (prev === next ? prev : next));
      }
    };

    const onScroll = () => {
      if (queued || !visible) return;
      queued = true;
      frame = requestAnimationFrame(read);
    };

    // Stop doing any of this while the section is nowhere near the view.
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) read();
      },
      { rootMargin: "20% 0px" },
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
  }, [steps]);

  return { ref, progress, step, ratio: steps ? step / steps : 0 };
}

/** Fires once, the first time a node is properly on screen. */
export function useEntered<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, entered };
}

/**
 * Whether the visitor asked for less motion, read as an external store
 * so it is correct on the very first render rather than after an effect
 * has had a chance to correct it.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
