"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Search, Tag } from "lucide-react";
import clsx from "clsx";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import {
  formatCents,
  formatCount,
  formatPercent,
} from "@/lib/format";

export interface TermRow {
  id: string;
  text: string;
  location: string;
  campaign: string;
  adGroup: string | null;
  matchType: string | null;
  status: string | null;
  impressions: number;
  clicks: number;
  spendCents: number;
  conversions: number;
  valueCents: number;
  tags: string[];
}

type SortKey = "impressions" | "clicks" | "spendCents" | "conversions" | "valueCents" | "ctr" | "cpc" | "costPerConv";

function metric(row: TermRow, key: SortKey): number | null {
  switch (key) {
    case "ctr":
      return row.impressions > 0 ? (row.clicks / row.impressions) * 100 : null;
    case "cpc":
      return row.clicks > 0 ? row.spendCents / row.clicks : null;
    case "costPerConv":
      return row.conversions > 0 ? row.spendCents / row.conversions : null;
    default:
      return row[key];
  }
}

/**
 * Keyword / search-term ledger with search, sort, CSV export, and
 * multi-select internal tagging. Tags live in The Pass only — nothing is
 * ever written back to the Google Ads account.
 */
export function TermTable({
  rows,
  variant,
  filename,
}: {
  rows: TermRow[];
  variant: "keywords" | "terms";
  filename: string;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("spendCents");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<string[]>([]);
  const [localTags, setLocalTags] = useState<Record<string, string[]>>({});

  const withTags = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        tags: [...r.tags, ...(localTags[r.id] ?? [])],
      })),
    [rows, localTags],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? withTags.filter(
          (r) =>
            r.text.toLowerCase().includes(q) ||
            r.tags.some((t) => t.toLowerCase().includes(q)),
        )
      : withTags;
    return [...matched].sort((a, b) => {
      const va = metric(a, sortKey);
      const vb = metric(b, sortKey);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [withTags, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const applyTag = () => {
    const tag = window.prompt(
      "Tag selected rows (internal to The Pass; never written to Google Ads):",
    );
    if (!tag) return;
    setLocalTags((prev) => {
      const next = { ...prev };
      for (const id of selected) {
        next[id] = [...new Set([...(next[id] ?? []), tag])];
      }
      return next;
    });
    setSelected([]);
  };

  const csvHeaders = [
    variant === "keywords" ? "Keyword" : "Search Term",
    "Location", "Campaign", "Ad Group", "Match Type", "Status", "Impressions",
    "Clicks", "CTR %", "Avg CPC", "Spend", "Conversions", "Conv Rate %",
    "Cost per Conversion", "Conversion Value", "Tags",
  ];
  const csvRows = filtered.map((r) => {
    const ctr = metric(r, "ctr");
    const cpc = metric(r, "cpc");
    const cpa = metric(r, "costPerConv");
    return [
      r.text, r.location, r.campaign, r.adGroup, r.matchType, r.status,
      r.impressions, r.clicks, ctr === null ? null : ctr.toFixed(2),
      cpc === null ? null : (cpc / 100).toFixed(2),
      (r.spendCents / 100).toFixed(2), r.conversions,
      r.clicks > 0 ? ((r.conversions / r.clicks) * 100).toFixed(2) : null,
      cpa === null ? null : (cpa / 100).toFixed(2),
      (r.valueCents / 100).toFixed(2),
      r.tags.join("; "),
    ];
  });

  const numericHeaders: { key: SortKey; label: string }[] = [
    { key: "impressions", label: "Impr." },
    { key: "clicks", label: "Clicks" },
    { key: "ctr", label: "CTR" },
    { key: "cpc", label: "Avg CPC" },
    { key: "spendCents", label: "Spend" },
    { key: "conversions", label: "Conv." },
    { key: "costPerConv", label: "Cost/Conv." },
    { key: "valueCents", label: "Conv. Value" },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative flex-1 sm:max-w-64">
          <Search size={14} aria-hidden className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate" />
          <span className="sr-only">Search {variant}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={variant === "keywords" ? "Search keywords or tags…" : "Search terms…"}
            className="w-full rounded-lg border border-line bg-surface py-1.5 pl-8 pr-3 text-[13px]"
          />
        </label>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={applyTag}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[13px] font-medium text-white"
          >
            <Tag size={13} aria-hidden />
            Tag {selected.length} selected
          </button>
        )}
        <div className="ml-auto">
          <ExportCsvButton headers={csvHeaders} rows={csvRows} filename={filename} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          body={
            query
              ? `Nothing matches “${query}”.`
              : "No rows in the selected scope and period."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="ledger w-full min-w-[1050px] text-[13px]">
            <thead>
              <tr className="border-b border-line bg-canvas/60">
                <th className="w-8 px-3 py-2.5">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-3 py-2.5 text-left">
                  {variant === "keywords" ? "Keyword" : "Search term"}
                </th>
                <th className="px-3 py-2.5 text-left">Location</th>
                <th className="px-3 py-2.5 text-left">Campaign</th>
                {variant === "keywords" && (
                  <>
                    <th className="px-3 py-2.5 text-left">Ad group</th>
                    <th className="px-3 py-2.5 text-left">Match</th>
                    <th className="px-3 py-2.5 text-left">Status</th>
                  </>
                )}
                {numericHeaders.map((h) => (
                  <th key={h.key} className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort(h.key)}
                      aria-label={`Sort by ${h.label}`}
                      className={clsx(
                        "inline-flex items-center gap-1 hover:text-ink",
                        sortKey === h.key && "text-cobalt",
                      )}
                    >
                      {h.label}
                      <ArrowUpDown size={11} aria-hidden />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const ctr = metric(row, "ctr");
                const cpc = metric(row, "cpc");
                const cpa = metric(row, "costPerConv");
                return (
                  <tr key={row.id} className="border-b border-line/70 last:border-0 hover:bg-cobalt-soft/30">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.text}`}
                        checked={selected.includes(row.id)}
                        onChange={() =>
                          setSelected((s) =>
                            s.includes(row.id)
                              ? s.filter((x) => x !== row.id)
                              : [...s, row.id],
                          )
                        }
                        className="accent-[var(--cobalt)]"
                      />
                    </td>
                    <td className="max-w-72 px-3 py-2.5">
                      <span className="font-medium text-ink">{row.text}</span>
                      {row.tags.length > 0 && (
                        <span className="mt-0.5 flex flex-wrap gap-1">
                          {row.tags.map((t) => (
                            <Badge key={t} tone="champagne">{t}</Badge>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate">{row.location}</td>
                    <td className="max-w-52 truncate px-3 py-2.5 text-slate" title={row.campaign}>
                      {row.campaign}
                    </td>
                    {variant === "keywords" && (
                      <>
                        <td className="px-3 py-2.5 text-slate">{row.adGroup}</td>
                        <td className="px-3 py-2.5 capitalize text-slate">{row.matchType}</td>
                        <td className="px-3 py-2.5">
                          <Badge tone={row.status === "enabled" ? "emerald" : "warning"}>
                            {row.status}
                          </Badge>
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2.5 text-right">{formatCount(row.impressions)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCount(row.clicks)}</td>
                    <td className="px-3 py-2.5 text-right">{formatPercent(ctr)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCents(cpc)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCents(row.spendCents)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCount(row.conversions)}</td>
                    <td className="px-3 py-2.5 text-right">{formatCents(cpa)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {row.valueCents > 0 ? formatCents(row.valueCents) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
