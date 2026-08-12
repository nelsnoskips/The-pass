"use client";

import { useMemo, useState } from "react";
import { formatCents, formatCount, formatDate } from "@/lib/format";
import type { SeriesPoint } from "@/lib/types";

/**
 * Dual-axis time series: metric A as a cobalt area/line on the left axis,
 * metric B as emerald bars on the right axis. Metric selectors let the user
 * compare any two series; legend entries toggle visibility. Groups weekly
 * beyond 90 days. A visually hidden table mirrors the data for AT.
 */

type MetricKey = "spend" | "conversions" | "clicks" | "impressions" | "revenue";

const METRICS: Record<
  MetricKey,
  { label: string; get: (p: SeriesPoint) => number; money: boolean }
> = {
  spend: { label: "Amount Spent", get: (p) => p.spendCents / 100, money: true },
  conversions: { label: "Total Conversions", get: (p) => p.conversions, money: false },
  clicks: { label: "Ad Clicks", get: (p) => p.clicks, money: false },
  impressions: { label: "Ad Views", get: (p) => p.impressions, money: false },
  revenue: {
    label: "Marketing Revenue",
    get: (p) => p.conversionValueCents / 100,
    money: true,
  },
};

const W = 760;
const H = 240;
const PAD = { top: 12, right: 44, bottom: 24, left: 52 };

function isoWeekStart(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // Monday = 0
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
}

