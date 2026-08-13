import Link from "next/link";
import clsx from "clsx";
import { TermTable, type TermRow } from "@/components/keywords/TermTable";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth";
import {
  demoAnchor,
  getCampaign,
  getKeywords,
  getLocations,
  getPmaxInsights,
  getSearchTerms,
} from "@/lib/data/demo";
import { formatRangeLabel } from "@/lib/dates";
import {
  parseFilters,
  resolveRanges,
  serializeFilters,
  type SearchParams,
} from "@/lib/filters";
import { formatCount } from "@/lib/format";
import { csvFilename } from "@/lib/csv";
import { CAMPAIGNS, KEYWORD_SEEDS } from "@/lib/data/seed";

export const metadata = { title: "Keywords & Search Terms — The Pass" };

const TABS = [
  { key: "keywords", label: "Keywords" },
  { key: "terms", label: "Search Terms" },
  { key: "pmax", label: "PMax Search Insights" },
  { key: "locations", label: "Location Keywords" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function KeywordsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const filters = parseFilters(params);
  const tab: TabKey = (TABS.find((t) => t.key === params.tab)?.key ?? "keywords") as TabKey;
  const anchor = demoAnchor();
  const { current } = resolveRanges(filters, anchor);

  const keywords = getKeywords(user, filters, current, anchor);
  const searchTerms = getSearchTerms(user, filters, current, anchor);
  const pmaxInsights = getPmaxInsights(user, filters);
  const locations = getLocations(user);

  const campaignName = (id: string) =>
    CAMPAIGNS.find((c) => c.id === id)?.name ?? id;
  const campaignLocation = (id: string) => {
    const campaign = getCampaign(user, id);
    return (
      locations.find((l) => l.id === campaign?.locationId)?.name ?? "Unassigned"
    );
  };

  const keywordRows: TermRow[] = keywords.map((k) => ({
    id: k.id,
    text: k.text,
    location: campaignLocation(k.campaignId),
    campaign: campaignName(k.campaignId),
    adGroup: k.adGroup,
    matchType: k.matchType,
    status: k.status,
    impressions: k.metrics.impressions,
    clicks: k.metrics.clicks,
    spendCents: k.metrics.spendCents,
    conversions: k.metrics.conversions,
    valueCents: k.metrics.conversionValueCents,
    tags: k.tags,
  }));

  const termRows: TermRow[] = searchTerms.map((t) => ({
    id: t.id,
    text: t.text,
    location: campaignLocation(t.campaignId),
    campaign: campaignName(t.campaignId),
    adGroup: null,
    matchType: null,
    status: null,
    impressions: t.metrics.impressions,
    clicks: t.metrics.clicks,
    spendCents: t.metrics.spendCents,
    conversions: t.metrics.conversions,
    valueCents: t.metrics.conversionValueCents,
    tags: [],
  }));

  const qsFor = (t: TabKey) => {
    const qs = serializeFilters(filters);
    const parts = [t !== "keywords" ? `tab=${t}` : "", qs].filter(Boolean);
    return parts.length ? `/keywords?${parts.join("&")}` : "/keywords";
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="micro-label text-champagne">Google Ads</p>
        <h1 className="mt-1 font-display text-[26px] text-ink">
          Keywords & Search Terms
        </h1>
        <p className="mt-1 text-[13px] text-slate">
          {formatRangeLabel(current)} · Keywords are what you target; search
          terms are what guests actually typed. The Pass reports performance —
          it never edits your Google Ads account.
        </p>
      </div>

      <nav aria-label="Keyword views" className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={qsFor(t.key)}
            aria-current={tab === t.key ? "page" : undefined}
            className={clsx(
              "rounded-t-lg px-4 py-2.5 text-[13.5px] font-medium",
              tab === t.key
                ? "border-b-2 border-cobalt text-cobalt"
                : "text-slate hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "keywords" && (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
          <TermTable
            rows={keywordRows}
            variant="keywords"
            filename={csvFilename("keywords", current.start, current.end)}
          />
        </section>
      )}

      {tab === "terms" && (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
          <TermTable
            rows={termRows}
            variant="terms"
            filename={csvFilename("search-terms", current.start, current.end)}
          />
        </section>
      )}

      {tab === "pmax" && (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
          <SectionHeading title="Performance Max search insights" className="mb-1" />
          <p className="mb-4 max-w-2xl text-[12.5px] text-slate">
            Google provides category-level search insights for Performance Max
            campaigns. These are directional signals — not a keyword list, and
            not editable targeting.
          </p>
          {pmaxInsights.length === 0 ? (
            <EmptyState body="No Performance Max campaigns in the selected scope." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="ledger w-full min-w-[560px] text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-canvas/60">
                    <th className="px-3 py-2.5 text-left">Search category (insight)</th>
                    <th className="px-3 py-2.5 text-left">Campaign</th>
                    <th className="px-3 py-2.5 text-right">Impressions</th>
                    <th className="px-3 py-2.5 text-right">Clicks</th>
                    <th className="px-3 py-2.5 text-right">Conversions</th>
                  </tr>
                </thead>
                <tbody>
                  {pmaxInsights.map((i) => (
                    <tr key={i.id} className="border-b border-line/70 last:border-0">
                      <td className="px-3 py-2.5 font-medium text-ink">{i.category}</td>
                      <td className="max-w-64 truncate px-3 py-2.5 text-slate">
                        {campaignName(i.campaignId)}
                      </td>
                      <td className="px-3 py-2.5 text-right">{formatCount(i.impressions)}</td>
                      <td className="px-3 py-2.5 text-right">{formatCount(i.clicks)}</td>
                      <td className="px-3 py-2.5 text-right">{formatCount(i.conversions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "locations" && (
        <div className="space-y-5">
          {locations.map((loc) => {
            const locKeywords = keywordRows.filter((k) => k.location === loc.name);
            const tagGroups = new Map<string, TermRow[]>();
            for (const kw of locKeywords) {
              const seed = KEYWORD_SEEDS.find((s) => s.id === kw.id);
              for (const tag of seed?.tags ?? ["Untagged"]) {
                tagGroups.set(tag, [...(tagGroups.get(tag) ?? []), kw]);
              }
            }
            return (
              <section
                key={loc.id}
                className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]"
              >
                <SectionHeading title={loc.name} className="mb-1" />
                <p className="mb-4 text-[12.5px] text-slate">
                  {formatCount(locKeywords.length)} targeted keywords grouped by
                  internal tag. Tags and notes live in The Pass and never change
                  the ad account.
                </p>
                {locKeywords.length === 0 ? (
                  <EmptyState body="No Search keywords are mapped to this location in the current scope." />
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[...tagGroups.entries()].map(([tag, rows]) => (
                      <div key={tag} className="rounded-xl border border-line p-3.5">
                        <Badge tone="champagne">{tag}</Badge>
                        <ul className="mt-2.5 space-y-1.5">
                          {rows.map((kw) => (
                            <li key={kw.id} className="flex items-baseline justify-between gap-2 text-[13px]">
                              <span className="font-medium text-ink">{kw.text}</span>
                              <span className="tnum shrink-0 text-slate">
                                {formatCount(kw.conversions)} conv.
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
