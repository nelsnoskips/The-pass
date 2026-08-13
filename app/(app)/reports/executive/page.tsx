import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/reports/PrintButton";
import { getCurrentUser } from "@/lib/auth";
import {
  demoAnchor,
  getBrand,
  getCalendarItems,
  getCampaignRows,
  getConversionRows,
  getLocations,
  getTotals,
} from "@/lib/data/demo";
import { COMPARISON_LABELS, formatRangeLabel } from "@/lib/dates";
import {
  parseFilters,
  resolveRanges,
  serializeFilters,
  type SearchParams,
} from "@/lib/filters";
import {
  formatCents,
  formatCount,
  formatDate,
  formatMultiple,
  formatPercent,
} from "@/lib/format";
import { buildInsights } from "@/lib/insights";
import { percentChange } from "@/lib/metrics";
import { revenueLabel } from "@/lib/viewModels";

export const metadata = { title: "Executive Report — The Pass" };

export default async function ExecutiveReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  const filters = parseFilters(await searchParams);
  const anchor = demoAnchor();
  const { current, comparison } = resolveRanges(filters, anchor);

  const brand = getBrand();
  const rows = getCampaignRows(user, filters, current, anchor);
  const { totals, derived } = getTotals(user, filters, current, anchor);
  const prev = comparison ? getTotals(user, filters, comparison, anchor) : null;
  const locations = getLocations(user);
  const insights = buildInsights(rows);
  const conversionRows = getConversionRows(user, filters, current, anchor);
  const upcoming = getCalendarItems(user, anchor)
    .filter((i) => i.endDate >= anchor && i.status !== "canceled")
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))
    .slice(0, 6);

  const qs = serializeFilters(filters);
  const topCampaigns = [...rows].sort(
    (a, b) => b.totals.conversions - a.totals.conversions || b.totals.spendCents - a.totals.spendCents,
  );

  const platformSummary = (["google", "meta"] as const).map((platform) => {
    const pRows = rows.filter((r) => r.campaign.platform === platform);
    return {
      platform: platform === "google" ? "Google Ads" : "Meta Ads",
      spend: pRows.reduce((s, r) => s + r.totals.spendCents, 0),
      conversions: pRows.reduce((s, r) => s + r.totals.conversions, 0),
      revenue: pRows.reduce((s, r) => s + r.totals.conversionValueCents, 0),
      count: pRows.length,
    };
  });

  const convChange = percentChange(totals.conversions, prev?.totals.conversions ?? null);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-5 flex items-center justify-between">
        <Link
          href={qs ? `/reports?${qs}` : "/reports"}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-cobalt hover:underline"
        >
          <ArrowLeft size={14} aria-hidden />
          Reports
        </Link>
        <PrintButton />
      </div>

      <article className="print-page rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
        <header className="rounded-t-2xl bg-ink px-8 py-10 text-white">
          <p className="micro-label text-champagne">Executive Report</p>
          <h1 className="mt-3 font-display text-[32px] leading-tight">{brand.name}</h1>
          <p className="mt-2 text-[14px] text-white/70">
            {formatRangeLabel(current)}
            {comparison && ` · compared with ${formatRangeLabel(comparison)} (${COMPARISON_LABELS[filters.compare].toLowerCase()})`}
          </p>
        </header>

        <div className="space-y-8 px-8 py-8">
          <section>
            <h2 className="micro-label text-champagne">Total performance</h2>
            <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Amount Spent", formatCents(totals.spendCents)],
                ["Guest Actions", formatCount(totals.conversions)],
                ["Cost per Action", formatCents(derived.costPerConversionCents)],
                ["Return on Spend", formatMultiple(derived.roas)],
                ["Ad Views", formatCount(totals.impressions)],
                ["Ad Clicks", formatCount(totals.clicks)],
                ["CTR", formatPercent(derived.ctr)],
                [revenueLabel(totals), formatCents(totals.conversionValueCents)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11.5px] font-medium text-slate">{label}</dt>
                  <dd className="tnum mt-0.5 text-[20px] font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {convChange !== null && (
              <p className="mt-3 text-[13px] text-slate">
                Guest actions {convChange >= 0 ? "grew" : "declined"}{" "}
                {Math.abs(convChange).toFixed(1)}% versus the comparison period.
              </p>
            )}
          </section>

          <section>
            <h2 className="micro-label text-champagne">Location comparison</h2>
            <table className="ledger mt-3 w-full text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-2 text-left">Location</th>
                  <th className="py-2 text-right">Spend</th>
                  <th className="py-2 text-right">Actions</th>
                  <th className="py-2 text-right">Cost / Action</th>
                  <th className="py-2 text-right">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => {
                  const lRows = rows.filter((r) => r.campaign.locationId === loc.id);
                  const spend = lRows.reduce((s, r) => s + r.totals.spendCents, 0);
                  const conv = lRows.reduce((s, r) => s + r.totals.conversions, 0);
                  const rev = lRows.reduce((s, r) => s + r.totals.conversionValueCents, 0);
                  return (
                    <tr key={loc.id} className="border-b border-line/70 last:border-0">
                      <td className="py-2 font-medium text-ink">{loc.name}</td>
                      <td className="py-2 text-right">{formatCents(spend)}</td>
                      <td className="py-2 text-right">{formatCount(conv)}</td>
                      <td className="py-2 text-right">{conv > 0 ? formatCents(spend / conv) : "—"}</td>
                      <td className="py-2 text-right">{spend > 0 ? formatMultiple(rev / spend) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="micro-label text-champagne">Platform comparison</h2>
            <table className="ledger mt-3 w-full text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-2 text-left">Platform</th>
                  <th className="py-2 text-right">Campaigns</th>
                  <th className="py-2 text-right">Spend</th>
                  <th className="py-2 text-right">Actions</th>
                  <th className="py-2 text-right">Est. Revenue</th>
                </tr>
              </thead>
              <tbody>
                {platformSummary
                  .filter((p) => p.count > 0)
                  .map((p) => (
                    <tr key={p.platform} className="border-b border-line/70 last:border-0">
                      <td className="py-2 font-medium text-ink">{p.platform}</td>
                      <td className="py-2 text-right">{formatCount(p.count)}</td>
                      <td className="py-2 text-right">{formatCents(p.spend)}</td>
                      <td className="py-2 text-right">{formatCount(p.conversions)}</td>
                      <td className="py-2 text-right">{formatCents(p.revenue)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="micro-label text-champagne">Top campaigns</h2>
            <ol className="mt-3 space-y-2">
              {topCampaigns.slice(0, 4).map((r, i) => (
                <li key={r.campaign.id} className="flex items-baseline gap-3 text-[13px]">
                  <span className="tnum w-5 text-right font-semibold text-champagne">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">{r.campaign.name}</span>
                  <span className="tnum shrink-0 text-slate">
                    {formatCents(r.totals.spendCents)} · {formatCount(r.totals.conversions)} actions
                    {r.derived.costPerConversionCents !== null &&
                      ` at ${formatCents(r.derived.costPerConversionCents)}`}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="micro-label text-champagne">Conversion breakdown</h2>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {conversionRows.map((r) => (
                <li key={`${r.campaign.id}-${r.action.id}`} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate text-ink">
                    {r.action.rawName}
                    {!r.action.includeInTotals && (
                      <span className="text-slate"> (secondary)</span>
                    )}
                  </span>
                  <span className="tnum shrink-0 font-medium text-ink">{formatCount(r.count)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="micro-label text-champagne">What we observed</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13.5px] leading-relaxed text-ink">
              {insights.map((insight, i) => (
                <li key={i}>{insight.text}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="micro-label text-champagne">Upcoming marketing</h2>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {upcoming.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate font-medium text-ink">{item.title}</span>
                  <span className="tnum shrink-0 text-slate">
                    {formatDate(item.startDate)}
                    {item.endDate !== item.startDate && ` – ${formatDate(item.endDate)}`}
                  </span>
                </li>
              ))}
              {upcoming.length === 0 && (
                <li className="text-slate">No upcoming items on the calendar.</li>
              )}
            </ul>
          </section>

          <footer className="border-t border-line pt-4 text-[11.5px] leading-relaxed text-slate">
            <p>
              Data sources: Google Ads and Meta Ads (demo mode). Conversions
              use each platform&apos;s own attribution method and window and are not
              deduplicated across platforms. Revenue is{" "}
              {revenueLabel(totals).toLowerCase()} based on configured
              per-conversion values, not POS revenue. Metrics a platform does
              not support are shown as “—”, never as zero.
            </p>
          </footer>
        </div>
      </article>
    </div>
  );
}
