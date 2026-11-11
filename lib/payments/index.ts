import type { Sql } from "postgres";
import { stripePayments } from "./stripe";

/**
 * Payments behind one interface, so the booking flow never knows which
 * processor is underneath. Today there is a shell provider: it records
 * the deposit as pending and lets staff mark it paid, so deposits can be
 * set up and tested end to end. Stripe slots in by implementing the same
 * three calls (Checkout Session, webhook to mark held, refund).
 */

export interface DepositRequest {
  orgId: string;
  reservationId: string;
  amountCents: number;
  /** Where the guest returns after paying. */
  returnUrl: string;
  description: string;
}

export interface PaymentsProvider {
  readonly id: string;
  /** Start collecting a deposit. Returns where to send the guest, if anywhere. */
  createDeposit(sql: Sql, req: DepositRequest): Promise<{ paymentId: string; checkoutUrl: string | null }>;
  /** Give it back (cancelled in time). */
  refund(sql: Sql, orgId: string, paymentId: string): Promise<void>;
}

/** Records deposits without moving money. Staff mark them paid. */
export const manualPayments: PaymentsProvider = {
  id: "manual",
  async createDeposit(sql, req) {
    const [p] = await sql<{ id: string }[]>`
      insert into payments (org_id, reservation_id, kind, amount_cents, provider)
      values (${req.orgId}, ${req.reservationId}, 'deposit', ${req.amountCents}, 'manual')
      returning id`;
    return { paymentId: p.id, checkoutUrl: null };
  },
  async refund(sql, orgId, paymentId) {
    await sql`update payments set status = 'refunded', updated_at = now()
              where id = ${paymentId} and org_id = ${orgId} and status in ('held', 'captured')`;
  },
};

/** Stripe when it's configured; otherwise deposits are recorded for staff. */
export function paymentsProvider(): PaymentsProvider {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key ? stripePayments(key) : manualPayments;
}

function providerFor(id: string): PaymentsProvider | null {
  if (id === "manual") return manualPayments;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (id === "stripe" && key) return stripePayments(key);
  return null;
}

/**
 * After a cancellation, give the deposit back when the policy says so:
 * always when the restaurant cancels, and when the guest cancels before
 * the venue's cut-off. Returns whether a refund was made.
 */
export async function refundDepositIfDue(
  sql: Sql, orgId: string, reservationId: string, by: "guest" | "restaurant", now = new Date(),
): Promise<boolean> {
  const [p] = await sql<{ id: string; provider: string; starts_at: Date; cutoff: number }[]>`
    select p.id, p.provider, r.starts_at, v.cancel_cutoff_hours as cutoff
    from payments p join reservations r on r.id = p.reservation_id join venues v on v.id = r.venue_id
    where p.reservation_id = ${reservationId} and p.org_id = ${orgId} and p.kind = 'deposit' and p.status in ('held', 'captured')
    order by p.created_at desc limit 1`;
  if (!p) return false;
  const inTime = p.starts_at.getTime() - now.getTime() >= p.cutoff * 3_600_000;
  if (by === "guest" && !inTime) return false;
  const provider = providerFor(p.provider);
  if (!provider) return false;
  await provider.refund(sql, orgId, p.id);
  await sql`update reservations set deposit_status = 'refunded', updated_at = now() where id = ${reservationId} and org_id = ${orgId}`;
  await sql`insert into change_log (org_id, actor, action, entity, entity_id, detail)
            values (${orgId}, ${by}, 'payment.refunded', 'reservation', ${reservationId}, ${sql.json({ paymentId: p.id, inTime })})`;
  return true;
}

export async function markDepositPaid(sql: Sql, orgId: string, reservationId: string, actor: string): Promise<boolean> {
  const rows = await sql`
    update payments set status = 'held', updated_at = now()
    where reservation_id = ${reservationId} and org_id = ${orgId} and kind = 'deposit' and status = 'pending'
    returning id`;
  if (rows.length) {
    await sql`update reservations set deposit_status = 'held', updated_at = now() where id = ${reservationId} and org_id = ${orgId}`;
    await sql`insert into change_log (org_id, actor, action, entity, entity_id) values (${orgId}, ${actor}, 'payment.deposit_marked_paid', 'reservation', ${reservationId})`;
  }
  return rows.length > 0;
}
