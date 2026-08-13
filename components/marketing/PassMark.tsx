import clsx from "clsx";

/**
 * The Pass secondary symbol: a framed opening (the service pass) over four
 * aligned points (Madison Four). Architectural, never literal. Used sparingly
 * — favicon-scale details, section markers, the loading state.
 */
export function PassMark({
  size = 28,
  color = "currentColor",
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={className}
    >
      {/* The pass: an opening framed on three sides. */}
      <path
        d="M4 22V6h24v16"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="square"
      />
      {/* Four points: preparation moving toward the guest. */}
      {[8, 13.35, 18.65, 24].map((x) => (
        <circle key={x} cx={x} cy="27.4" r="1.7" fill={color} />
      ))}
    </svg>
  );
}

/** Editorial wordmark lockup. */
export function Wordmark({
  tone = "light",
  compact = false,
}: {
  tone?: "light" | "dark";
  compact?: boolean;
}) {
  return (
    <span className="flex items-center gap-3">
      <PassMark
        size={compact ? 22 : 26}
        color={tone === "light" ? "#F1EDE5" : "#0A0A09"}
      />
      <span className="flex flex-col leading-none">
        <span
          className={clsx(
            "font-editorial",
            compact ? "text-[19px]" : "text-[22px]",
            "tracking-[0.18em]",
            tone === "light" ? "text-[#F1EDE5]" : "text-[#0A0A09]",
          )}
        >
          THE&nbsp;PASS
        </span>
        <span
          className={clsx(
            "font-editorial italic",
            compact ? "text-[11px]" : "text-[12px]",
            "mt-1 tracking-[0.04em]",
            tone === "light" ? "text-[#B79A68]" : "text-[#4B1719]",
          )}
        >
          by Madison Four
        </span>
      </span>
    </span>
  );
}
