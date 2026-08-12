"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { ScoreRing } from "@/components/charts/ScoreRing";
import type { PassScore } from "@/lib/passScore";

/**
 * Pass Score — transparent 0–100 health score. The complete component
 * breakdown with per-component reasons is one click away; it is never an
 * unexplained number.
 */
export function PassScoreCard({
  score,
  label,
}: {
  score: PassScore;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section
      aria-labelledby="pass-score-heading"
      className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <p className="micro-label text-champagne">Pass Score</p>
      <div className="mt-3 flex items-center gap-4">
        <ScoreRing value={score.total} />
        <div>
          <h2 id="pass-score-heading" className="text-[15px] font-semibold text-ink">
            {label}
          </h2>
          <p className="mt-1 text-[12.5px] leading-snug text-slate">
            Marketing health across efficiency, growth, tracking, pacing,
            coverage, and planning.
          </p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-2 flex items-center gap-1 text-[13px] font-medium text-cobalt hover:underline"
          >
            {open ? "Hide breakdown" : "Why this score?"}
            <ChevronDown size={14} aria-hidden className={clsx("transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>
      {open && (
        <ul className="mt-4 space-y-3 border-t border-line pt-4">
          {score.components.map((c) => (
            <li key={c.key}>
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <span className="font-medium text-ink">{c.label}</span>
                <span className="tnum text-slate">
                  {c.score}/100 · {Math.round(c.weight * 100)}% weight
                </span>
              </div>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-canvas"
                role="progressbar"
                aria-valuenow={c.score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${c.label} score`}
              >
                <div
                  className={clsx(
                    "h-full rounded-full",
                    c.score >= 80 ? "bg-emerald" : c.score >= 50 ? "bg-cobalt" : c.score >= 30 ? "bg-warning" : "bg-error",
                  )}
                  style={{ width: `${c.score}%` }}
                />
              </div>
              <p className="mt-1 text-[12px] leading-snug text-slate">{c.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
