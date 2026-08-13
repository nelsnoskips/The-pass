import { BRUSH_PATHS, DECKLE_PATHS } from "@/lib/artwork";
import { cn } from "@/lib/utils";

/**
 * The brand's painted layer — watercolour washes, thrown ink, torn paper and
 * brush rules (blueprint §05: warm paper, deep ink, oxblood accents, archival
 * annotation; "collected over time, not generated from a template").
 *
 * Each texture ships as an alpha mask in /public/artwork, so the colour always
 * comes from a palette token: these components paint `currentColor` through the
 * mask, which means a Tailwind `text-*` class recolours the artwork. Generated
 * by scripts/generate-artwork.py and replaceable with scanned artwork that
 * follows the same mask convention.
 *
 * All of it is decorative: aria-hidden, pointer-events-none, and never the
 * carrier of information.
 */

type Placement = { className?: string };

const MASKS = {
  bloomA: "/artwork/bloom-a.png",
  bloomB: "/artwork/bloom-b.png",
  bloomC: "/artwork/bloom-c.png",
  splatterA: "/artwork/splatter-a.png",
  splatterB: "/artwork/splatter-b.png",
  sprayA: "/artwork/spray-a.png",
} as const;

function maskStyle(url: string): React.CSSProperties {
  return {
    WebkitMaskImage: `url(${url})`,
    maskImage: `url(${url})`,
  };
}

/**
 * A watercolour wash. Size and position it with utility classes; tint it with
 * a `text-*` class. Keep these behind content and well under full opacity —
 * the blueprint asks for atmosphere, not decoration that competes.
 */
export function Bloom({
  className,
  variant = "a",
  opacity = 55,
}: Placement & { variant?: "a" | "b" | "c"; opacity?: number }) {
  const url =
    variant === "b" ? MASKS.bloomB : variant === "c" ? MASKS.bloomC : MASKS.bloomA;
  return (
    <span
      aria-hidden
      className={cn("art-mask absolute", className)}
      style={{ ...maskStyle(url), opacity: opacity / 100 }}
    />
  );
}

/** Thrown ink. `spray` is the fine, coreless variant. */
export function InkSplatter({
  className,
  variant = "a",
  opacity = 100,
}: Placement & { variant?: "a" | "b" | "spray"; opacity?: number }) {
  const url =
    variant === "b"
      ? MASKS.splatterB
      : variant === "spray"
        ? MASKS.sprayA
        : MASKS.splatterA;
  return (
    <span
      aria-hidden
      className={cn("art-mask absolute", className)}
      style={{ ...maskStyle(url), opacity: opacity / 100 }}
    />
  );
}

/**
 * A torn paper edge.
 *
 * The tear always belongs to the *paper*, so it is rendered inside the dark
 * section it overlaps: `edge="top"` lays paper over the top of that section,
 * `edge="bottom"` lets paper rise into its foot. Colour it with `text-*` to
 * match whichever surface is doing the tearing.
 */
export function Deckle({
  edge,
  className,
  variant = 0,
}: {
  edge: "top" | "bottom";
  className?: string;
  variant?: 0 | 1 | 2;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 24"
      preserveAspectRatio="none"
      className={cn(
        "pointer-events-none absolute inset-x-0 z-10 h-4 w-full md:h-6",
        edge === "top" ? "top-0 -scale-y-100" : "bottom-0",
        className,
      )}
      fill="currentColor"
    >
      <path d={DECKLE_PATHS[variant]} />
    </svg>
  );
}

/**
 * A brush stroke, used where a hairline rule would feel too mechanical —
 * under eyebrows, above pull quotes, as a chapter divider.
 */
export function BrushRule({
  className,
  variant = 0,
}: {
  className?: string;
  variant?: 0 | 1 | 2;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 16"
      preserveAspectRatio="none"
      className={cn("pointer-events-none block h-2 w-14", className)}
      fill="currentColor"
    >
      <path d={BRUSH_PATHS[variant]} />
    </svg>
  );
}

/**
 * An oversized chapter numeral — the archival annotation from §05. Sits behind
 * or beside a section heading and is never read aloud.
 */
export function ChapterMark({
  n,
  className,
}: {
  n: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "display pointer-events-none select-none text-[clamp(4rem,9vw,9rem)] leading-none opacity-[0.07]",
        className,
      )}
    >
      {n}
    </span>
  );
}