export function PerformanceChart({
  series,
  grouping,
}: {
  series: SeriesPoint[];
  grouping: "day" | "week";
}) {
  const [metricA, setMetricA] = useState<MetricKey>("spend");
  const [metricB, setMetricB] = useState<MetricKey>("conversions");
  const [showA, setShowA] = useState(true);
  const [showB, setShowB] = useState(true);
  const [hover, setHover] = useState<number | null>(null);

  const points = useMemo(() => {
    if (grouping === "day") return series;
    const byWeek = new Map<string, SeriesPoint>();
    for (const p of series) {
      const week = isoWeekStart(p.date);
      const agg = byWeek.get(week) ?? {
        date: week,
        spendCents: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversionValueCents: 0,
      };
      agg.spendCents += p.spendCents;
      agg.impressions += p.impressions;
      agg.clicks += p.clicks;
      agg.conversions += p.conversions;
      agg.conversionValueCents += p.conversionValueCents;
      byWeek.set(week, agg);
    }
    return [...byWeek.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [series, grouping]);

  const a = METRICS[metricA];
  const b = METRICS[metricB];
  const maxA = Math.max(1, ...points.map(a.get));
  const maxB = Math.max(1, ...points.map(b.get));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const xAt = (i: number) =>
    PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yA = (v: number) => PAD.top + innerH - (v / maxA) * innerH;
  const yB = (v: number) => PAD.top + innerH - (v / maxB) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yA(a.get(p)).toFixed(1)}`)
    .join(" ");
  const areaPath = points.length
    ? `${linePath} L${xAt(points.length - 1).toFixed(1)},${PAD.top + innerH} L${xAt(0).toFixed(1)},${PAD.top + innerH} Z`
    : "";
  const barWidth = Math.max(2, Math.min(14, innerW / Math.max(points.length, 1) - 3));

  const fmtA = (v: number) => (a.money ? formatCents(Math.round(v * 100)) : formatCount(Math.round(v)));
  const fmtB = (v: number) => (b.money ? formatCents(Math.round(v * 100)) : formatCount(Math.round(v)));
  const hovered = hover !== null ? points[hover] : null;

  if (points.length === 0) {
    return (
      <p className="px-1 py-10 text-center text-sm text-slate">
        No activity in this period for the selected scope.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[13px]">
        <MetricSelect value={metricA} onChange={setMetricA} exclude={metricB} label="Left axis metric" />
        <span className="text-slate">vs.</span>
        <MetricSelect value={metricB} onChange={setMetricB} exclude={metricA} label="Right axis metric" />
        <div className="ml-auto flex items-center gap-3">
          <LegendToggle color="var(--cobalt)" label={a.label} on={showA} onToggle={() => setShowA((v) => !v)} />
          <LegendToggle color="var(--emerald)" label={b.label} on={showB} onToggle={() => setShowB((v) => !v)} />
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`${a.label} versus ${b.label} over time`}
          onMouseLeave={() => setHover(null)}
        >
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <line
              key={t}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={PAD.top + innerH * (1 - t)}
              y2={PAD.top + innerH * (1 - t)}
              stroke="var(--line)"
              strokeWidth={1}
            />
          ))}
          <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="var(--slate)" strokeOpacity={0.35} />

          {[0.5, 1].map((t) => (
            <text key={`la${t}`} x={PAD.left - 6} y={yA(maxA * t) + 3} textAnchor="end" fontSize={9.5} fill="var(--slate)" className="tnum">
              {fmtA(maxA * t)}
            </text>
          ))}
          {[0.5, 1].map((t) => (
            <text key={`ra${t}`} x={W - PAD.right + 6} y={yB(maxB * t) + 3} textAnchor="start" fontSize={9.5} fill="var(--slate)" className="tnum">
              {fmtB(maxB * t)}
            </text>
          ))}
          {points.map((p, i) =>
            i % Math.ceil(points.length / 6) === 0 ? (
              <text key={p.date} x={xAt(i)} y={H - 6} textAnchor="middle" fontSize={9.5} fill="var(--slate)">
                {formatDate(p.date).replace(/, \d{4}$/, "")}
              </text>
            ) : null,
          )}

          {showB &&
            points.map((p, i) => {
              const v = b.get(p);
              return (
                <rect
                  key={`b${p.date}`}
                  x={xAt(i) - barWidth / 2}
                  y={yB(v)}
                  width={barWidth}
                  height={Math.max(0, PAD.top + innerH - yB(v))}
                  rx={2}
                  fill="var(--emerald)"
                  opacity={hover === i ? 0.95 : 0.55}
                />
              );
            })}
          {showA && (
            <>
              <path d={areaPath} fill="var(--cobalt)" opacity={0.08} />
              <path d={linePath} fill="none" stroke="var(--cobalt)" strokeWidth={2} strokeLinejoin="round" />
            </>
          )}
          {hovered && (
            <line x1={xAt(hover!)} x2={xAt(hover!)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--slate)" strokeOpacity={0.4} strokeDasharray="3 3" />
          )}
          {points.map((p, i) => (
            <rect
              key={`h${p.date}`}
              x={xAt(i) - innerW / Math.max(points.length - 1, 1) / 2}
              y={PAD.top}
              width={innerW / Math.max(points.length - 1, 1)}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute top-2 z-20 w-48 rounded-lg border border-line bg-surface p-3 text-xs shadow-[var(--shadow-card-hover)]"
            style={{
              left: `min(max(${((xAt(hover!) / W) * 100).toFixed(1)}% - 6rem, 0%), calc(100% - 12rem))`,
            }}
          >
            <p className="font-semibold text-ink">
              {grouping === "week" ? `Week of ${formatDate(hovered.date)}` : formatDate(hovered.date)}
            </p>
            <dl className="mt-1.5 space-y-1">
              <div className="flex justify-between gap-2">
                <dt className="text-slate">Spend</dt>
                <dd className="tnum font-medium">{formatCents(hovered.spendCents)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate">Conversions</dt>
                <dd className="tnum font-medium">{formatCount(hovered.conversions)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate">Cost / conversion</dt>
                <dd className="tnum font-medium">
                  {hovered.conversions > 0
                    ? formatCents(hovered.spendCents / hovered.conversions)
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>
          {a.label} and {b.label} by {grouping}
        </caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>{a.label}</th>
            <th>{b.label}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <td>{formatDate(p.date)}</td>
              <td>{fmtA(a.get(p))}</td>
              <td>{fmtB(b.get(p))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricSelect({
  value,
  onChange,
  exclude,
  label,
}: {
  value: MetricKey;
  onChange: (m: MetricKey) => void;
  exclude: MetricKey;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as MetricKey)}
      className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[13px] font-medium text-ink"
    >
      {(Object.keys(METRICS) as MetricKey[]).map((key) => (
        <option key={key} value={key} disabled={key === exclude}>
          {METRICS[key].label}
        </option>
      ))}
    </select>
  );
}

function LegendToggle({
  color,
  label,
  on,
  onToggle,
}: {
  color: string;
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className="flex items-center gap-1.5 text-xs font-medium"
      style={{ opacity: on ? 1 : 0.4 }}
    >
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />
      {label}
    </button>
  );
}
