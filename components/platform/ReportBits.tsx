import Link from "next/link";
import { changeText, dayLabel, fmt, type Unit } from "@/lib/reports/format";
import { PERIODS } from "@/lib/reports/period";

/**
 * Small pieces the reporting and financials pages share: the period
 * picker, a tab row, a number with its change, and plain CSS bars.
 * No chart library — bars are divs sized by percentage.
 */

export function hrefWith(base: string, params: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

export function PeriodNav({ base, days, params = {} }: { base: string; days: number; params?: Record<string, string | null | undefined> }) {
  return (
    <nav className="pf-daynav" aria-label="Period">
      {PERIODS.map((d) => (
        <Link key={d} href={hrefWith(base, { ...params, days: d })} className={`pf-btn small${d === days ? " primary" : ""}`} aria-current={d === days ? "true" : undefined}>
          {d} days
        </Link>
      ))}
    </nav>
  );
}

export function TabNav({ tabs, active, label }: { tabs: { key: string; label: string; href: string }[]; active: string; label: string }) {
  return (
    <nav className="pf-daynav pf-rtabs" aria-label={label}>
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} className={`pf-btn small${t.key === active ? " primary" : ""}`} aria-current={t.key === active ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** A headline number, how it moved, and what it means. */
export function Kpi({ label, unit, cur, prev, days, upIsGood = true, definition, compare = true }: {
  label: string; unit: Unit; cur: number | null; prev: number | null; days: number; upIsGood?: boolean; definition?: string; compare?: boolean;
}) {
  const delta = cur === null || prev === null ? null : cur - prev;
  const tone = delta === null || Math.abs(delta) < 1e-9 ? "" : (delta > 0) === upIsGood ? "up" : "down";
  return (
    <div className="pf-kpi">
      <span className="l">{label}</span>
      <b className="mono">{fmt(unit, cur)}</b>
      {compare && <span className={`d ${tone}`}>{cur === null ? "Not set up" : changeText(unit, cur, prev, days)}</span>}
      {definition && <span className="pf-kpi-def">{definition}</span>}
    </div>
  );
}

/** Bars by day; the previous period, if given, sits behind as a ghost. */
export function DayBars({ days, prev, unit, label, noun }: {
  days: { day: string; value: number }[]; prev?: { day: string; value: number }[] | null; unit: Unit; label: string; noun: string;
}) {
  const max = Math.max(1, ...days.map((d) => d.value), ...(prev ?? []).map((d) => d.value));
  if (!days.length) return null;
  return (
    <>
      <div className={`pf-rbars${days.length > 31 ? " dense" : ""}`} role="img" aria-label={label}>
        {days.map((d, i) => {
          const p = prev?.[i];
          return (
            <div key={d.day} className="pf-rbar" title={`${dayLabel(d.day)}: ${fmt(unit, d.value)} ${noun}${p ? ` · ${dayLabel(p.day)}: ${fmt(unit, p.value)}` : ""}`}>
              {p && <span className="then" style={{ height: `${(p.value / max) * 100}%` }} />}
              <span className="now" style={{ height: `${d.value ? Math.max(2, (d.value / max) * 100) : 0}%` }} />
            </div>
          );
        })}
      </div>
      <div className="pf-rbars-axis mono">
        <span>{dayLabel(days[0].day)}</span>
        <span className="pf-legend"><span className="sw today" /> this period{prev ? <><span className="sw then" /> previous period</> : null}</span>
        <span>{dayLabel(days[days.length - 1].day)}</span>
      </div>
    </>
  );
}

/** Horizontal bars for a breakdown: label, bar, number. */
export function HBars({ rows, empty = "Nothing in this period." }: { rows: { label: string; value: number; display: string; href?: string }[]; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length || rows.every((r) => r.value === 0)) return <p className="pf-sub" style={{ margin: 0 }}>{empty}</p>;
  return (
    <div className="pf-hbars">
      {rows.map((r) => (
        <div key={r.label} className="pf-weekrow pf-hbar">
          <span className="mono">{r.href ? <Link href={r.href}>{r.label}</Link> : r.label}</span>
          <span className="bar"><span style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="n mono">{r.display}</span>
        </div>
      ))}
    </div>
  );
}
