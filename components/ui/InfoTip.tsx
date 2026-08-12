import { Info } from "lucide-react";

/**
 * Metric-definition tooltip. Pure CSS hover/focus so it works in server
 * components; the definition is also exposed to screen readers.
 */
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="text-slate/70 hover:text-slate"
        aria-label={text}
      >
        <Info size={13} aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 w-56 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-left text-[11.5px] font-normal leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
