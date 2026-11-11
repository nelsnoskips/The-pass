import { createHmac, timingSafeEqual } from "node:crypto";
import type { Sql } from "postgres";
import { activateCard } from "../giftcards";
import type { DepositRequest, PaymentsProvider } from "./index";

/**
 * Stripe, over its REST API (no SDK: four calls don't justify one).
 *
 * A deposit is a Checkout Session the guest pays on Stripe's own page —
 * card details never touch The Pass. The table is already held when the
 * guest is sent there; if they don't pay before the session expires, the
 * webhook lets the table go.
 *
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 */

type Fetch = typeof fetch;
const API = "https://api.stripe.com/v1";
/** How long a guest has to pay before the table is released. Stripe's minimum is 30. */
const PAY_WITHIN_MINUTES = 30;

function form(fields: Record<string, string | number>): URLSearchParams {
  const f = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) f.set(k, String(v));
  return f;
}

async function call<T>(f: Fetch, path: string, body: URLSearchParams, key: string, idempotencyKey: string): Promise<T> {
  const res = await f(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // A retried request can't create a second session or refund.
      "Idempotency-Key": idempotencyKey,
    },
    body,
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Stripe: ${json.error?.message ?? res.status}`);
  return json;
}

export function stripePayments(key: string, f: Fetch = fetch, now: () => Date = () => new Date()): PaymentsProvider {
  return {
    id: "stripe",
    async createDeposit(sql: Sql, req: DepositRequest) {
      const [p] = await sql<{ id: string }[]>`
        insert into payments (org_id, reservation_id, kind, amount_cents, provider)
        values (${req.orgId}, ${req.reservationId}, 'deposit', ${req.amountCents}, 'stripe')
        returning id`;
      const back = new URL(req.returnUrl);
      const paid = new URL(back);
      paid.searchParams.set("paid", "1");
      const session = await call<{ id: string; url: string }>(f, "/checkout/sessions", form({
        mode: "payment",
        "line_items[0][quantity]": 1,
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": req.amountCents,
        "line_items[0][price_data][product_data][name]": req.description,
        success_url: paid.toString(),
        cancel_url: back.toString(),
        expires_at: Math.floor(now().getTime() / 1000) + PAY_WITHIN_MINUTES * 60,
        "metadata[payment_id]": p.id,
        "payment_intent_data[metadata][payment_id]": p.id,
      }), key, `deposit-${p.id}`);
      await sql`update payments set provider_ref = ${session.id}, checkout_url = ${session.url}, updated_at = now() where id = ${p.id}`;
      return { paymentId: p.id, checkoutUrl: session.url };
    },
    async refund(sql: Sql, orgId: string, paymentId: string) {
      const [p] = await sql<{ provider_charge_ref: string | null; status: string }[]>`
        select provider_charge_ref, status from payments where id = ${paymentId} and org_id = ${orgId} and provider = 'stripe'`;
      if (!p || p.status !== "captured" || !p.provider_charge_ref) return;
      await call(f, "/refunds", form({ payment_intent: p.provider_charge_ref, "metadata[payment_id]": paymentId }), key, `refund-${paymentId}`);
      // Marked refunded now; the charge.refunded webhook confirms it.
      await sql`update payments set status = 'refunded', updated_at = now() where id = ${paymentId}`;
      await sql`update reservations set deposit_status = 'refunded', updated_at = now()
                where id = (select reservation_id from payments where id = ${paymentId})`;
    },
  };
}

/**
 * Stripe's signature scheme: HMAC-SHA256 of "<timestamp>.<raw body>" with
 * the endpoint secret, in the Stripe-Signature header as t=…,v1=…. Old
 * timestamps are refused so a captured request can't be replayed.
 */
export function verifyStripeSignature(raw: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000), tolerance = 300): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.split("=") as [string, string]));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(nowSec - t) > tolerance) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  const given = header.split(",").filter((kv) => kv.startsWith("v1=")).map((kv) => kv.slice(3));
  return given.some((g) => g.length === expected.length && timingSafeEqual(Buffer.from(g), Buffer.from(expected)));
}

interface StripeEvent {
  id: string;
  type: string;
  data: { object: { id: string; payment_intent?: string | null; metadata?: Record<string, string> } };
}

/** Apply a verified event. Idempotent: replays change nothing. */
export async function applyStripeEvent(sql: Sql, event: StripeEvent): Promise<boolean> {
  const obj = event.data.object;
  const paymentId = obj.metadata?.payment_id;
  if (!paymentId || !/^[0-9a-f-]{36}$/i.test(paymentId)) return false;

  return sql.begin(async (tx) => {
    const [p] = await tx<{ id: string; org_id: string; reservation_id: string | null; gift_card_id: string | null; status: string }[]>`
      select id, org_id, reservation_id, gift_card_id, status from payments where id = ${paymentId} and provider = 'stripe' for update`;
    if (!p) return false;
    const audit = (action: string) =>
      tx`insert into change_log (org_id, actor, action, entity, entity_id, detail)
         values (${p.org_id}, 'stripe', ${action}, 'payment', ${p.id}, ${tx.json({ event: event.id })})`;

    if (event.type === "checkout.session.completed" && p.status === "pending") {
      await tx`update payments set status = 'captured', provider_charge_ref = ${obj.payment_intent ?? null}, updated_at = now() where id = ${p.id}`;
      if (p.reservation_id) await tx`update reservations set deposit_status = 'captured', updated_at = now() where id = ${p.reservation_id}`;
      if (p.gift_card_id) await activateCard(tx, p.gift_card_id, "stripe");
      await audit(p.gift_card_id ? "payment.gift_card_paid" : "payment.deposit_paid");
      return true;
    }
    if (event.type === "checkout.session.expired" && p.status === "pending") {
      await tx`update payments set status = 'canceled', updated_at = now() where id = ${p.id}`;
      // An unpaid gift card never existed as far as anyone can spend it.
      if (p.gift_card_id) await tx`update gift_cards set status = 'void' where id = ${p.gift_card_id} and status = 'pending'`;
      if (p.reservation_id) {
        // Unpaid deposit: the table goes back. Only while still just booked.
        const released = await tx`
          update reservations set status = 'cancelled', deposit_status = 'none', updated_at = now()
          where id = ${p.reservation_id} and status in ('booked', 'confirmed') returning id`;
        if (released.length) {
          await tx`update reservation_tables set live = false where reservation_id = ${p.reservation_id}`;
          await tx`insert into change_log (org_id, actor, action, entity, entity_id, detail)
                   values (${p.org_id}, 'stripe', 'reservation.cancelled', 'reservation', ${p.reservation_id}, ${tx.json({ reason: "deposit not paid" })})`;
        }
      }
      await audit("payment.deposit_expired");
      return true;
    }
    if (event.type === "charge.refunded" && p.status !== "refunded") {
      await tx`update payments set status = 'refunded', updated_at = now() where id = ${p.id}`;
      if (p.reservation_id) await tx`update reservations set deposit_status = 'refunded', updated_at = now() where id = ${p.reservation_id}`;
      await audit("payment.refunded");
      return true;
    }
    return false;
  });
}

/** Checkout for a gift card. The card is created pending; the webhook activates it. */
export async function createGiftCardCheckout(
  sql: Sql, key: string,
  input: { orgId: string; giftCardId: string; amountCents: number; description: string; returnUrl: string; email: string },
  f: Fetch = fetch,
): Promise<string> {
  const [p] = await sql<{ id: string }[]>`
    insert into payments (org_id, gift_card_id, kind, amount_cents, provider)
    values (${input.orgId}, ${input.giftCardId}, 'gift_card', ${input.amountCents}, 'stripe') returning id`;
  const back = new URL(input.returnUrl);
  const done = new URL(back);
  done.searchParams.set("paid", "1");
  const session = await call<{ id: string; url: string }>(f, "/checkout/sessions", form({
    mode: "payment",
    customer_email: input.email,
    "line_items[0][quantity]": 1,
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": input.amountCents,
    "line_items[0][price_data][product_data][name]": input.description,
    success_url: done.toString(),
    cancel_url: back.toString(),
    "metadata[payment_id]": p.id,
    "payment_intent_data[metadata][payment_id]": p.id,
  }), key, `giftcard-${p.id}`);
  await sql`update payments set provider_ref = ${session.id}, checkout_url = ${session.url}, updated_at = now() where id = ${p.id}`;
  return session.url;
}
