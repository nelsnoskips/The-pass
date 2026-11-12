import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendDueBriefs } from "@/lib/brief/send";
import { siteUrl } from "@/lib/site";
import { safeEqual } from "@/lib/studio/session";

/**
 * Hourly: send the morning pass to each restaurant whose local send time
 * has come, once a day.
 *   POST /api/jobs/brief   Authorization: Bearer $AGENT_CRON_SECRET
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.AGENT_CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Jobs are not configured." }, { status: 503 });
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!safeEqual(given, secret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ error: "No database configured." }, { status: 503 });
  return NextResponse.json(await sendDueBriefs(sql, siteUrl(req)));
}
