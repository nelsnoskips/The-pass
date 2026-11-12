import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncToast } from "@/lib/integrations/toast";
import { safeEqual } from "@/lib/studio/session";

/**
 * Hourly: closed checks and 86'd dishes from every connected Toast
 * location. One restaurant failing doesn't stop the rest; each run is
 * recorded in toast_syncs and a failure is flagged on the connection.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const secret = process.env.AGENT_CRON_SECRET?.trim();
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(given, secret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ error: "No database." }, { status: 503 });
  const rows = await sql<{ org_id: string }[]>`
    select org_id from org_integrations where provider = 'toast' and status = 'connected' and secret is not null`;
  const results = [];
  for (const r of rows) results.push({ org: r.org_id, provider: "toast", ...(await syncToast(sql, r.org_id)) });
  return NextResponse.json({ results });
}
