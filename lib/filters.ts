import {
  type ComparisonMode,
  type DateRange,
  type DateRangePreset,
  comparisonRange,
  resolvePreset,
} from "./dates";
import type { Platform } from "./types";

/**
 * Global filter state, serialized in the URL so filters persist across
 * reporting pages and can be shared/bookmarked.
 */

export type PlatformFilter = "all" | Platform;
export type GoogleRefine = "all" | "search" | "performance_max";

export interface FilterState {
  /** null = All Locations. */
  locationIds: string[] | null;
  platform: PlatformFilter;
  googleRefine: GoogleRefine;
  preset: DateRangePreset;
  custom?: DateRange;
  compare: ComparisonMode;
}

export const DEFAULT_FILTERS: FilterState = {
  locationIds: null,
  platform: "all",
  googleRefine: "all",
  preset: "last_30",
  compare: "previous_period",
};

export type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

const PRESETS: DateRangePreset[] = [
  "today", "yesterday", "last_7", "last_30", "this_month",
  "last_month", "this_quarter", "this_year", "custom",
];

export function parseFilters(params: SearchParams): FilterState {
  const loc = first(params.loc);
  const platform = first(params.platform);
  const refine = first(params.refine);
  const preset = first(params.range);
  const compare = first(params.compare);
  const start = first(params.start);
  const end = first(params.end);

  const state: FilterState = { ...DEFAULT_FILTERS };
  if (loc && loc !== "all") state.locationIds = loc.split(",").filter(Boolean);
  if (platform === "google" || platform === "meta") state.platform = platform;
  if (refine === "search" || refine === "performance_max") state.googleRefine = refine;
  if (preset && PRESETS.includes(preset as DateRangePreset)) {
    state.preset = preset as DateRangePreset;
  }
  if (state.preset === "custom" && start && end && start <= end) {
    state.custom = { start, end };
  } else if (state.preset === "custom") {
    state.preset = "last_30";
  }
  if (compare === "previous_year" || compare === "none") state.compare = compare;
  return state;
}

export function serializeFilters(state: FilterState): string {
  const params = new URLSearchParams();
  if (state.locationIds && state.locationIds.length > 0) {
    params.set("loc", state.locationIds.join(","));
  }
  if (state.platform !== "all") params.set("platform", state.platform);
  if (state.googleRefine !== "all") params.set("refine", state.googleRefine);
  if (state.preset !== "last_30") params.set("range", state.preset);
  if (state.preset === "custom" && state.custom) {
    params.set("start", state.custom.start);
    params.set("end", state.custom.end);
  }
  if (state.compare !== "previous_period") params.set("compare", state.compare);
  return params.toString();
}

export interface ResolvedRanges {
  current: DateRange;
  comparison: DateRange | null;
}

export function resolveRanges(state: FilterState, today: string): ResolvedRanges {
  const current = resolvePreset(state.preset, today, state.custom);
  return {
    current,
    comparison: comparisonRange(current, state.compare, state.preset),
  };
}
