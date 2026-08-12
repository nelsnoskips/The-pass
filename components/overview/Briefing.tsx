"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Insight } from "@/lib/insights";
import clsx from "clsx";

/**
 * Daily Pass Executive Briefing — the page opens with a plain-language
 * explanation of results, not a grid of KPI cards.
 */
export function Briefing({
  greeting,
  headline,
  comparison,
  dataThrough,
  strategistNote,
  strategistName,
  insights,
}: {
  greeting: string;
  headline: string;
  comparison: string | null;
  dataThrough: string;
  strategistNote: string | null;
  strategistName: string;
  insights: Insight[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      aria-labelledby="briefing-heading"
      className="rounded-2xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8"
    >
      <p className="micro-label text-champagne">Daily Pass Executive Briefing</p>
      <h1 id="briefing-heading" className="mt-3 font-display text-[26px] text-ink sm:text-[32px]">
        {greeting} {headline}
      </h1>
      {comparison && <p className="mt-2 text-[15px] text-slate">{comparison}</p>}
      {strategistNote && (
        <blockquote className="mt-4 rounded-xl bg-canvas px-4 py-3 text-[13.5px] leading-relaxed text-ink">
          <p>“{strategistNote}”</p>
          <footer className="mt-1.5 text-xs font-medium text-slate">
            — {strategistName}, your strategist
          </footer>
        </blockquote>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate">Data through {dataThrough}</p>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex items-center gap-1 text-[13px] font-medium text-cobalt hover:underline"
        >
          {expanded ? "Hide full briefing" : "View full briefing"}
          <ChevronDown
            size={14}
            aria-hidden
            className={clsx("transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>
      {expanded && (
        <ul className="mt-4 space-y-2.5 border-t border-line pt-4">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed">
              <span
                aria-hidden
                className={clsx(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  insight.kind === "positive" && "bg-emerald",
                  insight.kind === "warning" && "bg-warning",
                  insight.kind === "neutral" && "bg-cobalt",
                )}
              />
              <span>
                {insight.kind === "warning" && (
                  <span className="sr-only">Attention: </span>
                )}
                {insight.text}
              </span>
            </li>
          ))}
          {insights.length === 0 && (
            <li className="text-[13px] text-slate">
              No notable observations for this scope and period.
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
