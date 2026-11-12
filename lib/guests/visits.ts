import type { Sql, TransactionSql } from "postgres";
import { isIncluded } from "../billing/entitlements";
import { normalizePhone } from "./phone";

/**
 * Visits and spend, from wherever they come from: a reservation marked
 * completed at the host stand, or a closed check from the point of sale.
 * A guest who books and then pays is one visit, not two.
 *
 * Loyalty hangs off here: every visit is a chance to earn a reward.
 */

type Q = Sql | TransactionSql;

export interface CheckInput {
  orgId: string;
  source: "square" | "toast" | "manual";
  externalId: string;
  amountCents: number;
  closedAt: Date;
  phone?: string | null;
  email?: string | null;
}

export type CheckResult =
  | { recorded: false; reason: "duplicate" | "invalid" }
  | { recorded: true; guestId: string | null; countedVisit: boolean; reward: string | null };

export async function recordCheck(sql: Sql, input: CheckInput): Promise<CheckResult> {
  if (!input.externalId || !Number.isInteger(input.amountCents) || input.amountCents < 0) return { recorded: false, reason: "invalid" };
  return sql.begin(async (tx): Promise<CheckResult> => {
    const phone = input.phone ? normalizePhone(input.phone) : null;
    const email = input.email?.trim().toLowerCase() || null;
    // Match by phone first (how guests book), then email. Never create a
    // guest from a check alone: someone who paid isn't someone who agreed
    // to be on a list.
    const [guest] = phone || email
      ? await tx<{ id: string }[]>`
          select id from guests where org_id = ${input.orgId}
            and (${phone}::text is not null and phone = ${phone} or ${email}::text is not null and lower(email) = ${email})
          order by (phone = ${phone}) desc nulls last limit 1`
      : [];
    const inserted = await tx<{ id: string }[]>`
      insert into guest_checks (org_id, guest_id, source, external_id, amount_cents, closed_at)
      values (${input.orgId}, ${guest?.id ?? null}, ${input.source}, ${input.externalId}, ${input.amountCents}, ${input.closedAt})
      on conflict (org_id, source, external_id) do nothing returning id`;
    if (!inserted.length) return { recorded: false, reason: "duplicate" };
    if (!guest) return { recorded: true, guestId: null, countedVisit: false, reward: null };

    await tx`update guests set total_spend_cents = total_spend_cents + ${input.amountCents} where id = ${guest.id}`;
    // Same day as a completed booking, or a second check that day: the
    // spend counts, the visit already did.
    const [{ already }] = await tx<{ already: boolean }[]>`
      select (
        exists (select 1 from reservations r where r.guest_id = ${guest.id} and r.status = 'completed'
                and r.starts_at between ${input.closedAt}::timestamptz - interval '12 hours' and ${input.closedAt})
        or exists (select 1 from guest_checks c where c.guest_id = ${guest.id} and c.external_id <> ${input.externalId}
                and c.closed_at between ${input.closedAt}::timestamptz - interval '12 hours' and ${input.closedAt})
      ) as already`;
    if (already) return { recorded: true, guestId: guest.id, countedVisit: false, reward: null };
    const reward = await countVisit(tx, input.orgId, guest.id, input.closedAt);
    return { recorded: true, guestId: guest.id, countedVisit: true, reward };
  });
}

/** One more visit for a guest; returns the reward if this visit earned one. */
export async function countVisit(q: Q, orgId: string, guestId: string, at: Date): Promise<string | null> {
  const [g] = await q<{ visit_count: number }[]>`
    update guests set visit_count = visit_count + 1, last_visit_at = greatest(coalesce(last_visit_at, ${at}), ${at})
    where id = ${guestId} and org_id = ${orgId} returning visit_count`;
  if (!g) return null;
  return earnReward(q, orgId, guestId, g.visit_count);
}

export async function earnReward(q: Q, orgId: string, guestId: string, visitCount: number): Promise<string | null> {
  const [p] = await q<{ visits_required: number; reward: string }[]>`
    select visits_required, reward from loyalty_programs where org_id = ${orgId} and active`;
  // Visits always count; rewards are only earned on a plan with loyalty.
  if (p && !(await isIncluded(q as Sql, orgId, "loyalty"))) return null;
  if (!p || visitCount === 0 || visitCount % p.visits_required !== 0) return null;
  const rows = await q`
    insert into loyalty_rewards (org_id, guest_id, reward, earned_at_visit)
    values (${orgId}, ${guestId}, ${p.reward}, ${visitCount})
    on conflict (guest_id, earned_at_visit) do nothing returning id`;
  return rows.length ? p.reward : null;
}
