import { NextResponse } from "next/server";
import { syncGoogleAds } from "@/lib/ads/google-ads";
import { syncMeta } from "@/lib/ads/meta";
import { db } from "@/lib/db";
import { safeEqual } from "@/lib/studio/session";

/**
 * Nightly: re-read the last 30 days for every connected ad account, so
 * late conversions are counted. One restaurant failing doesn't stop the
 * rest; each result is recorded in ad_syncs.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const secret = process.env.AGENT_CRON_SECRET?.trim();
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(given, secret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ error: "No database." }, { status: 503 });
  const rows = await sql<{ org_id: string; provider: string }[]>`
    select org_id, provider from org_integrations where provider in ('google_ads', 'meta_ads') and status = 'connected'`;
  const results = [];
  for (const r of rows) {
    const out = r.provider === "google_ads" ? await syncGoogleAds(sql, r.org_id) : await syncMeta(sql, r.org_id);
    results.push({ org: r.org_id, provider: r.provider, ...out });
  }
  return NextResponse.json({ results });
}
