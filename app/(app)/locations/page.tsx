import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { getCurrentUser } from "@/lib/auth";
import {
  demoAnchor,
  getCampaignRows,
  getIntegrationConnections,
  getLocations,
} from "@/lib/data/demo";
import { formatRangeLabel } from "@/lib/dates";
import {
  parseFilters,
  resolveRanges,
  serializeFilters,
  type SearchParams,
} from "@/lib/filters";
import {
  formatCents,
  formatCount,
  formatMultiple,
} from "@/lib/format";

export const metadata = { title: "Locations — The Pass" };

export default async function LocationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  const filters = parseFilters(await searchParams);
  const anchor = demoAnchor();
  const { current } = resolveRanges(filters, anchor);
  const locations = getLocations(user);
  const rows = getCampaignRows(user, { ...filters, locationIds: null }, current, anchor);
  const connections = getIntegrationConnections(anchor);

  return (
    <div className="space-y-5">
      <div>
        <p className="micro-label text-champagne">Locations</p>
        <h1 className="mt-1 font-display text-[26px] text-ink">
          Every location, side by side
        </h1>
        <p className="mt-1 text-[13px] text-slate">
          {formatRangeLabel(current)} · Selecting a location applies it across
          every report.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {locations.map((loc) => {
          const locRows = rows.filter((r) => r.campaign.locationId === loc.id);
          const spend = locRows.reduce((s, r) => s + r.totals.spendCents, 0);
          const impressions = locRows.reduce((s, r) => s + r.totals.impressions, 0);
          const clicks = locRows.reduce((s, r) => s + r.totals.clicks, 0);
          const conversions = locRows.reduce((s, r) => s + r.totals.conversions, 0);
          const revenue = locRows.reduce((s, r) => s + r.totals.conversionValueCents, 0);
          const cpa = conversions > 0 ? spend / conversions : null;
          const roas = spend > 0 ? revenue / spend : null;
          const platforms = [...new Set(locRows.map((r) => r.campaign.platform))];
          const trackingIssue = locRows.some(
            (r) => r.totals.spendCents > 2000 && r.totals.conversions === 0,
          );
          const overviewHref = `/dashboard?${serializeFilters({ ...filters, locationIds: [loc.id] })}`;
          const profileHref = `/locations/${loc.id}${serializeFilters(filters) ? `?${serializeFilters(filters)}` : ""}`;

          return (
            <article
              key={loc.id}
              className="lift rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[17px] font-semibold text-ink">
                    <Link href={overviewHref} className="hover:text-cobalt">
                      {loc.name}
                    </Link>
                  </h2>
                  <p className="text-[12.5px] text-slate">
                    {loc.address}, {loc.city}, {loc.state} {loc.zip} · {loc.timezone}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {platforms.includes("google") && <Badge tone="cobalt">Google</Badge>}
                  {platforms.includes("meta") && <Badge tone="cobalt">Meta</Badge>}
                  {trackingIssue ? (
                    <Badge tone="warning">Tracking check</Badge>
                  ) : (
                    <Badge tone="emerald">Healthy sync</Badge>
                  )}
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-x-3 gap-y-3 sm:grid-cols-4">
                {[
                  ["Spend", formatCents(spend)],
                  ["Impressions", formatCount(impressions)],
                  ["Clicks", formatCount(clicks)],
                  ["Conversions", formatCount(conversions)],
                  ["Cost / Conv.", formatCents(cpa)],
                  ["Revenue (est.)", formatCents(revenue)],
                  ["ROAS", formatMultiple(roas)],
                  ["Campaigns", formatCount(locRows.length)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[11px] font-medium text-slate">{label}</dt>
                    <dd className="tnum mt-0.5 text-[15px] font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4 flex items-center gap-3 border-t border-line pt-3.5">
                <Link
                  href={overviewHref}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-cobalt hover:underline"
                >
                  Open location overview
                  <ArrowUpRight size={13} aria-hidden />
                </Link>
                <Link
                  href={profileHref}
                  className="text-[13px] font-medium text-slate hover:text-ink"
                >
                  Profile & mappings
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-[12px] text-slate">
        Data synced from{" "}
        {connections
          .map((c) => (c.platform === "google" ? "Google Ads" : "Meta Ads"))
          .join(" and ")}{" "}
        in demo mode. Unmapped campaigns would appear here under “Unassigned”
        with an admin warning.
      </p>
    </div>
  );
}
