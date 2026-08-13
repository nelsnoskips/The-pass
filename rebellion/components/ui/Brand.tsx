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
