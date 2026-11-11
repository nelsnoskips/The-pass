import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeEqual } from "@/lib/studio/session";

/** Which restaurants the scheduler should run agents for: any with a site. */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.AGENT_CRON_SECRET?.trim();
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(given, secret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ orgs: [] });
  const rows = await sql<{ slug: string }[]>`
    select distinct o.slug from orgs o join sites s on s.org_id = o.id order by o.slug`;
  return NextResponse.json({ orgs: rows.map((r) => r.slug) });
}
