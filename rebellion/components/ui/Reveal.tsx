"use client";

import { useEffect, useRef } from "react";
import { motion, staggerDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /** Position within a revealed group; drives the stagger delay. */
  index?: number;
  as?: "div" | "section" | "li" | "article" | "header" | "figure";
  /** Anchor target — the happenings list deep-links to individual events. */
  id?: string;
  "aria-label"?: string;
};

/**
 * Editorial reveal on scroll (blueprint §08: 500–800ms, 8–24px, 40–80ms
 * stagger). The element is visible in markup and CSS-hidden only once this
 * mounts, so content survives a JS failure. Reduced motion is handled in CSS,
 * which also means the observer stays cheap.
 */
export function Reveal({
  children,
  className,
  index = 0,
  as: Tag = "div",
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.setAttribute("data-reveal", "");

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", "shown");
          io.unobserve(entry.target);
        }
      },
      { threshold: motion.revealThreshold, rootMargin: "0px 0px -8% 0px" },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={cn(className)}
      style={{ ["--reveal-delay" as string]: staggerDelay(index) }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
