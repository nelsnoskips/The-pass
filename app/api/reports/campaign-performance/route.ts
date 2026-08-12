import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  demoAnchor,
  getBrand,
  getCampaignRows,
  getSeries,
  getTotals,
} from "@/lib/data/demo";
import { parseFilters, resolveRanges } from "@/lib/filters";
import { percentChange } from "@/lib/metrics";

/**
 * GET /api/reports/campaign-performance
 *   ?loc=&platform=&refine=&range=&start=&end=&compare=
 *
 * The organization/brand scope comes from the authenticated session — never
 * from client input. Location scope is intersected with the user's grant in
 * the data layer, so this endpoint can't be used to read unauthorized
 * locations. Filters use the same URL grammar as the app pages.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseFilters(params);
  const anchor = demoAnchor();
  const { current, comparison } = resolveRanges(filters, anchor);

  const rows = getCampaignRows(user, filters, current, anchor);
  const currentTotals = getTotals(user, filters, current, anchor);
  const previousTotals = comparison
    ? getTotals(user, filters, comparison, anchor)
    : null;
  const series = getSeries(user, filters, current, anchor);
  const brand = getBrand();

  const warnings: string[] = [];
  const unmapped = rows.filter((r) => r.locationName === null);
  if (unmapped.length > 0) {
    warnings.push(
      `${unmapped.length} campaign(s) are not mapped to a location and appear as Unassigned.`,
    );
  }
  for (const r of rows) {
    if (r.totals.spendCents > 2000 && r.totals.conversions === 0) {
      warnings.push(
        `Campaign "${r.campaign.name}" has spend without tracked conversions — verify conversion tracking.`,
      );
    }
  }

  return NextResponse.json({
    scope: {
      brandId: brand.id,
      timezone: brand.timezone,
      locationIds: filters.locationIds ?? "all_authorized",
      platform: filters.platform,
      googleRefine: filters.googleRefine,
      range: current,
      comparisonRange: comparison,
    },
    kpis: {
      current: currentTotals,
      previous: previousTotals,
      deltas: previousTotals
        ? {
            spend: percentChange(
              currentTotals.totals.spendCents,
              previousTotals.totals.spendCents,
            ),
            conversions: percentChange(
              currentTotals.totals.conversions,
              previousTotals.totals.conversions,
            ),
            costPerConversion: percentChange(
              currentTotals.derived.costPerConversionCents,
              previousTotals.derived.costPerConversionCents,
            ),
            roas: percentChange(
              currentTotals.derived.roas,
              previousTotals.derived.roas,
            ),
          }
        : null,
    },
    series,
    campaigns: rows,
    freshness: {
      dataThrough: series.at(-1)?.date ?? null,
      source: "demo",
    },
    warnings,
  });
}
