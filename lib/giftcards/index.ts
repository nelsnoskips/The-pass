import { randomInt } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";
import { assertIncluded } from "../billing/entitlements";
import { sendMail } from "../email";
import { log } from "../reservations/repo";
import { assertCan, type Tenant } from "../platform/tenant";

/**
 * Gift cards: bought on the restaurant's site, paid on Stripe, emailed
 * as a code, spent at the restaurant over as many visits as it takes.
 * The balance only ever moves in a transaction that locks the card, so
 * two hosts redeeming at once can't spend it twice.
 */

type Q = Sql | TransactionSql;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function newCode(): string {
  const chunk = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${chunk()}-${chunk()}-${chunk()}`;
}

/** Forgiving to how people type codes: case, spaces, missing dashes, O for 0. */
export function normalizeCode(raw: string): string | null {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/O/g, "0");
  if (s.length !== 12) return null;
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

export interface Purchase {
  amountCents: number;
  purchaserName: string;
  purchaserEmail: string;
  recipientName?: string;
  recipientEmail?: string;
  message?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validatePurchase(p: Purchase): string | null {
  if (!Number.isInteger(p.amountCents) || p.amountCents < 1000 || p.amountCents > 50000) return "Choose an amount between $10 and $500.";
  if (!p.purchaserName.trim()) return "Add your name.";
  if (!EMAIL.test(p.purchaserEmail.trim())) return "Add your email so we can send the card.";
  if (p.recipientEmail && !EMAIL.test(p.recipientEmail.trim())) return "That recipient email doesn't look right.";
  return null;
}

export async function createCard(q: Q, orgId: string, p: Purchase): Promise<{ id: string; code: string }> {
  // Selling needs a plan with gift cards; cards already sold stay good.
  await assertIncluded(q as Sql, orgId, "gift_cards");
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const rows = await q<{ id: string }[]>`
      insert into gift_cards (org_id, code, initial_cents, balance_cents, purchaser_name, purchaser_email, recipient_name, recipient_email, message)
      values (${orgId}, ${code}, ${p.amountCents}, ${p.amountCents}, ${p.purchaserName.trim().slice(0, 120)}, ${p.purchaserEmail.trim().toLowerCase()},
              ${p.recipientName?.trim().slice(0, 120) || null}, ${p.recipientEmail?.trim().toLowerCase() || null}, ${p.message?.trim().slice(0, 500) || null})
      on conflict (code) do nothing returning id`;
    if (rows.length) return { id: rows[0].id, code };
  }
  throw new Error("Couldn't issue a gift card code.");
}

/** Paid: the card goes live and the code is emailed. Idempotent. */
export async function activateCard(q: Q, giftCardId: string, actor: string): Promise<boolean> {
  const [c] = await q<{ org_id: string; code: string; initial_cents: number; purchaser_name: string; purchaser_email: string; recipient_name: string | null; recipient_email: string | null; message: string | null }[]>`
    update gift_cards set status = 'active', activated_at = now()
    where id = ${giftCardId} and status = 'pending'
    returning org_id, code, initial_cents, purchaser_name, purchaser_email, recipient_name, recipient_email, message`;
  if (!c) return false;
  const [org] = await q<{ name: string }[]>`select name from orgs where id = ${c.org_id}`;
  await log(q, c.org_id, actor, "giftcard.activated", "gift_card", giftCardId, { amountCents: c.initial_cents });
  const amount = `$${(c.initial_cents / 100).toFixed(c.initial_cents % 100 ? 2 : 0)}`;
  const to = c.recipient_email ?? c.purchaser_email;
  const from = c.recipient_email ? ` from ${c.purchaser_name}` : "";
  await sendMail({
    to,
    subject: `Your ${amount} gift card to ${org?.name ?? "the restaurant"}`,
    text: [
      `${c.recipient_name ? `${c.recipient_name}, here's` : "Here's"} a ${amount} gift card to ${org?.name}${from}.`,
      c.message ? `\n"${c.message}"\n` : "",
      `Your code: ${c.code}`,
      "",
      "Show this code when you pay. It can be used across several visits until the balance is spent.",
    ].join("\n"),
  });
  if (c.recipient_email) {
    await sendMail({ to: c.purchaser_email, subject: `Your gift card to ${org?.name} was sent`, text: `We emailed the ${amount} gift card to ${c.recipient_name ?? c.recipient_email}. Code, for your records: ${c.code}` });
  }
  return true;
}

export type RedeemResult =
  | { ok: true; balanceCents: number }
  | { ok: false; reason: "not_found" | "not_active" | "insufficient" | "invalid_amount"; balanceCents?: number };

export async function redeemCard(sql: Sql, t: Tenant, rawCode: string, amountCents: number): Promise<RedeemResult> {
  assertCan(t, "book");
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, reason: "not_found" };
  if (!Number.isInteger(amountCents) || amountCents <= 0) return { ok: false, reason: "invalid_amount" };
  return sql.begin(async (tx): Promise<RedeemResult> => {
    const [c] = await tx<{ id: string; status: string; balance_cents: number }[]>`
      select id, status, balance_cents from gift_cards where code = ${code} and org_id = ${t.orgId} for update`;
    if (!c) return { ok: false, reason: "not_found" };
    if (c.status !== "active") return { ok: false, reason: "not_active", balanceCents: c.balance_cents };
    if (amountCents > c.balance_cents) return { ok: false, reason: "insufficient", balanceCents: c.balance_cents };
    const [after] = await tx<{ balance_cents: number }[]>`
      update gift_cards set balance_cents = balance_cents - ${amountCents} where id = ${c.id} returning balance_cents`;
    await tx`insert into gift_card_redemptions (org_id, gift_card_id, amount_cents, redeemed_by) values (${t.orgId}, ${c.id}, ${amountCents}, ${t.actor})`;
    await log(tx, t.orgId, t.actor, "giftcard.redeemed", "gift_card", c.id, { amountCents, balanceCents: after.balance_cents });
    return { ok: true, balanceCents: after.balance_cents };
  });
}

export async function lookupCard(sql: Sql, t: Tenant, rawCode: string) {
  assertCan(t, "view");
  const code = normalizeCode(rawCode);
  if (!code) return null;
  const [c] = await sql<{ id: string; code: string; status: string; initial_cents: number; balance_cents: number; recipient_name: string | null; purchaser_name: string; created_at: Date }[]>`
    select id, code, status, initial_cents, balance_cents, recipient_name, purchaser_name, created_at
    from gift_cards where code = ${code} and org_id = ${t.orgId}`;
  return c ?? null;
}

export async function setCardStatus(sql: Sql, t: Tenant, id: string, status: "active" | "void"): Promise<boolean> {
  assertCan(t, "manage_venue");
  if (status === "active") {
    const [c] = await sql`select 1 from gift_cards where id = ${id} and org_id = ${t.orgId}`;
    if (!c) return false;
    await sql`update payments set status = 'captured', updated_at = now() where gift_card_id = ${id} and status = 'pending'`;
    return activateCard(sql, id, t.actor);
  }
  const rows = await sql`update gift_cards set status = 'void' where id = ${id} and org_id = ${t.orgId} and status <> 'void' returning id`;
  if (rows.length) await log(sql, t.orgId, t.actor, "giftcard.voided", "gift_card", id);
  return rows.length > 0;
}
