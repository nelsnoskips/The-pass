"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Columns3, Search } from "lucide-react";
import clsx from "clsx";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Popover } from "@/components/ui/Popover";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  EM_DASH,
  formatCents,
  formatCount,
  formatMultiple,
  formatPercent,
} from "@/lib/format";

export interface CampaignTableRow {
  id: string;
  name: string;
  status: string;
  location: string | null;
  platform: string;
  type: string;
  spendCents: number;
  impressions: number;
  clicks: number;
  reach: number | null;
  ctr: number | null;
  conversions: number;
  costPerConversionCents: number | null;
  conversionRate: number | null;
  revenueCents: number;
  roas: number | null;
}

type ColumnKey =
  | "status" | "location" | "platform" | "type" | "spendCents" | "impressions"
  | "clicks" | "reach" | "ctr" | "conversions" | "costPerConversionCents"
  | "conversionRate" | "revenueCents" | "roas";

const COLUMNS: {
  key: ColumnKey;
  label: string;
  numeric: boolean;
  render: (r: CampaignTableRow) => string;
}[] = [
  { key: "status", label: "Status", numeric: false, render: (r) => r.status },
  { key: "location", label: "Location", numeric: false, render: (r) => r.location ?? "Unassigned" },
  { key: "platform", label: "Platform", numeric: false, render: (r) => r.platform },
  { key: "type", label: "Campaign Type", numeric: false, render: (r) => r.type },
  { key: "spendCents", label: "Amount Spent", numeric: true, render: (r) => formatCents(r.spendCents) },
  { key: "impressions", label: "Ad Views", numeric: true, render: (r) => formatCount(r.impressions) },
  { key: "clicks", label: "Ad Clicks", numeric: true, render: (r) => formatCount(r.clicks) },
  { key: "reach", label: "Ad Reach", numeric: true, render: (r) => formatCount(r.reach) },
  { key: "ctr", label: "CTR", numeric: true, render: (r) => formatPercent(r.ctr) },
  { key: "conversions", label: "Conversions", numeric: true, render: (r) => formatCount(r.conversions) },
  { key: "costPerConversionCents", label: "Cost / Conv.", numeric: true, render: (r) => formatCents(r.costPerConversionCents) },
  { key: "conversionRate", label: "Conv. Rate", numeric: true, render: (r) => formatPercent(r.conversionRate) },
  { key: "revenueCents", label: "Marketing Revenue", numeric: true, render: (r) => formatCents(r.revenueCents) },
  { key: "roas", label: "ROAS", numeric: true, render: (r) => formatMultiple(r.roas) },
];

const PAGE_SIZE = 25;

export function CampaignTable({ rows }: { rows: CampaignTableRow[] }) {
  const router = useRouter();
  const search = useSearchParams().toString();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<ColumnKey>("spendCents");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [hidden, setHidden] = useState<ColumnKey[]>(["reach", "conversionRate"]);
  const [page, setPage] = useState(0);

  const visibleColumns = COLUMNS.filter((c) => !hidden.includes(c.key));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? rows.filter((r) => r.name.toLowerCase().includes(q))
      : rows;
    const sorted = [...matched].sort((x, y) => {
      const a = x[sortKey];
      const b = y[sortKey];
      let cmp: number;
      if (typeof a === "number" || typeof b === "number" || a === null || b === null) {
        // Missing metrics always sort last regardless of direction.
        if (a === null && b === null) cmp = 0;
        else if (a === null) return 1;
        else if (b === null) return -1;
        else cmp = (a as number) - (b as number);
      } else {
        cmp = String(a).localeCompare(String(b));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, query, sortKey, sortDir]);

  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);

  const toggleSort = (key: ColumnKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  const openDetail = (id: string) =>
    router.push(search ? `/campaigns/${id}?${search}` : `/campaigns/${id}`);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="relative flex-1 sm:max-w-64">
          <Search size={14} aria-hidden className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate" />
          <span className="sr-only">Search campaigns by name</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search campaigns…"
            className="w-full rounded-lg border border-line bg-surface py-1.5 pl-8 pr-3 text-[13px]"
          />
        </label>
        <Popover
          align="end"
          trigger={
            <>
              <Columns3 size={14} aria-hidden />
              <span>Columns</span>
            </>
          }
          panelClassName="w-56 max-h-80 overflow-y-auto"
        >
          {COLUMNS.map((col) => (
            <label
              key={col.key}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] hover:bg-canvas"
            >
              <input
                type="checkbox"
                checked={!hidden.includes(col.key)}
                onChange={() =>
                  setHidden((h) =>
                    h.includes(col.key)
                      ? h.filter((k) => k !== col.key)
                      : [...h, col.key],
                  )
                }
                className="accent-[var(--cobalt)]"
              />
              {col.label}
            </label>
          ))}
        </Popover>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          kind="no_activity"
          body={
            query
              ? `No campaigns match “${query}” in the current scope.`
              : "No campaigns in the selected scope and period."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="ledger w-full min-w-[900px] border-collapse text-[13px]">
            <caption className="sr-only">
              Campaign performance for the selected filters
            </caption>
            <thead>
              <tr className="border-b border-line bg-canvas/60">
                <th className="sticky left-0 z-10 bg-[#faf7f0] px-4 py-2.5 text-left">
                  Campaign Name
                </th>
                {visibleColumns.map((col) => (
                  <th key={col.key} className={clsx("px-3 py-2.5", col.numeric ? "text-right" : "text-left")}>
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={clsx(
                        "inline-flex items-center gap-1 hover:text-ink",
                        sortKey === col.key && "text-cobalt",
                      )}
                      aria-label={`Sort by ${col.label}`}
                    >
                      {col.label}
                      <ArrowUpDown size={11} aria-hidden />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => openDetail(row.id)}
                  className="cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-cobalt-soft/40"
                >
                  <td className="sticky left-0 z-10 max-w-64 bg-surface px-4 py-2.5 font-medium text-ink">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(row.id);
                      }}
                      className="block max-w-full truncate text-left hover:text-cobalt"
                      title={row.name}
                    >
                      {row.name}
                    </button>
                  </td>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className={clsx("px-3 py-2.5", col.numeric ? "text-right" : "text-left")}>
                      {col.key === "status" ? (
                        <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                      ) : (
                        <span className={col.render(row) === EM_DASH ? "text-slate/60" : undefined}>
                          {col.render(row)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-between text-[13px] text-slate">
          <span className="tnum">
            Page {page + 1} of {pageCount} · {filtered.length} campaigns
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-line px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-line px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
