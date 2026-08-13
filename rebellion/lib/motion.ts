/**
 * Motion tokens — blueprint §08.
 *
 * The CSS custom properties in app/globals.css are the source of truth for
 * anything animated in CSS. This file mirrors them for the few places that
 * need the values in JavaScript (observer thresholds, stagger maths), so no
 * component ever invents its own duration or distance.
 */

export const motion = {
  duration: {
    /** Hover, underline, active state. */
    micro: 160,
    /** Cards, drawers, navigation. */
    ui: 280,
    /** Headline and image reveals. */
    editorial: 640,
    /** Skeleton draw on first entry. Never exceed 1800. */
    signature: 1500,
  },
  ease: {
    expressive: "cubic-bezier(0.16, 1, 0.3, 1)",
    ui: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  /** Reveal travel distance in px. Blueprint: 8–24px, no large fly-ins. */
  distance: { min: 8, default: 20, max: 24 },
  /** Stagger between siblings in ms. Blueprint: 40–80ms. */
  stagger: 60,
  /** Maximum perceived parallax shift, as a fraction of the element height. */
  parallax: 0.06,
  /** Fraction of an element that must be visible before it reveals. */
  revealThreshold: 0.18,
} as const;

/** True when the visitor has asked for reduced motion. Safe on the server. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Stagger delay for the nth sibling in a revealed group. */
export function staggerDelay(index: number, cap = 6): string {
  return `${Math.min(index, cap) * motion.stagger}ms`;
}
