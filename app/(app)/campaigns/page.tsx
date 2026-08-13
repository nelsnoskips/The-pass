import { CampaignTable } from "@/components/campaigns/CampaignTable";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { SectionHeading } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth";
import { demoAnchor, getCampaignRows, getTotals } from "@/lib/data/demo";
import { formatRangeLabel } from "@/lib/dates";
import { parseFilters, resolveRanges, type SearchParams } from "@/lib/filters";
import { formatCents, formatCount } from "@/lib/format";
import { csvFilename } from "@/lib/csv";
import { toTableRows } from "@/lib/viewModels";

export const metadata = { title: "Campaigns — The Pass" };

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  const filters = parseFilters(await searchParams);
  const anchor = demoAnchor();
  const { current } = resolveRanges(filters, anchor);
  const rows = getCampaignRows(user, filters, current, anchor);
  const { totals, derived } = getTotals(user, filters, current, anchor);
  const tableRows = toTableRows(rows);

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

  return (
    <div className="space-y-5">
      <div>
        <p className="micro-label text-champagne">Campaigns</p>
        <h1 className="mt-1 font-display text-[26px] text-ink">
          Campaign performance
        </h1>
        <p className="mt-1 text-[13px] text-slate">
          {formatRangeLabel(current)} · {formatCount(rows.length)} campaigns ·{" "}
          {formatCents(totals.spendCents)} spent ·{" "}
          {formatCount(totals.conversions)} conversions
          {derived.costPerConversionCents !== null &&
            ` at ${formatCents(derived.costPerConversionCents)} each`}
        </p>
      </div>
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <SectionHeading title="All campaigns" className="mb-4">
          <ExportCsvButton
            headers={csvHeaders}
            rows={csvRows}
            filename={csvFilename("campaigns", current.start, current.end)}
          />
        </SectionHeading>
        <CampaignTable rows={tableRows} />
      </section>
    </div>
  );
}
