import type { Sql } from "postgres";

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

/**
 * TODO(stripe): create a Checkout Session in setup/hold mode with
 * metadata { paymentId }, store session.id as provider_ref and its url
 * as checkout_url; a webhook (checkout.session.completed) marks the
 * payment held and the reservation's deposit_status 'held'.
 */
export function paymentsProvider(): PaymentsProvider {
  return manualPayments;
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
