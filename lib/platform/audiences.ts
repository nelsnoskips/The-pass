import type { Sql } from "postgres";
import { db } from "../db";

/**
 * Who a campaign can reach. Plain server code, deliberately not a server
 * action: it takes an org id, so it must only ever be called after the
 * caller's tenant has been resolved.
 */
export type Audience = "lapsed" | "regulars" | "everyone";

/**
 * Marketing consent on a guest row aliased `g`: a recorded yes for that
 * channel, not withdrawn, and somewhere to send it. The once-a-week cap
 * is applied again at the moment of sending (lib/messaging).
 */
export function consentFilter(sql: Sql, channel: "sms" | "email") {
  return channel === "sms"
    ? sql`g.phone like '+%' and g.sms_consent_at is not null and g.sms_opted_out_at is null`
    : sql`g.email is not null and g.email_consent_at is not null and g.email_opted_out_at is null`;
}

export async function audienceIds(orgId: string, audience: Audience, channel: "sms" | "email" = "sms"): Promise<string[]> {
  const sql = db()!;
  const rows = await sql<{ id: string }[]>`
    select g.id from guests g
    where g.org_id = ${orgId}
      and ${consentFilter(sql, channel)}
      ${audience === "lapsed" ? sql`and g.visit_count >= 2 and g.last_visit_at < now() - interval '45 days'` : sql``}
      ${audience === "regulars" ? sql`and g.visit_count >= 3` : sql``}
    order by g.visit_count desc limit 200`;
  return rows.map((r) => r.id);
}
