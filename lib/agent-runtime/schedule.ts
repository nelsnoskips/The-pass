import type { Sql } from "postgres";
import { resolveGoals } from "./settings";

/**
 * Which agents the scheduler should run, per restaurant. An agent is
 * only listed when it has something to look at, so a quiet restaurant
 * doesn't pay for a model call that ends in "nothing to do" — and never
 * when the restaurant has switched it off.
 */
export async function scheduledRuns(sql: Sql): Promise<{ orgs: string[]; runs: { org: string; agent: string }[] }> {
  const rows = await sql<{ id: string; slug: string; has_site: boolean; reviews_waiting_best: number | null; reviews_waiting: boolean; ads_due: boolean }[]>`
    select o.id, o.slug,
      -- Ads: weekly, once there's a week of spend to read. Daily numbers
      -- are too noisy to move budget on.
      (exists (select 1 from ad_daily d where d.org_id = o.id and d.date > current_date - 8 and d.spend_cents > 0)
       and not exists (select 1 from agent_runs a where a.org_id = o.id and a.agent_id = 'paid_ads'
                       and a.started_at > now() - interval '6 days')) as ads_due,
      exists (select 1 from sites s where s.org_id = o.id) as has_site,
      w.any_waiting as reviews_waiting, w.best as reviews_waiting_best
    from orgs o
    cross join lateral (
      select count(*) > 0 as any_waiting, max(r.rating)::int as best from reviews r
      where r.org_id = o.id and r.reply is null
        and not exists (select 1 from agent_proposals p where p.org_id = o.id and p.status = 'pending'
                        and p.tool = 'post_review_reply' and p.input->>'review_id' = r.id::text)) w
    order by o.slug`;
  const settings = await sql<{ org_id: string; agent_id: string; enabled: boolean; goals: Record<string, unknown> }[]>`
    select org_id, agent_id, enabled, goals from agent_settings`;
  const key = (org: string, agent: string) => `${org}/${agent}`;
  const byKey = new Map(settings.map((s) => [key(s.org_id, s.agent_id), s]));
  const on = (org: string, agent: string) => byKey.get(key(org, agent))?.enabled ?? true;
  const goals = (org: string, agent: string) => resolveGoals(agent, byKey.get(key(org, agent))?.goals);

  const runs = rows.flatMap((r) => {
    const out: { org: string; agent: string }[] = [];
    if (r.has_site && on(r.id, "reservations")) out.push({ org: r.slug, agent: "reservations" });
    // Only when a waiting review is one the owner wants drafted.
    const minStars = Number(goals(r.id, "reviews").min_stars);
    if (r.reviews_waiting && on(r.id, "reviews") && (minStars <= 1 || (r.reviews_waiting_best ?? 0) >= minStars)) {
      out.push({ org: r.slug, agent: "reviews" });
    }
    if (r.ads_due && on(r.id, "paid_ads") && goals(r.id, "paid_ads").weekly_run) out.push({ org: r.slug, agent: "paid_ads" });
    return out;
  });
  // `orgs` kept for older schedulers: those whose Reservations Agent runs.
  return { orgs: runs.filter((x) => x.agent === "reservations").map((x) => x.org), runs };
}
