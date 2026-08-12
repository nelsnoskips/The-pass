import { SectionHeading } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { InfoTip } from "@/components/ui/InfoTip";
import { getCurrentUser } from "@/lib/auth";
import {
  demoAnchor,
  getConversionActions,
  getConversionRows,
  getTotals,
} from "@/lib/data/demo";
import { formatRangeLabel } from "@/lib/dates";
import { parseFilters, resolveRanges, type SearchParams } from "@/lib/filters";
import { formatCents, formatCount } from "@/lib/format";
import { csvFilename } from "@/lib/csv";

export const metadata = { title: "Conversions — The Pass" };

const CATEGORY_LABELS: Record<string, string> = {
  reservation: "Reservations",
  online_order: "Online Orders",
  phone_call: "Calls",
  direction_request: "Direction Requests",
  website_action: "Website Actions",
  lead_form: "Lead Forms",
  coupon: "Coupon Claims",
  other: "Other Conversions",
};

export default async function ConversionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  const filters = parseFilters(await searchParams);
  const anchor = demoAnchor();
  const { current } = resolveRanges(filters, anchor);

  const rows = getConversionRows(user, filters, current, anchor);
  const { totals } = getTotals(user, filters, current, anchor);

  const included = rows.filter((r) => r.action.includeInTotals);
  const includedCount = included.reduce((s, r) => s + r.count, 0);
  const includedValue = included.reduce((s, r) => s + r.valueCents, 0);
  const costPerConv =
    includedCount > 0 ? totals.spendCents / includedCount : null;

  const byCategory = new Map<string, number>();
  for (const r of rows) {
    byCategory.set(
      r.action.category,
      (byCategory.get(r.action.category) ?? 0) + r.count,
    );
  }

  const kpis: { label: string; value: string; tip?: string }[] = [
    {
      label: "Total Conversions",
      value: formatCount(includedCount),
      tip: "Sum of included, mapped conversion actions. Secondary actions are reported below but not counted.",
    },
    { label: "Reservations", value: formatCount(byCategory.get("reservation") ?? 0) },
    { label: "Online Orders", value: formatCount(byCategory.get("online_order") ?? 0) },
    { label: "Calls", value: formatCount(byCategory.get("phone_call") ?? 0) },
    { label: "Direction Requests", value: formatCount(byCategory.get("direction_request") ?? 0) },
    {
      label: "Cost per Conversion",
      value: formatCents(costPerConv),
      tip: "Spend ÷ included conversions. Shows — when there are no conversions.",
    },
    {
      label: "Conversion Value",
      value: formatCents(includedValue),
      tip: "Estimated marketing revenue from configured per-conversion values — not POS revenue.",
    },
  ];

  const csvHeaders = [
    "Conversion Name", "Category", "Source Platform", "Location", "Campaign",
    "Count", "Campaign Spend", "Cost per Conversion", "Assigned Value",
    "Total Conversion Value", "Attribution", "Counted in Totals",
  ];
  const csvRows = rows.map((r) => [
    r.action.rawName,
    CATEGORY_LABELS[r.action.category],
    r.action.platform === "google" ? "Google" : "Meta",
    r.locationName ?? "Unassigned",
    r.campaign.name,
    r.count,
    (r.campaignSpendCents / 100).toFixed(2),
    r.count > 0 && r.action.includeInTotals
      ? (r.campaignSpendCents / r.count / 100).toFixed(2)
      : null,
    r.action.estimatedValueCents === null
      ? null
      : (r.action.estimatedValueCents / 100).toFixed(2),
    (r.valueCents / 100).toFixed(2),
    r.action.attributionWindow,
    r.action.includeInTotals ? "Yes" : "Secondary",
  ]);

  const actions = getConversionActions();

  return (
    <div className="space-y-5">
      <div>
        <p className="micro-label text-champagne">Conversions</p>
        <h1 className="mt-1 font-display text-[26px] text-ink">
          What guests actually did
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate">
          {formatRangeLabel(current)} · Attribution is preserved per platform.
          <InfoTip text="Google and Meta measure conversions with different attribution methods and windows. The Pass reports each platform's numbers as reported and never silently merges duplicate-looking events across platforms." />
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
            <p className="flex items-center gap-1 text-[11.5px] font-medium text-slate">
              {kpi.label}
              {kpi.tip && <InfoTip text={kpi.tip} />}
            </p>
            <p className="tnum mt-1.5 text-[20px] font-semibold text-ink">{kpi.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <SectionHeading title="Conversion actions" className="mb-4">
          <ExportCsvButton
            headers={csvHeaders}
            rows={csvRows}
            filename={csvFilename("conversions", current.start, current.end)}
          />
        </SectionHeading>
        {rows.length === 0 ? (
          <EmptyState body="No conversion actions in the selected scope and period." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="ledger w-full min-w-[1000px] text-[13px]">
              <thead>
                <tr className="border-b border-line bg-canvas/60">
                  <th className="px-3 py-2.5 text-left">Conversion name</th>
                  <th className="px-3 py-2.5 text-left">Category</th>
                  <th className="px-3 py-2.5 text-left">Platform</th>
                  <th className="px-3 py-2.5 text-left">Location</th>
                  <th className="px-3 py-2.5 text-left">Campaign</th>
                  <th className="px-3 py-2.5 text-right">Count</th>
                  <th className="px-3 py-2.5 text-right">Cost / Conv.</th>
                  <th className="px-3 py-2.5 text-right">Assigned value</th>
                  <th className="px-3 py-2.5 text-right">Total value</th>
                  <th className="px-3 py-2.5 text-left">Attribution</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.campaign.id}-${r.action.id}`} className="border-b border-line/70 last:border-0">
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-ink">{r.action.rawName}</span>
                      {!r.action.includeInTotals && (
                        <Badge tone="slate" className="ml-1.5">Secondary</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{CATEGORY_LABELS[r.action.category]}</td>
                    <td className="px-3 py-2.5">{r.action.platform === "google" ? "Google" : "Meta"}</td>
                    <td className="px-3 py-2.5 text-slate">{r.locationName ?? "Unassigned"}</td>
                    <td className="max-w-56 truncate px-3 py-2.5 text-slate" title={r.campaign.name}>
                      {r.campaign.name}
                    </td>
                    <td className="px-3 py-2.5 text-right">{formatCount(r.count)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {r.count > 0 && r.action.includeInTotals
                        ? formatCents(r.campaignSpendCents / r.count)
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {r.action.estimatedValueCents !== null
                        ? formatCents(r.action.estimatedValueCents)
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {r.valueCents > 0 ? formatCents(r.valueCents) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate">{r.action.attributionWindow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <SectionHeading title="Conversion mapping" className="mb-1" />
        <p className="mb-4 max-w-2xl text-[12.5px] text-slate">
          Raw platform actions are normalized into restaurant categories. Raw
          names are always preserved. Estimated values are configured per brand
          and clearly labeled — they are never presented as POS revenue.
        </p>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="ledger w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-line bg-canvas/60">
                <th className="px-3 py-2.5 text-left">Raw platform action</th>
                <th className="px-3 py-2.5 text-left">Platform</th>
                <th className="px-3 py-2.5 text-left">Normalized category</th>
                <th className="px-3 py-2.5 text-right">Estimated value</th>
                <th className="px-3 py-2.5 text-left">Counted in totals</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a) => (
                <tr key={a.id} className="border-b border-line/70 last:border-0">
                  <td className="px-3 py-2.5 font-medium text-ink">{a.rawName}</td>
                  <td className="px-3 py-2.5">{a.platform === "google" ? "Google" : "Meta"}</td>
                  <td className="px-3 py-2.5">{CATEGORY_LABELS[a.category]}</td>
                  <td className="px-3 py-2.5 text-right">
                    {a.estimatedValueCents !== null ? formatCents(a.estimatedValueCents) : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {a.includeInTotals ? (
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
      </section>
    </div>
  );
}
