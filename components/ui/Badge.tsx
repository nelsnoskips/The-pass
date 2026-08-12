import clsx from "clsx";
import type { ReactNode } from "react";

export type BadgeTone =
  | "emerald"
  | "cobalt"
  | "champagne"
  | "warning"
  | "error"
  | "slate";

const TONES: Record<BadgeTone, string> = {
  emerald: "bg-emerald-soft text-emerald",
  cobalt: "bg-cobalt-soft text-cobalt",
  champagne: "bg-champagne-soft text-[#8a6d3b]",
  warning: "bg-warning-soft text-warning",
  error: "bg-error-soft text-error",
  slate: "bg-canvas text-slate",
};

export function Badge({
  tone = "slate",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): BadgeTone {
  switch (status) {
    case "active":
    case "live":
    case "connected":
    case "completed":
    case "success":
      return "emerald";
    case "paused":
    case "planned":
    case "reviewing":
    case "scheduled":
    case "partial":
      return "warning";
    case "ended":
    case "removed":
    case "canceled":
    case "failed":
    case "action_required":
      return "error";
    case "in_production":
    case "in_progress":
    case "approved":
    case "new":
      return "cobalt";
    default:
      return "slate";
  }
}
