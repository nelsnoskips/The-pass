import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scheduledRuns } from "@/lib/agent-runtime/schedule";
import { safeEqual } from "@/lib/studio/session";

/**
 * Which agents the scheduler should run, per restaurant. An agent is
 * only listed when it has something to look at, so a quiet restaurant
 * doesn't pay for a model call that ends in "nothing to do", and never
 * when the restaurant has switched it off (lib/agent-runtime/schedule.ts).
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.AGENT_CRON_SECRET?.trim();
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(given, secret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ orgs: [], runs: [] });
  return NextResponse.json(await scheduledRuns(sql));
}
