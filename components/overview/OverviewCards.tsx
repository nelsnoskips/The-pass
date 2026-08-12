import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge, statusTone } from "@/components/ui/Badge";
import { formatCents, formatCount, formatDate, formatMultiple } from "@/lib/format";
import type {
  ManagementActivity,
  Opportunity,
} from "@/lib/types";

/* ---------------------------------------------------------- Return Hero --- */

export function ReturnHero({
  roas,
  revenueCents,
  spendCents,
  revenueLabel,
  comparisonNote,
}: {
  roas: number | null;
  revenueCents: number;
  spendCents: number;
  revenueLabel: string;
  comparisonNote: string | null;
}) {
  return (
    <section
      aria-label="Marketing return"
      className="flex h-full flex-col justify-between rounded-2xl bg-ink p-6 text-white shadow-[var(--shadow-card)]"
    >
      <div>
        <p className="micro-label text-champagne">Marketing Return</p>
        <p className="tnum mt-3 font-display text-[44px] leading-none">
          {roas !== null ? `${roas.toFixed(2)}×` : "—"}
        </p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">
          {formatCents(revenueCents)} {revenueLabel.toLowerCase()} from{" "}
          {formatCents(spendCents)} invested.
        </p>
      </div>
      <div className="mt-5 border-t border-white/12 pt-3.5">
        <p className="text-xs text-white/55">
          {comparisonNote ?? "No comparison period selected."}
        </p>
        <p className="mt-1 text-[10.5px] uppercase tracking-wide text-champagne/80">
          {revenueLabel}
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------- Opportunity summary --- */

const PRIORITY_TONE = { high: "error", medium: "warning", low: "slate" } as const;

export function OpportunityList({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <section
      aria-labelledby="opps-heading"
      className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="micro-label text-champagne">Opportunities</p>
          <h2 id="opps-heading" className="mt-0.5 text-[15px] font-semibold text-ink">
            What deserves attention
          </h2>
        </div>
        <span className="tnum rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-slate">
          {opportunities.length} open
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {opportunities.map((opp) => (
          <li key={opp.id}>
            <Link
              href={opp.href}
              className="lift block rounded-xl border border-line p-3.5 hover:border-cobalt/40"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={PRIORITY_TONE[opp.priority]}>{opp.priority} priority</Badge>
                <Badge tone={statusTone(opp.status)}>{opp.status.replace("_", " ")}</Badge>
              </div>
              <p className="mt-2 text-[13.5px] font-semibold leading-snug text-ink">
                {opp.title}
              </p>
              <p className="tnum mt-1 text-[12px] text-slate">{opp.supportingMetric}</p>
              {opp.estimatedImpact && (
                <p className="mt-1 text-[12px] font-medium text-emerald">
                  {opp.estimatedImpact}
                </p>
              )}
            </Link>
          </li>
        ))}
        {opportunities.length === 0 && (
          <li className="py-4 text-center text-[13px] text-slate">
            No open opportunities — your strategist reviews the account weekly.
          </li>
        )}
      </ul>
    </section>
  );
}

/* -------------------------------------------------- Opportunity Spotlight --- */

export function Spotlight({ opportunity }: { opportunity: Opportunity | null }) {
  if (!opportunity) return null;
  return (
    <section
      aria-labelledby="spotlight-heading"
      className="rounded-2xl border border-champagne/50 bg-gradient-to-b from-champagne-soft to-surface p-5 shadow-[var(--shadow-card)]"
    >
      <p className="micro-label text-[#8a6d3b]">Opportunity Spotlight</p>
      <h2 id="spotlight-heading" className="mt-2 font-display text-[20px] leading-snug text-ink">
        {opportunity.title}
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-slate">
        {opportunity.explanation}
      </p>
      {opportunity.estimatedImpact && (
        <p className="mt-3 rounded-lg bg-emerald-soft px-3 py-2 text-[13px] font-medium text-emerald">
          Projected impact: {opportunity.estimatedImpact}
        </p>
      )}
      <p className="mt-2 text-[12px] text-slate">
        Recommended: {opportunity.recommendedAction}
      </p>
      <Link
        href={opportunity.href}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-ink-800"
      >
        View opportunity
        <ArrowRight size={14} aria-hidden />
      </Link>
    </section>
  );
}

/* --------------------------------------------------- Management Activity --- */

export function ActivityFeed({ activities }: { activities: ManagementActivity[] }) {
  return (
    <section
      aria-labelledby="activity-heading"
      className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <p className="micro-label text-champagne">Management Activity</p>
      <h2 id="activity-heading" className="mt-0.5 text-[15px] font-semibold text-ink">
        Work completed on your account
      </h2>
      <ol className="mt-4 space-y-4">
        {activities.map((activity) => (
          <li key={activity.id} className="flex gap-3">
            <span className="mt-0.5 text-emerald" aria-hidden>
              <CheckCircle2 size={16} strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold leading-snug text-ink">
                {activity.title}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-slate">
                {activity.why}
              </p>
              <p className="mt-0.5 text-[12px] text-emerald">{activity.impact}</p>
              <p className="mt-0.5 text-[11.5px] text-slate/80">
                {activity.completedBy} · {formatDate(activity.completedAt)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* --------------------------------------------------- Location comparison --- */

export interface LocationCompareRow {
  id: string;
  name: string;
  conversions: number;
  spendCents: number;
  costPerConversionCents: number | null;
  roas: number | null;
  statusLine: string;
  statusKind: "good" | "attention" | "neutral";
  href: string;
}

export function LocationComparison({ rows }: { rows: LocationCompareRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.conversions));
  return (
    <section
      aria-labelledby="loc-compare-heading"
      className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
    >
      <p className="micro-label text-champagne">Locations</p>
      <h2 id="loc-compare-heading" className="mt-0.5 text-[15px] font-semibold text-ink">
        Guest actions by location
      </h2>
      <ul className="mt-4 space-y-4">
        {rows.map((row) => (
          <li key={row.id}>
            <Link href={row.href} className="group block">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13.5px] font-medium text-ink group-hover:text-cobalt">
                  {row.name}
                </span>
                <span className="tnum text-[13px] font-semibold text-ink">
                  {formatCount(row.conversions)}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas">
                <div
                  className="h-full rounded-full bg-cobalt"
                  style={{ width: `${Math.max(2, (row.conversions / max) * 100)}%` }}
                  aria-hidden
                />
              </div>
              <p className="mt-1 flex items-center justify-between text-[12px]">
                <span
                  className={
                    row.statusKind === "good"
                      ? "text-emerald"
                      : row.statusKind === "attention"
                        ? "text-warning"
                        : "text-slate"
                  }
                >
                  {row.statusLine}
                </span>
                <span className="tnum text-slate">
                  {row.costPerConversionCents !== null
                    ? `${formatCents(row.costPerConversionCents)}/action`
                    : row.roas !== null
                      ? formatMultiple(row.roas)
                      : ""}
                </span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
