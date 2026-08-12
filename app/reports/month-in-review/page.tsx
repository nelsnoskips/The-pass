import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/reports/PrintButton";
import { getCurrentUser } from "@/lib/auth";
import {
  demoAnchor,
  getBrand,
  getCalendarItems,
  getCampaignRows,
  getManagementActivities,
  getOpportunities,
  getSearchTerms,
  getStrategistNotes,
  getTotals,
} from "@/lib/data/demo";
import { comparisonRange, formatRangeLabel, parseISODate, resolvePreset } from "@/lib/dates";
import { serializeFilters, parseFilters, type SearchParams } from "@/lib/filters";
import {
  formatCents,
  formatCount,
  formatDate,
  formatMultiple,
} from "@/lib/format";
import { percentChange } from "@/lib/metrics";
import { STRATEGIST } from "@/lib/data/seed";
import { revenueLabel } from "@/lib/viewModels";

export const metadata = { title: "The Month in Review — The Pass" };

/**
 * The Month in Review — a premium monthly publication covering the last full
 * calendar month. Location scope follows the global filter; the period is
 * always the last complete month.
 */
export default async function MonthInReviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  const filters = { ...parseFilters(await searchParams), preset: "last_month" as const };
  const anchor = demoAnchor();
  const current = resolvePreset("last_month", anchor);
  const previous = comparisonRange(current, "previous_period", "last_month");

  const brand = getBrand();
  const rows = getCampaignRows(user, filters, current, anchor);
  const { totals, derived } = getTotals(user, filters, current, anchor);
  const prev = previous ? getTotals(user, filters, previous, anchor) : null;
  const activities = getManagementActivities(user, anchor);
  const opportunities = getOpportunities(user, anchor);
  const notes = getStrategistNotes(user, anchor).filter(
    (n) => n.visibility === "client" && n.status === "published",
  );
  const terms = getSearchTerms(user, filters, current, anchor)
    .sort((a, b) => b.metrics.conversions - a.metrics.conversions || b.metrics.clicks - a.metrics.clicks)
    .slice(0, 5);
  const upcoming = getCalendarItems(user, anchor)
    .filter((i) => i.startDate >= anchor && i.status !== "canceled")
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1))
    .slice(0, 5);

  const monthName = parseISODate(current.start).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const qs = serializeFilters(parseFilters(await searchParams));
  const convChange = percentChange(totals.conversions, prev?.totals.conversions ?? null);
  const topCampaign = [...rows].sort((a, b) => b.totals.conversions - a.totals.conversions)[0];

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

      <article className="print-page overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
        <header className="bg-ink px-8 py-12 text-white">
          <p className="micro-label text-champagne">The Month in Review</p>
          <h1 className="mt-4 font-display text-[38px] leading-tight">{monthName}</h1>
          <p className="mt-2 text-[15px] text-white/70">{brand.name}</p>
          <p className="tnum mt-6 font-display text-[26px] text-champagne">
            {formatCount(totals.conversions)} guest actions ·{" "}
            {derived.roas !== null ? `${derived.roas.toFixed(1)}× return` : "return —"}
          </p>
        </header>

        <div className="space-y-8 px-8 py-8">
          <section>
            <h2 className="micro-label text-champagne">Business results</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink">
              Marketing invested {formatCents(totals.spendCents)} in {monthName}{" "}
              and produced {formatCount(totals.conversions)} guest actions
              {derived.costPerConversionCents !== null &&
                ` at ${formatCents(derived.costPerConversionCents)} each`}
              , for {formatCents(totals.conversionValueCents)} in{" "}
              {revenueLabel(totals).toLowerCase()}
              {derived.roas !== null && ` — a ${formatMultiple(derived.roas)} return on spend`}
              .{" "}
              {convChange !== null &&
                `Guest actions ${convChange >= 0 ? "grew" : "declined"} ${Math.abs(convChange).toFixed(1)}% month over month.`}
            </p>
          </section>

          {topCampaign && (
            <section>
              <h2 className="micro-label text-champagne">Leading campaign</h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink">
                <strong className="font-semibold">{topCampaign.campaign.name}</strong>{" "}
                led the month with {formatCount(topCampaign.totals.conversions)} guest
                actions from {formatCents(topCampaign.totals.spendCents)} in spend
                {topCampaign.derived.costPerConversionCents !== null &&
                  ` (${formatCents(topCampaign.derived.costPerConversionCents)} per action)`}
                .
              </p>
            </section>
          )}

          <section>
            <h2 className="micro-label text-champagne">Guest intent</h2>
            <p className="mt-3 text-[13px] text-slate">
              The searches that most often brought guests to you:
            </p>
            <ul className="mt-2 space-y-1.5 text-[13.5px]">
              {terms.map((t) => (
                <li key={t.id} className="flex justify-between gap-3">
                  <span className="font-medium text-ink">“{t.text}”</span>
                  <span className="tnum text-slate">
                    {formatCount(t.metrics.clicks)} clicks · {formatCount(t.metrics.conversions)} actions
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="micro-label text-champagne">Work completed by your team</h2>
            <ul className="mt-3 space-y-2.5">
              {activities.map((a) => (
                <li key={a.id} className="text-[13.5px] leading-relaxed">
                  <span className="font-semibold text-ink">{a.title}.</span>{" "}
                  <span className="text-slate">{a.why}</span>{" "}
                  <span className="text-emerald">{a.impact}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="micro-label text-champagne">Opportunities on the table</h2>
            <ul className="mt-3 space-y-2 text-[13.5px]">
              {opportunities.map((o) => (
                <li key={o.id}>
                  <span className="font-semibold text-ink">{o.title}</span>
                  {o.estimatedImpact && (
                    <span className="text-emerald"> — {o.estimatedImpact}</span>
                  )}
                  <span className="block text-[12.5px] text-slate">{o.recommendedAction}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="micro-label text-champagne">What&apos;s next</h2>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {upcoming.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate font-medium text-ink">{item.title}</span>
                  <span className="tnum shrink-0 text-slate">{formatDate(item.startDate)}</span>
                </li>
              ))}
            </ul>
          </section>

          {notes[0] && (
            <section className="rounded-xl bg-canvas px-6 py-5">
              <h2 className="micro-label text-champagne">A note from {STRATEGIST.name.split(" ")[0]}</h2>
              <p className="mt-2 font-display text-[17px] leading-relaxed text-ink">
                “{notes[0].body}”
              </p>
              <p className="mt-3 text-[12.5px] text-slate">
                {STRATEGIST.name} · {STRATEGIST.role} · {STRATEGIST.email}
              </p>
            </section>
          )}

          <footer className="border-t border-line pt-4 text-[11.5px] leading-relaxed text-slate">
            <p>
              Period: {formatRangeLabel(current)}. Sources: Google Ads and Meta
              Ads (demo mode), each with its own attribution. Revenue figures
              are estimated from configured conversion values unless labeled
              tracked.
            </p>
          </footer>
        </div>
      </article>
    </div>
  );
}
