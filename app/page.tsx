import Link from "next/link";
import { FileText, Sparkles } from "lucide-react";
import { Briefing } from "@/components/overview/Briefing";
import { PassScoreCard } from "@/components/overview/PassScoreCard";
import { KpiCards } from "@/components/overview/KpiCards";
import {
  ActivityFeed,
  LocationComparison,
  OpportunityList,
  ReturnHero,
  Spotlight,
  type LocationCompareRow,
} from "@/components/overview/OverviewCards";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { CampaignTable } from "@/components/campaigns/CampaignTable";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { SectionHeading } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth";
import {
  demoAnchor,
  getCalendarItems,
  getCampaignRows,
  getLocations,
  getManagementActivities,
  getOpportunities,
  getSeries,
  getStrategistNotes,
  getTotals,
} from "@/lib/data/demo";
import {
  COMPARISON_LABELS,
  chartGrouping,
  formatRangeLabel,
} from "@/lib/dates";
import { parseFilters, resolveRanges, serializeFilters, type SearchParams } from "@/lib/filters";
import { formatCents, formatCount, formatDate } from "@/lib/format";
import { buildInsights } from "@/lib/insights";
import { percentChange } from "@/lib/metrics";
import { computePassScore, scoreLabel } from "@/lib/passScore";
import { buildKpiCards, revenueLabel, toTableRows } from "@/lib/viewModels";
import { csvFilename } from "@/lib/csv";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  const filters = parseFilters(await searchParams);
  const anchor = demoAnchor();
  const { current, comparison } = resolveRanges(filters, anchor);

  const rows = getCampaignRows(user, filters, current, anchor);
  const currentTotals = getTotals(user, filters, current, anchor);
  const previousTotals = comparison
    ? getTotals(user, filters, comparison, anchor)
    : null;
  const series = getSeries(user, filters, current, anchor);
  const insights = buildInsights(rows);
  const opportunities = getOpportunities(user, anchor);
  const activities = getManagementActivities(user, anchor);
  const notes = getStrategistNotes(user, anchor).filter(
    (n) => n.visibility === "client" && n.status === "published",
  );
  const locations = getLocations(user);
  const upcomingPlanned = getCalendarItems(user, anchor).filter(
    (item) =>
      item.startDate >= anchor &&
      ["planned", "scheduled", "in_production"].includes(item.status),
  );

  const conversionsChange = percentChange(
    currentTotals.totals.conversions,
    previousTotals?.totals.conversions ?? null,
  );
  const score = computePassScore({
    rows,
    conversionsChange,
    calendarPlannedCount: upcomingPlanned.length,
    locationCount: locations.length,
  });

  // Briefing copy.
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/New_York",
    }).format(new Date()),
  );
  const firstName = user.name.split(" ")[0];
  const greeting =
    hour < 12 ? `Good morning, ${firstName}.` : hour < 18 ? `Good afternoon, ${firstName}.` : `Good evening, ${firstName}.`;
  const headline = `Your marketing generated ${formatCount(currentTotals.totals.conversions)} guest actions ${filters.preset === "last_30" ? "in the last 30 days" : `between ${formatRangeLabel(current)}`}.`;
  const comparisonSentence =
    conversionsChange !== null
      ? `That's ${conversionsChange >= 0 ? "up" : "down"} ${Math.abs(conversionsChange).toFixed(1)}% versus the ${COMPARISON_LABELS[filters.compare].toLowerCase()}, at a blended ${
          currentTotals.derived.costPerConversionCents !== null
            ? formatCents(currentTotals.derived.costPerConversionCents)
            : "—"
        } per guest action.`
      : previousTotals === null
        ? null
        : `The comparison period recorded no conversions, so no change percentage is shown.`;

  const revLabel = revenueLabel(currentTotals.totals);
  const roasChange = percentChange(
    currentTotals.derived.roas,
    previousTotals?.derived.roas ?? null,
  );
  const heroNote =
    roasChange !== null
      ? `Return is ${roasChange >= 0 ? "up" : "down"} ${Math.abs(roasChange).toFixed(1)}% vs. ${COMPARISON_LABELS[filters.compare].toLowerCase()}.`
      : comparison
        ? "No return comparison available for this period."
        : null;

  // Location comparison.
  const locationRows: LocationCompareRow[] = locations.map((loc) => {
    const locRows = rows.filter((r) => r.campaign.locationId === loc.id);
    const spend = locRows.reduce((s, r) => s + r.totals.spendCents, 0);
    const conversions = locRows.reduce((s, r) => s + r.totals.conversions, 0);
    const revenue = locRows.reduce((s, r) => s + r.totals.conversionValueCents, 0);
    const cpa = conversions > 0 ? spend / conversions : null;
    const untracked = locRows.some(
      (r) => r.totals.spendCents > 2000 && r.totals.conversions === 0,
    );
    const statusLine =
      conversions > 0 && cpa !== null && cpa < 500
        ? "Converting efficiently"
        : untracked
          ? "Check conversion tracking"
          : spend === 0
            ? "No active spend"
            : "Building momentum";
    return {
      id: loc.id,
      name: loc.name,
      conversions,
      spendCents: spend,
      costPerConversionCents: cpa,
      roas: spend > 0 ? revenue / spend : null,
      statusLine,
      statusKind:
        statusLine === "Converting efficiently"
          ? "good"
          : statusLine === "Check conversion tracking"
            ? "attention"
            : "neutral",
      href: `/?${serializeFilters({ ...filters, locationIds: [loc.id] })}`,
    };
  });

  const tableRows = toTableRows(rows);
  const kpiCards = buildKpiCards(currentTotals, previousTotals);
  const spotlight =
    opportunities.find((o) => o.priority === "high" && o.estimatedImpact) ??
    opportunities[0] ??
    null;
  const dataThrough = formatDate(series.at(-1)?.date ?? current.end);
  const comparisonLabel = comparison
    ? `vs. ${formatRangeLabel(comparison)}`
    : null;

  const csvHeaders = [
    "Campaign", "Status", "Location", "Platform", "Type", "Spend", "Impressions",
    "Clicks", "Reach", "CTR %", "Conversions", "Cost per Conversion",
    "Conversion Rate %", "Revenue", "ROAS",
  ];
  const csvRows = tableRows.map((r) => [
    r.name, r.status, r.location ?? "Unassigned", r.platform, r.type,
    (r.spendCents / 100).toFixed(2), r.impressions, r.clicks, r.reach,
    r.ctr === null ? null : r.ctr.toFixed(2), r.conversions,
    r.costPerConversionCents === null ? null : (r.costPerConversionCents / 100).toFixed(2),
    r.conversionRate === null ? null : r.conversionRate.toFixed(2),
    (r.revenueCents / 100).toFixed(2),
    r.roas === null ? null : r.roas.toFixed(2),
  ]);

  const qs = serializeFilters(filters);

  return (
    <div className="grid grid-cols-12 gap-4 xl:gap-5">
      <div className="col-span-12 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="sr-only">Campaign Performance overview</h1>
          <p className="text-[13px] text-slate">
            See how your restaurant marketing is performing across every
            platform and location.
          </p>
        </div>
        <div className="no-print flex items-center gap-2">
          <Link
            href={qs ? `/welcome?${qs}` : "/welcome"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink hover:border-slate/40"
          >
            <Sparkles size={14} aria-hidden />
            Take a Tour
          </Link>
          <Link
            href={qs ? `/reports/executive?${qs}` : "/reports/executive"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cobalt px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-cobalt/90"
          >
            <FileText size={14} aria-hidden />
            Export Report
          </Link>
        </div>
      </div>

      <div className="order-1 col-span-12 xl:col-span-8">
        <Briefing
          greeting={greeting}
          headline={headline}
          comparison={comparisonSentence}
          dataThrough={dataThrough}
          strategistNote={notes[0]?.body ?? null}
          strategistName={notes[0]?.author ?? "Alexis Romero"}
          insights={insights}
        />
      </div>
      <div className="order-2 col-span-12 sm:col-span-6 xl:col-span-4">
        <ReturnHero
          roas={currentTotals.derived.roas}
          revenueCents={currentTotals.totals.conversionValueCents}
          spendCents={currentTotals.totals.spendCents}
          revenueLabel={revLabel}
          comparisonNote={heroNote}
        />
      </div>

      <div className="order-3 col-span-12 sm:col-span-6 xl:col-span-4">
        <PassScoreCard score={score} label={scoreLabel(score.total)} />
      </div>
      <div className="order-5 col-span-12 xl:order-4 xl:col-span-8">
        <OpportunityList opportunities={opportunities} />
      </div>

      <div className="order-6 col-span-12 xl:order-5">
        <KpiCards
          cards={kpiCards}
          rangeLabel={formatRangeLabel(current)}
          comparisonLabel={comparisonLabel}
          userId={user.id}
        />
      </div>

      <section
        aria-label="Performance over time"
        className="order-7 col-span-12 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] xl:order-6 xl:col-span-8"
      >
        <SectionHeading title="Amount Spent vs. Total Conversions" className="mb-4" />
        <PerformanceChart series={series} grouping={chartGrouping(current)} />
      </section>
      <div className="order-8 col-span-12 sm:col-span-6 xl:order-7 xl:col-span-4">
        <LocationComparison rows={locationRows} />
      </div>

      <div className="order-9 col-span-12 sm:col-span-6 xl:order-8 xl:col-span-5">
        <ActivityFeed activities={activities.slice(0, 4)} />
      </div>
      <div className="order-4 col-span-12 xl:order-9 xl:col-span-7">
        <Spotlight opportunity={spotlight} />
      </div>

      <section
        aria-label="Campaign breakdown"
        className="order-10 col-span-12 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
      >
        <SectionHeading title="Campaign Breakdown" className="mb-4">
          <ExportCsvButton
            headers={csvHeaders}
            rows={csvRows}
            filename={csvFilename("campaign-breakdown", current.start, current.end)}
          />
        </SectionHeading>
        <CampaignTable rows={tableRows} />
      </section>
    </div>
  );
}
