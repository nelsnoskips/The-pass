"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, SlidersHorizontal } from "lucide-react";
import { Popover } from "@/components/ui/Popover";
import { Delta } from "@/components/ui/Delta";
import { InfoTip } from "@/components/ui/InfoTip";
import type { MetricDirection } from "@/lib/metrics";
import { useStoredState } from "@/lib/useStoredState";

export interface KpiCardData {
  key: string;
  label: string;
  value: string;
  change: number | null;
  direction: MetricDirection;
  definition: string;
  /** Extra qualifier, e.g. "Estimated" for modeled revenue. */
  qualifier?: string;
}

/**
 * Marketing Pulse — the primary KPI cards. "Manage cards" lets each user
 * show, hide, and reorder cards; preferences persist per user in
 * localStorage (a server-side user preference in production).
 */
export function KpiCards({
  cards,
  rangeLabel,
  comparisonLabel,
  userId,
}: {
  cards: KpiCardData[];
  rangeLabel: string;
  comparisonLabel: string | null;
  userId: string;
}) {
  const known = cards.map((c) => c.key);
  const [prefs, setPrefs, loaded] = useStoredState<{
    order: string[];
    hidden: string[];
  }>(
    `pass-kpi-cards:${userId}`,
    { order: known, hidden: [] },
    // Reconcile stored preferences with the current card set: drop unknown
    // keys, append cards added since the preference was saved.
    (stored) => ({
      order: [
        ...stored.order.filter((k) => known.includes(k)),
        ...known.filter((k) => !stored.order.includes(k)),
      ],
      hidden: stored.hidden.filter((k) => known.includes(k)),
    }),
  );
  const { order, hidden } = prefs;

  const persist = (nextOrder: string[], nextHidden: string[]) =>
    setPrefs({ order: nextOrder, hidden: nextHidden });

  const move = (key: string, dir: -1 | 1) => {
    const i = order.indexOf(key);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    persist(next, hidden);
  };

  const byKey = new Map(cards.map((c) => [c.key, c]));
  const visible = order
    .map((k) => byKey.get(k))
    .filter((c): c is KpiCardData => Boolean(c) && !hidden.includes(c!.key));

  return (
    <section aria-label="Marketing Pulse">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="micro-label text-champagne">Marketing Pulse</p>
          <p className="text-xs text-slate">{rangeLabel}</p>
        </div>
        <Popover
          align="end"
          trigger={
            <>
              <SlidersHorizontal size={14} aria-hidden />
              <span>Manage cards</span>
            </>
          }
          panelClassName="w-72"
        >
          <p className="micro-label px-3 py-1.5 text-slate">Show, hide & reorder</p>
          {order.map((key) => {
            const card = byKey.get(key);
            if (!card) return null;
            const isHidden = hidden.includes(key);
            return (
              <div key={key} className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-canvas">
                <span className="flex-1 truncate text-[13px]">{card.label}</span>
                <button type="button" onClick={() => move(key, -1)} aria-label={`Move ${card.label} up`} className="rounded p-1 text-slate hover:text-ink">
                  <ArrowUp size={13} aria-hidden />
                </button>
                <button type="button" onClick={() => move(key, 1)} aria-label={`Move ${card.label} down`} className="rounded p-1 text-slate hover:text-ink">
                  <ArrowDown size={13} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    persist(
                      order,
                      isHidden ? hidden.filter((k) => k !== key) : [...hidden, key],
                    )
                  }
                  aria-label={isHidden ? `Show ${card.label}` : `Hide ${card.label}`}
                  className="rounded p-1 text-slate hover:text-ink"
                >
                  {isHidden ? <EyeOff size={13} aria-hidden /> : <Eye size={13} aria-hidden />}
                </button>
              </div>
            );
          })}
        </Popover>
      </div>
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
        style={{ opacity: loaded ? 1 : 0.85 }}
      >
        {visible.map((card) => (
          <div key={card.key} className="lift rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-slate">
              {card.label}
              <InfoTip text={card.definition} />
            </p>
            <p className="tnum mt-1.5 text-[22px] font-semibold leading-none text-ink">
              {card.value}
            </p>
            {card.qualifier && (
              <p className="mt-1 text-[10.5px] font-medium uppercase tracking-wide text-champagne">
                {card.qualifier}
              </p>
            )}
            <div className="mt-2">
              <Delta
                change={card.change}
                direction={card.direction}
                comparisonLabel={comparisonLabel ?? undefined}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
