import { addDays } from "../dates";

/**
 * Deterministic daily-fact generation for the demo data source.
 *
 * The blueprint fixes exact Last-30-Days totals per campaign. We distribute
 * each total across the 30-day window ending yesterday using a seeded PRNG
 * and largest-remainder rounding, so:
 *
 *  - the daily rows sum *exactly* to the specified totals, and
 *  - the same anchor date always produces the same rows (idempotent sync).
 *
 * Three earlier 30-day blocks are generated at slightly lower scale so
 * comparison periods and long ranges have realistic history.
 */

/** mulberry32 — small deterministic PRNG. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Daily weights for one 30-day block: a gentle weekly rhythm (restaurants
 * peak Thursday–Saturday) plus seeded jitter. Deterministic per entity+block.
 */
export function blockWeights(entityId: string, block: number, days: number): number[] {
  const rand = prng(hashString(`${entityId}:${block}`));
  const weights: number[] = [];
  for (let i = 0; i < days; i++) {
    const dow = i % 7;
    const weekly = dow === 3 || dow === 4 ? 1.35 : dow === 5 ? 1.5 : dow === 6 ? 1.2 : 1;
    weights.push(weekly * (0.75 + rand() * 0.5));
  }
  return weights;
}

/**
 * Distribute an integer total across weights with largest-remainder rounding.
 * The result always sums exactly to `total`.
 */
export function distributeInteger(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total === 0 || sum === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const floored = raw.map(Math.floor);
  let remainder = total - floored.reduce((a, b) => a + b, 0);
  const order = raw
    .map((value, i) => ({ frac: value - Math.floor(value), i }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    floored[order[k].i] += 1;
  }
  return floored;
}

export interface BlockTotals {
  spendCents: number;
  impressions: number;
  clicks: number;
  reach: number | null;
  conversions: number;
  conversionValueCents: number;
}

export interface GeneratedDay extends BlockTotals {
  date: string;
}

export const BLOCK_DAYS = 30;
export const HISTORY_BLOCKS = 4; // 120 days of history
/** Scale factors for older blocks (block 0 = most recent, exact totals). */
const BLOCK_SCALE = [1, 0.93, 0.88, 0.82];

/**
 * Generate daily facts for the trailing `HISTORY_BLOCKS × 30` days ending at
 * `anchorEnd` (inclusive). Block 0 (the most recent 30 days) sums exactly to
 * `latestTotals`; older blocks are scaled copies.
 */
export function generateDailyFacts(
  entityId: string,
  latestTotals: BlockTotals,
  anchorEnd: string,
): GeneratedDay[] {
  const out: GeneratedDay[] = [];
  for (let block = 0; block < HISTORY_BLOCKS; block++) {
    const scale = BLOCK_SCALE[block];
    const blockEnd = addDays(anchorEnd, -block * BLOCK_DAYS);
    const blockStart = addDays(blockEnd, -(BLOCK_DAYS - 1));
    const weights = blockWeights(entityId, block, BLOCK_DAYS);
    const scaled: BlockTotals = {
      spendCents: Math.round(latestTotals.spendCents * scale),
      impressions: Math.round(latestTotals.impressions * scale),
      clicks: Math.round(latestTotals.clicks * scale),
      reach:
        latestTotals.reach === null
          ? null
          : Math.round(latestTotals.reach * scale),
      conversions: Math.round(latestTotals.conversions * scale),
      conversionValueCents: Math.round(latestTotals.conversionValueCents * scale),
    };
    const spend = distributeInteger(scaled.spendCents, weights);
    const impressions = distributeInteger(scaled.impressions, weights);
    const clicks = distributeInteger(scaled.clicks, weights);
    const reach =
      scaled.reach === null ? null : distributeInteger(scaled.reach, weights);
    const conversions = distributeInteger(scaled.conversions, weights);
    const value = distributeInteger(scaled.conversionValueCents, weights);
    for (let i = 0; i < BLOCK_DAYS; i++) {
      out.push({
        date: addDays(blockStart, i),
        spendCents: spend[i],
        impressions: impressions[i],
        clicks: clicks[i],
        reach: reach === null ? null : reach[i],
        conversions: conversions[i],
        conversionValueCents: value[i],
      });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}
