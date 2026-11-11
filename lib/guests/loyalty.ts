import type { Sql } from "postgres";
import { log } from "../reservations/repo";
import { assertCan, type Tenant } from "../platform/tenant";

/**
 * Visit-based loyalty: every N visits, a reward the host hands over.
 * Earned automatically when a visit is counted (lib/guests/visits.ts);
 * redeemed at the host stand. No points, no app, nothing to explain.
 */

export interface Program { active: boolean; visitsRequired: number; reward: string }

export async function getProgram(sql: Sql, t: Tenant): Promise<Program> {
  assertCan(t, "view");
  const [p] = await sql<{ active: boolean; visits_required: number; reward: string }[]>`
    select active, visits_required, reward from loyalty_programs where org_id = ${t.orgId}`;
  return p ? { active: p.active, visitsRequired: p.visits_required, reward: p.reward } : { active: false, visitsRequired: 5, reward: "A dessert on us" };
}

export async function saveProgram(sql: Sql, t: Tenant, p: Program): Promise<string | null> {
  assertCan(t, "manage_venue");
  const reward = p.reward.trim().slice(0, 120);
  if (!reward) return "Say what the reward is.";
  if (!Number.isInteger(p.visitsRequired) || p.visitsRequired < 2 || p.visitsRequired > 50) return "Visits must be between 2 and 50.";
  await sql`
    insert into loyalty_programs (org_id, active, visits_required, reward) values (${t.orgId}, ${p.active}, ${p.visitsRequired}, ${reward})
    on conflict (org_id) do update set active = excluded.active, visits_required = excluded.visits_required,
      reward = excluded.reward, updated_at = now()`;
  await log(sql, t.orgId, t.actor, "loyalty.saved", "loyalty_program", t.orgId, { ...p, reward });
  return null;
}

export async function openRewards(sql: Sql, t: Tenant, guestIds: string[]): Promise<Map<string, { id: string; reward: string }>> {
  assertCan(t, "view");
  if (!guestIds.length) return new Map();
  const rows = await sql<{ id: string; guest_id: string; reward: string }[]>`
    select distinct on (guest_id) id, guest_id, reward from loyalty_rewards
    where org_id = ${t.orgId} and guest_id = any(${guestIds}::uuid[]) and redeemed_at is null
    order by guest_id, earned_at`;
  return new Map(rows.map((r) => [r.guest_id, { id: r.id, reward: r.reward }]));
}

export async function redeem(sql: Sql, t: Tenant, rewardId: string): Promise<boolean> {
  assertCan(t, "book");
  const rows = await sql`
    update loyalty_rewards set redeemed_at = now(), redeemed_by = ${t.actor}
    where id = ${rewardId} and org_id = ${t.orgId} and redeemed_at is null returning id`;
  if (rows.length) await log(sql, t.orgId, t.actor, "loyalty.redeemed", "loyalty_reward", rewardId);
  return rows.length > 0;
}
