import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The logotype, converted from the supplied 1C vector artwork. `knockout`
 * renders the white version for ink and oxblood grounds.
 */
export function Logotype({
  knockout = false,
  className,
  priority = false,
}: {
  knockout?: boolean;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={
        knockout
          ? "/brand/rebellion-logotype-knockout.png"
          : "/brand/rebellion-logotype.png"
      }
      alt="Rebellion Beachside Bar & Bistro"
      width={1109}
      height={583}
      priority={priority}
      className={cn("h-auto w-full", className)}
    />
  );
}

/**
 * Watercolour bloom — the pale blush and sky washes from the logotype artwork,
 * used as a soft ground behind editorial sections. Pure CSS gradients: no
 * image request, no blur filter large enough to cost a frame.
 */
export function Wash({
  className,
  tone = "blush",
}: {
  className?: string;
  tone?: "blush" | "sky" | "mixed";
}) {
  // `closest-side` keeps the bloom entirely inside its own box, so a section
  // with overflow-hidden never clips the gradient into a hard-edged rectangle.
  const tint =
    tone === "sky"
      ? "radial-gradient(ellipse closest-side at 50% 50%, var(--wash-sky) 0%, transparent 100%)"
      : tone === "mixed"
        ? "radial-gradient(ellipse closest-side at 35% 40%, var(--wash-blush) 0%, transparent 100%), radial-gradient(ellipse closest-side at 68% 62%, var(--wash-sky) 0%, transparent 100%)"
        : "radial-gradient(ellipse closest-side at 50% 50%, var(--wash-blush) 0%, transparent 100%)";

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute opacity-45", className)}
      style={{ backgroundImage: tint }}
    />
  );
}

/**
 * Bottle silhouette used where product photography will go. Deliberately a
 * drawing, not a fake photo — it reads as a placeholder to anyone reviewing
 * the build, and it costs nothing.
 */
export function BottleGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 60 160"
      className={cn("h-full w-auto text-ink/80", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="M24 4h12v34c0 6 12 14 12 30v84a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V68c0-16 12-24 12-30V4Z" />
      <path d="M12 78h36" />
      <rect x="16" y="92" width="28" height="40" rx="1" />
    </svg>
  );
}

/**
 * Ink splatter mark. Secondary texture per blueprint §05 — abstract, never
 * literal insignia.
 */
export function Splatter({
  className,
  color = "var(--oxblood)",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 120"
      className={cn("pointer-events-none absolute", className)}
      fill={color}
    >
      <circle cx="58" cy="54" r="17" />
      <circle cx="88" cy="34" r="5.5" />
      <circle cx="97" cy="62" r="3.2" />
      <circle cx="30" cy="86" r="4.4" />
      <circle cx="76" cy="90" r="2.4" />
      <circle cx="24" cy="40" r="2.8" />
      <path d="M58 37c9 4 13 12 11 20-3 9-13 13-21 10 7 1 14-3 16-10 2-8-1-15-6-20z" />
    </svg>
  );
}
