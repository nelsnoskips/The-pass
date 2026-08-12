import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatChange } from "@/lib/format";
import {
  changeSentiment,
  type MetricDirection,
} from "@/lib/metrics";

/**
 * Comparison delta with business framing: green only when the change is
 * genuinely good for the business (a falling cost per conversion is green;
 * a rising one is red).
 */
export function Delta({
  change,
  direction,
  comparisonLabel,
  className,
}: {
  change: number | null;
  direction: MetricDirection;
  comparisonLabel?: string;
  className?: string;
}) {
  const sentiment = changeSentiment(change, direction);
  const Icon =
    change === null || change === 0
      ? Minus
      : change > 0
        ? ArrowUpRight
        : ArrowDownRight;
  return (
    <span
      className={clsx("inline-flex items-center gap-1 text-xs", className)}
      title={comparisonLabel}
    >
      <span
        className={clsx(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold tnum",
          sentiment === "positive" && "bg-emerald-soft text-emerald",
          sentiment === "negative" && "bg-error-soft text-error",
          sentiment === "neutral" && "bg-canvas text-slate",
        )}
      >
        <Icon size={12} aria-hidden />
        {formatChange(change)}
      </span>
      {comparisonLabel && (
        <span className="hidden text-slate sm:inline">{comparisonLabel}</span>
      )}
    </span>
  );
}
