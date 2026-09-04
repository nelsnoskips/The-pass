import Image from "next/image";
import clsx from "clsx";
import type { Frame } from "@/lib/blue";

/**
 * A framed slot in the room.
 *
 * The stage light is painted by the frame itself, so every section is
 * composed and lit before a single photograph exists. When the client's
 * assets land, the image sits over that light rather than replacing a
 * grey box — the grade underneath is the same either way, which is what
 * keeps the page looking like one room rather than a contact sheet.
 */
export function BlueFrame({
  frame,
  className,
  sizes = "(max-width: 900px) 90vw, 40vw",
  priority = false,
  children,
}: {
  frame: Frame;
  className?: string;
  sizes?: string;
  priority?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={clsx("blu-frame", className)}>
      <div className={clsx("blu-lite", `blu-lite-${frame.light}`)} aria-hidden />
      {frame.src ? (
        <Image
          src={frame.src}
          alt={frame.alt}
          fill
          sizes={sizes}
          quality={86}
          priority={priority}
          loading={priority ? undefined : "lazy"}
          style={{ objectPosition: frame.pos ?? "center" }}
        />
      ) : null}
      <div className="blu-grain" aria-hidden />
      {children}
    </div>
  );
}

/**
 * The microphone. It is the visual anchor of the hero, so it is drawn
 * rather than animated: the plane it stands on rides the parallax, the
 * microphone itself never moves against it.
 */
export function BlueMic({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 420" fill="none" aria-hidden focusable="false">
      <defs>
        <linearGradient id="blu-mic-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0a1220" />
          <stop offset="0.42" stopColor="#c9d4e6" />
          <stop offset="0.62" stopColor="#7d8ca6" />
          <stop offset="1" stopColor="#0a1220" />
        </linearGradient>
        <linearGradient id="blu-mic-stand" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#060c16" />
          <stop offset="0.45" stopColor="#94a3ba" />
          <stop offset="1" stopColor="#060c16" />
        </linearGradient>
      </defs>
      {/* head */}
      <rect x="24" y="18" width="72" height="126" rx="34" fill="url(#blu-mic-body)" />
      <g stroke="#050a12" strokeWidth="2.4" opacity="0.5">
        {[38, 52, 66, 80, 94, 108, 122].map((y) => (
          <line key={y} x1="27" y1={y} x2="93" y2={y} />
        ))}
      </g>
      <rect x="24" y="18" width="72" height="126" rx="34" fill="none" stroke="#dfe7f2" strokeOpacity="0.35" strokeWidth="2" />
      {/* yoke */}
      <path d="M18 62v46a42 42 0 0 0 84 0V62" stroke="url(#blu-mic-stand)" strokeWidth="6" fill="none" />
      <rect x="52" y="150" width="16" height="30" rx="4" fill="url(#blu-mic-stand)" />
      {/* stand */}
      <rect x="56" y="178" width="8" height="212" fill="url(#blu-mic-stand)" />
      <ellipse cx="60" cy="396" rx="46" ry="10" fill="#0a1220" />
      <ellipse cx="60" cy="393" rx="46" ry="10" fill="url(#blu-mic-stand)" opacity="0.8" />
    </svg>
  );
}
