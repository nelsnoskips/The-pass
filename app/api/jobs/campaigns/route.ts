import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runDueCampaigns } from "@/lib/marketing/campaigns";
import { siteUrl } from "@/lib/site";
import { safeEqual } from "@/lib/studio/session";

/**
 * Hourly: send scheduled campaigns that are due, each exactly once.
 * Texts outside texting hours wait for the next run.
 *   POST /api/jobs/campaigns   Authorization: Bearer $AGENT_CRON_SECRET
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const secret = process.env.AGENT_CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Jobs are not configured." }, { status: 503 });
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!safeEqual(given, secret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ error: "No database configured." }, { status: 503 });
  const ran = await runDueCampaigns(sql, { baseUrl: siteUrl(req) });
  return NextResponse.json({ campaigns: ran.length, results: ran });
}
