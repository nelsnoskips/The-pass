"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db";
import { mailConfigured } from "../email";
import { createGiftCheckoutUrl } from "./checkout";
import { createCard, lookupCard, redeemCard, setCardStatus, activateCard, validatePurchase } from "./index";
import { allow, clientAddress } from "../platform/ratelimit";
import { requireTenant } from "../platform/context";
import { can, Forbidden } from "../platform/tenant";
import { getPublishedSite } from "../sites/repo";

/* ------------------------------------------------------------- guests -- */

export async function buyGiftCard(_prev: { error: string | null }, form: FormData): Promise<{ error: string | null }> {
  const sql = db();
  if (!sql) return { error: "Unavailable right now." };
  const get = (k: string) => String(form.get(k) ?? "").trim();
  if (get("website")) return { error: null };
  const h = await headers();
  if (!(await allow(sql, "giftcard", clientAddress(h), 6, 30))) return { error: "Too many attempts. Please wait a few minutes." };
  const site = await getPublishedSite(sql, get("site"));
  if (!site) return { error: "Unavailable right now." };
  const amount = Math.round(Number(get("amount") === "custom" ? get("custom") : get("amount")) * 100);
  const purchase = {
    amountCents: amount, purchaserName: get("name"), purchaserEmail: get("email"),
    recipientName: get("toName"), recipientEmail: get("toEmail"), message: get("message"),
  };
  const bad = validatePurchase(purchase);
  if (bad) return { error: bad };
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return { error: "Gift cards are sold at the restaurant for now. Ask your server." };
  const card = await createCard(sql, site.orgId, purchase);
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? ""}`;
  const url = await createGiftCheckoutUrl(sql, key, {
    orgId: site.orgId, giftCardId: card.id, amountCents: amount, email: purchase.purchaserEmail,
    description: `${site.content.brand.name} gift card`, returnUrl: `${origin}/s/${site.slug}/gift-cards`,
  });
  redirect(url);
}

/* ------------------------------------------------------------- staff --- */

const back = (org: string, q: string) => redirect(`/r/${org}/gift-cards?${q}`);
const money = (c: number) => `$${(c / 100).toFixed(2)}`;

export async function redeemAction(form: FormData) {
  const org = String(form.get("org") ?? "");
  const { tenant } = await requireTenant(org);
  const code = String(form.get("code") ?? "");
  const amount = Math.round(Number(String(form.get("amount") ?? "").replace(/[$,]/g, "")) * 100);
  let q: string;
  try {
    const r = await redeemCard(db()!, tenant, code, amount);
    q = r.ok
      ? `ok=${encodeURIComponent(`${money(amount)} taken off. ${money(r.balanceCents)} left on the card.`)}&code=${encodeURIComponent(code)}`
      : `err=${encodeURIComponent({
          not_found: "No card with that code.", not_active: "That card isn't active (unpaid or void).",
          insufficient: `Only ${money(r.balanceCents ?? 0)} left on that card.`, invalid_amount: "Enter an amount.",
        }[r.reason])}&code=${encodeURIComponent(code)}`;
  } catch (err) {
    if (!(err instanceof Forbidden)) throw err;
    q = `err=${encodeURIComponent("Your role can't redeem gift cards.")}`;
  }
  back(org, q);
}

export async function issueCardAction(form: FormData) {
  const org = String(form.get("org") ?? "");
  const { tenant } = await requireTenant(org);
  if (!can(tenant, "manage_venue")) back(org, `err=${encodeURIComponent("Your role can't issue gift cards.")}`);
  const purchase = {
    amountCents: Math.round(Number(String(form.get("amount") ?? "")) * 100),
    purchaserName: String(form.get("name") ?? ""), purchaserEmail: String(form.get("email") ?? ""),
    recipientName: String(form.get("toName") ?? ""), recipientEmail: String(form.get("toEmail") ?? ""),
  };
  const bad = validatePurchase(purchase);
  if (bad) back(org, `err=${encodeURIComponent(bad)}`);
  // Sold in person: paid at the counter, so it's live straight away.
  const card = await createCard(db()!, tenant.orgId, purchase);
  await activateCard(db()!, card.id, tenant.actor);
  const emailed = mailConfigured() ? "The code was emailed." : "Email isn't switched on yet, so hand them the code.";
  back(org, `ok=${encodeURIComponent(`Issued ${card.code} for ${money(purchase.amountCents)}. ${emailed}`)}&code=${card.code}`);
}

export async function cardStatusAction(form: FormData) {
  const org = String(form.get("org") ?? "");
  const { tenant } = await requireTenant(org);
  const status = form.get("status") === "void" ? "void" : "active";
  let ok = false;
  try {
    ok = await setCardStatus(db()!, tenant, String(form.get("id") ?? ""), status);
  } catch (err) {
    if (!(err instanceof Forbidden)) throw err;
  }
  back(org, ok ? `ok=${status === "void" ? "Card voided." : "Card activated and emailed."}` : `err=${encodeURIComponent("Couldn't change that card.")}`);
}

export async function lookupAction(org: string, code: string) {
  const { tenant } = await requireTenant(org);
  return lookupCard(db()!, tenant, code);
}
