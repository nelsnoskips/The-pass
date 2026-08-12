import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { Badge, statusTone } from "@/components/ui/Badge";
import { SectionHeading } from "@/components/ui/Card";
import { InfoTip } from "@/components/ui/InfoTip";
import { getCurrentUser } from "@/lib/auth";
import {
  demoAnchor,
  getCampaign,
  getCampaignRows,
  getCampaignSeries,
  getConversionRows,
  getKeywords,
  getMetaStructure,
  getPmaxInsights,
  getSearchTerms,
} from "@/lib/data/demo";
import { chartGrouping, formatRangeLabel } from "@/lib/dates";
import {
  parseFilters,
  resolveRanges,
  serializeFilters,
  type SearchParams,
} from "@/lib/filters";
import {
  formatCents,
  formatCount,
  formatDecimal,
  formatMultiple,
  formatPercent,
} from "@/lib/format";
import { TYPE_LABELS, platformLabel, revenueLabel } from "@/lib/viewModels";
import { DEFAULT_FILTERS } from "@/lib/filters";

export const metadata = { title: "Campaign detail — The Pass" };

const CATEGORY_LABELS: Record<string, string> = {
  reservation: "Reservations",
  online_order: "Online Orders",
  phone_call: "Phone Calls",
  direction_request: "Direction Requests",
  website_action: "Website Actions",
  lead_form: "Lead Forms",
  coupon: "Coupon Claims",
  other: "Other",
};

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const filters = parseFilters(await searchParams);
  const anchor = demoAnchor();
  const { current } = resolveRanges(filters, anchor);

  const campaign = getCampaign(user, id);
  if (!campaign) notFound();

  // Row scoped to just this campaign (unfiltered platform scope so the
  // detail is reachable regardless of the active platform filter).
  const row = getCampaignRows(
    user,
    { ...DEFAULT_FILTERS, locationIds: filters.locationIds },
    current,
    anchor,
  ).find((r) => r.campaign.id === id);
  if (!row) notFound();

  const series = getCampaignSeries(id, current, anchor);
  const conversionRows = getConversionRows(
    user,
    DEFAULT_FILTERS,
    current,
    anchor,
  ).filter((r) => r.campaign.id === id);
  const keywords = getKeywords(user, DEFAULT_FILTERS, current, anchor).filter(
    (k) => k.campaignId === id,
  );
  const searchTerms = getSearchTerms(user, DEFAULT_FILTERS, current, anchor).filter(
    (t) => t.campaignId === id,
  );
  const pmaxInsights = getPmaxInsights(user, DEFAULT_FILTERS).filter(
    (i) => i.campaignId === id,
  );
  const metaRows = getMetaStructure(user, id, current, anchor);

  const qs = serializeFilters(filters);
  const backHref = qs ? `/campaigns?${qs}` : "/campaigns";
  const revLabel = revenueLabel(row.totals);

  const summary: { label: string; value: string; tip?: string }[] = [
    { label: "Amount Spent", value: formatCents(row.totals.spendCents) },
    { label: "Impressions", value: formatCount(row.totals.impressions) },
    { label: "Clicks", value: formatCount(row.totals.clicks) },
    { label: "CTR", value: formatPercent(row.derived.ctr) },
    { label: "Avg. CPC", value: formatCents(row.derived.cpcCents) },
    { label: "Conversions", value: formatCount(row.totals.conversions) },
    {
      label: "Cost per Conversion",
      value: formatCents(row.derived.costPerConversionCents),
      tip: "Spend ÷ conversions. Shows — when there are no conversions.",
    },
    { label: revLabel, value: formatCents(row.totals.conversionValueCents) },
    { label: "ROAS", value: formatMultiple(row.derived.roas) },
  ];
  if (campaign.platform === "meta") {
    summary.splice(1, 0, {
      label: "Reach",
      value: formatCount(row.totals.reach),
      tip: "Unique accounts reached (Meta only).",
    });
    summary.splice(4, 0, {
      label: "Frequency",
      value: formatDecimal(row.derived.frequency, 2),
      tip: "Impressions ÷ reach.",
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-cobalt hover:underline"
        >
          <ArrowLeft size={14} aria-hidden />
          All campaigns
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-[24px] leading-tight text-ink">
            {campaign.name}
          </h1>
          <Badge tone={statusTone(campaign.status)}>{campaign.status}</Badge>
        </div>
        <p className="mt-1 text-[13px] text-slate">
          {platformLabel(campaign.platform)} · {TYPE_LABELS[campaign.type]} ·{" "}
          {row.locationName ?? "Unassigned"} ·{" "}
          {campaign.dailyBudgetCents !== null
            ? `${formatCents(campaign.dailyBudgetCents)}/day budget`
            : "No budget on record"}{" "}
          · {formatRangeLabel(current)}
        </p>
        {row.locationName === null && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-warning-soft px-3 py-1.5 text-[12.5px] font-medium text-warning">
            <TriangleAlert size={14} aria-hidden />
            This campaign is not mapped to a location. Map it in Integrations so
            its results appear in location reporting.
          </p>
        )}
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <SectionHeading title="Summary" className="mb-4" />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
          {summary.map((item) => (
            <div key={item.label}>
              <dt className="flex items-center gap-1 text-[12px] font-medium text-slate">
                {item.label}
                {item.tip && <InfoTip text={item.tip} />}
              </dt>
              <dd className="tnum mt-1 text-[17px] font-semibold text-ink">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <SectionHeading title="Performance trend" className="mb-4" />
        <PerformanceChart series={series} grouping={chartGrouping(current)} />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <SectionHeading title="Conversion breakdown" className="mb-1" />
        <p className="mb-4 flex items-center gap-1 text-[12.5px] text-slate">
          Platform-reported attribution is preserved per action.
          <InfoTip text="Google and Meta use different attribution methods and windows. Actions are shown as reported by each platform and are not deduplicated across platforms." />
        </p>
        {conversionRows.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-slate">
            No conversion actions are mapped to this campaign yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ledger w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-3 py-2 text-left">Conversion action</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Attribution</th>
                  <th className="px-3 py-2 text-right">Count</th>
                  <th className="px-3 py-2 text-right">Value</th>
                  <th className="px-3 py-2 text-left">Counted in totals</th>
                </tr>
              </thead>
              <tbody>
                {conversionRows.map((r) => (
                  <tr key={r.action.id} className="border-b border-line/70 last:border-0">
                    <td className="px-3 py-2.5 font-medium text-ink">{r.action.rawName}</td>
                    <td className="px-3 py-2.5">{CATEGORY_LABELS[r.action.category]}</td>
                    <td className="px-3 py-2.5 text-slate">{r.action.attributionWindow}</td>
                    <td className="px-3 py-2.5 text-right">{formatCount(r.count)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {r.valueCents > 0 ? formatCents(r.valueCents) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.action.includeInTotals ? (
                        <Badge tone="emerald">Included</Badge>
                      ) : (
                        <Badge tone="slate">Secondary</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {campaign.type === "search" && (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
          <SectionHeading title="Keywords & search terms" className="mb-1">
            <Link
              href={qs ? `/keywords?${qs}` : "/keywords"}
              className="text-[13px] font-medium text-cobalt hover:underline"
            >
              Open full report
            </Link>
          </SectionHeading>
          <p className="mb-4 text-[12.5px] text-slate">
            Keywords are the terms you target; search terms are the real
            searches that triggered your ads.
          </p>
          <div className="grid gap-5 xl:grid-cols-2">
            <div>
              <h3 className="micro-label mb-2 text-slate">Keywords</h3>
              <div className="overflow-x-auto">
                <table className="ledger w-full min-w-[440px] text-[13px]">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-2 py-2 text-left">Keyword</th>
                      <th className="px-2 py-2 text-left">Match</th>
                      <th className="px-2 py-2 text-right">Clicks</th>
                      <th className="px-2 py-2 text-right">Conv.</th>
                      <th className="px-2 py-2 text-right">Cost/Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((k) => (
                      <tr key={k.id} className="border-b border-line/70 last:border-0">
                        <td className="px-2 py-2 font-medium text-ink">{k.text}</td>
                        <td className="px-2 py-2 capitalize text-slate">{k.matchType}</td>
                        <td className="px-2 py-2 text-right">{formatCount(k.metrics.clicks)}</td>
                        <td className="px-2 py-2 text-right">{formatCount(k.metrics.conversions)}</td>
                        <td className="px-2 py-2 text-right">
                          {k.metrics.conversions > 0
                            ? formatCents(k.metrics.spendCents / k.metrics.conversions)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="micro-label mb-2 text-slate">Search terms</h3>
              <div className="overflow-x-auto">
                <table className="ledger w-full min-w-[440px] text-[13px]">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-2 py-2 text-left">Search term</th>
                      <th className="px-2 py-2 text-right">Impr.</th>
                      <th className="px-2 py-2 text-right">Clicks</th>
                      <th className="px-2 py-2 text-right">Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchTerms.map((t) => (
                      <tr key={t.id} className="border-b border-line/70 last:border-0">
                        <td className="px-2 py-2 font-medium text-ink">{t.text}</td>
                        <td className="px-2 py-2 text-right">{formatCount(t.metrics.impressions)}</td>
                        <td className="px-2 py-2 text-right">{formatCount(t.metrics.clicks)}</td>
                        <td className="px-2 py-2 text-right">{formatCount(t.metrics.conversions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      )}

      {campaign.type === "performance_max" && (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
          <SectionHeading title="Performance Max search insights" className="mb-1" />
          <p className="mb-4 text-[12.5px] text-slate">
            Performance Max does not use traditional keyword targeting. These
            are Google-provided search category insights — directional signals,
            not a complete keyword list.
          </p>
          <div className="overflow-x-auto">
            <table className="ledger w-full min-w-[480px] text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-3 py-2 text-left">Search category (insight)</th>
                  <th className="px-3 py-2 text-right">Impressions</th>
                  <th className="px-3 py-2 text-right">Clicks</th>
                  <th className="px-3 py-2 text-right">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {pmaxInsights.map((i) => (
                  <tr key={i.id} className="border-b border-line/70 last:border-0">
                    <td className="px-3 py-2.5 font-medium text-ink">{i.category}</td>
                    <td className="px-3 py-2.5 text-right">{formatCount(i.impressions)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCount(i.clicks)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCount(i.conversions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {campaign.platform === "meta" && metaRows.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
          <SectionHeading title="Ad sets & ads" className="mb-4" />
          <div className="overflow-x-auto">
            <table className="ledger w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-3 py-2 text-left">Ad set</th>
                  <th className="px-3 py-2 text-left">Ad</th>
                  <th className="px-3 py-2 text-right">Reach</th>
                  <th className="px-3 py-2 text-right">Impressions</th>
                  <th className="px-3 py-2 text-right">Link clicks</th>
                  <th className="px-3 py-2 text-right">CTR</th>
                  <th className="px-3 py-2 text-right">CPC</th>
                  <th className="px-3 py-2 text-right">Spend</th>
                  <th className="px-3 py-2 text-right">Results</th>
                </tr>
              </thead>
              <tbody>
                {metaRows.map((r) => (
                  <tr key={r.ad} className="border-b border-line/70 last:border-0">
                    <td className="px-3 py-2.5 text-slate">{r.adSet}</td>
                    <td className="px-3 py-2.5 font-medium text-ink">{r.ad}</td>
                    <td className="px-3 py-2.5 text-right">{formatCount(r.reach)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCount(r.impressions)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCount(r.clicks)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {r.impressions > 0
                        ? formatPercent((r.clicks / r.impressions) * 100)
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {r.clicks > 0 ? formatCents(r.spendCents / r.clicks) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">{formatCents(r.spendCents)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCount(r.conversions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
