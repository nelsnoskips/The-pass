import { db } from "../db";

/**
 * Who a campaign can reach. Plain server code, deliberately not a server
 * action: it takes an org id, so it must only ever be called after the
 * caller's tenant has been resolved.
 */
export type Audience = "lapsed" | "regulars" | "everyone";

export async function audienceIds(orgId: string, audience: Audience): Promise<string[]> {
  const sql = db()!;
  const rows = await sql<{ id: string }[]>`
    select id from guests
    where org_id = ${orgId} and phone like '+%' and sms_consent_at is not null and sms_opted_out_at is null
      ${audience === "lapsed" ? sql`and visit_count >= 2 and last_visit_at < now() - interval '45 days'` : sql``}
      ${audience === "regulars" ? sql`and visit_count >= 3` : sql``}
    order by visit_count desc limit 200`;
  return rows.map((r) => r.id);
}

