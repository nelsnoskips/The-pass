"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverItem } from "@/components/ui/Popover";
import {
  parseFilters,
  serializeFilters,
  type FilterState,
} from "@/lib/filters";
import {
  COMPARISON_LABELS,
  PRESET_LABELS,
  type ComparisonMode,
  type DateRangePreset,
} from "@/lib/dates";
import type { Location } from "@/lib/types";

/**
 * Global filter bar. State lives entirely in the URL, so every reporting
 * page — and every export — reads the same scope, and filters persist as the
 * user moves between pages (nav links carry the query string forward).
 */
export function FilterBar({ locations }: { locations: Location[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseFilters(Object.fromEntries(searchParams.entries()));

  const apply = useCallback(
    (next: FilterState) => {
      const qs = serializeFilters(next);
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const locationLabel =
    filters.locationIds === null
      ? "All Locations"
      : filters.locationIds.length === 1
        ? (locations.find((l) => l.id === filters.locationIds![0])?.name ??
          "1 location")
        : `${filters.locationIds.length} locations`;

  const platformLabel =
    filters.platform === "all"
      ? "All Platforms"
      : filters.platform === "google"
        ? filters.googleRefine === "search"
          ? "Google · Search"
          : filters.googleRefine === "performance_max"
            ? "Google · PMax"
            : "Google Ads"
        : "Meta Ads";

  const toggleLocation = (id: string) => {
    const current = filters.locationIds ?? [];
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    apply({
      ...filters,
      locationIds:
        next.length === 0 || next.length === locations.length ? null : next,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Report filters">
      <Popover
        trigger={
          <>
            <span>{locationLabel}</span>
            <ChevronDown size={14} aria-hidden />
          </>
        }
      >
        {(close) => (
          <>
            <PopoverItem
              selected={filters.locationIds === null}
              onClick={() => {
                apply({ ...filters, locationIds: null });
                close();
              }}
            >
              <span>All Locations</span>
              {filters.locationIds === null && <Check size={14} aria-hidden />}
            </PopoverItem>
            <div className="my-1 border-t border-line" />
            {locations.map((loc) => {
              const selected = filters.locationIds?.includes(loc.id) ?? false;
              return (
                <PopoverItem
                  key={loc.id}
                  selected={selected}
                  onClick={() => toggleLocation(loc.id)}
                >
                  <span>{loc.name}</span>
                  {selected && <Check size={14} aria-hidden />}
                </PopoverItem>
              );
            })}
          </>
        )}
      </Popover>

      <Popover
        trigger={
          <>
            <span>{platformLabel}</span>
            <ChevronDown size={14} aria-hidden />
          </>
        }
      >
        {(close) => (
          <>
            {(
              [
                ["all", "All Platforms"],
                ["google", "Google Ads"],
                ["meta", "Meta Ads"],
              ] as const
            ).map(([value, label]) => (
              <PopoverItem
                key={value}
                selected={filters.platform === value}
                onClick={() => {
                  apply({ ...filters, platform: value, googleRefine: "all" });
                  close();
                }}
              >
                <span>{label}</span>
                {filters.platform === value && <Check size={14} aria-hidden />}
              </PopoverItem>
            ))}
            {filters.platform === "google" && (
              <>
                <div className="my-1 border-t border-line" />
                <p className="micro-label px-3 py-1 text-slate">Refine Google</p>
                {(
                  [
                    ["all", "All Google campaigns"],
                    ["search", "Search"],
                    ["performance_max", "Performance Max"],
                  ] as const
                ).map(([value, label]) => (
                  <PopoverItem
                    key={value}
                    selected={filters.googleRefine === value}
                    onClick={() => {
                      apply({ ...filters, googleRefine: value });
                      close();
                    }}
                  >
                    <span>{label}</span>
                    {filters.googleRefine === value && (
                      <Check size={14} aria-hidden />
                    )}
                  </PopoverItem>
                ))}
              </>
            )}
          </>
        )}
      </Popover>

      <Popover
        trigger={
          <>
            <span>{PRESET_LABELS[filters.preset]}</span>
            <ChevronDown size={14} aria-hidden />
          </>
        }
      >
        {(close) => (
          <>
            {(Object.keys(PRESET_LABELS) as DateRangePreset[])
              .filter((p) => p !== "custom")
              .map((preset) => (
                <PopoverItem
                  key={preset}
                  selected={filters.preset === preset}
                  onClick={() => {
                    apply({ ...filters, preset, custom: undefined });
                    close();
                  }}
                >
                  <span>{PRESET_LABELS[preset]}</span>
                  {filters.preset === preset && <Check size={14} aria-hidden />}
                </PopoverItem>
              ))}
            <div className="my-1 border-t border-line" />
            <form
              className="space-y-2 px-3 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const start = String(data.get("start") ?? "");
                const end = String(data.get("end") ?? "");
                if (start && end && start <= end) {
                  apply({ ...filters, preset: "custom", custom: { start, end } });
                  close();
                }
              }}
            >
              <p className="micro-label text-slate">Custom range</p>
              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="filter-start">Start date</label>
                <input
                  id="filter-start"
                  name="start"
                  type="date"
                  defaultValue={filters.custom?.start}
                  className="w-full rounded-md border border-line px-2 py-1 text-xs"
                />
                <label className="sr-only" htmlFor="filter-end">End date</label>
                <input
                  id="filter-end"
                  name="end"
                  type="date"
                  defaultValue={filters.custom?.end}
                  className="w-full rounded-md border border-line px-2 py-1 text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-cobalt px-2 py-1.5 text-xs font-medium text-white hover:bg-cobalt/90"
              >
                Apply custom range
              </button>
            </form>
          </>
        )}
      </Popover>

      <Popover
        trigger={
          <>
            <span className="text-slate">vs.</span>
            <span>{COMPARISON_LABELS[filters.compare]}</span>
            <ChevronDown size={14} aria-hidden />
          </>
        }
      >
        {(close) => (
          <>
            {(Object.keys(COMPARISON_LABELS) as ComparisonMode[]).map((mode) => (
              <PopoverItem
                key={mode}
                selected={filters.compare === mode}
                onClick={() => {
                  apply({ ...filters, compare: mode });
                  close();
                }}
              >
                <span>{COMPARISON_LABELS[mode]}</span>
                {filters.compare === mode && <Check size={14} aria-hidden />}
              </PopoverItem>
            ))}
          </>
        )}
      </Popover>
    </div>
  );
}
