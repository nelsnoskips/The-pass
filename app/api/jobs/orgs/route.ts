import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeEqual } from "@/lib/studio/session";

/**
 * Which agents the scheduler should run, per restaurant. An agent is
 * only listed when it has something to look at, so a quiet restaurant
 * doesn't pay for a model call that ends in "nothing to do".
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.AGENT_CRON_SECRET?.trim();
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || !safeEqual(given, secret)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ orgs: [], runs: [] });
  const rows = await sql<{ slug: string; has_site: boolean; reviews_waiting: boolean; ads_due: boolean }[]>`
    select o.slug,
      -- Ads: weekly, once there's a week of spend to read. Daily numbers
      -- are too noisy to move budget on.
      (exists (select 1 from ad_daily d where d.org_id = o.id and d.date > current_date - 8 and d.spend_cents > 0)
       and not exists (select 1 from agent_runs a where a.org_id = o.id and a.agent_id = 'paid_ads'
                       and a.started_at > now() - interval '6 days')) as ads_due,
      exists (select 1 from sites s where s.org_id = o.id) as has_site,
      exists (select 1 from reviews r where r.org_id = o.id and r.reply is null
              and not exists (select 1 from agent_proposals p where p.org_id = o.id and p.status = 'pending'
                              and p.tool = 'post_review_reply' and p.input->>'review_id' = r.id::text)) as reviews_waiting
    from orgs o order by o.slug`;
  const runs = rows.flatMap((r) => [
    ...(r.has_site ? [{ org: r.slug, agent: "reservations" }] : []),
    ...(r.reviews_waiting ? [{ org: r.slug, agent: "reviews" }] : []),
    ...(r.ads_due ? [{ org: r.slug, agent: "paid_ads" }] : []),
  ]);
  // `orgs` kept for older schedulers.
  return NextResponse.json({ orgs: rows.filter((r) => r.has_site).map((r) => r.slug), runs });
}
