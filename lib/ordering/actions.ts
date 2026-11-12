"use server";

import { withLeverDiff } from "../levers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db";
import { createOrderCheckout } from "../payments/stripe";
import { requireTenant } from "../platform/context";
import { allow, clientAddress } from "../platform/ratelimit";
import { Forbidden } from "../platform/tenant";
import { getPublishedSite } from "../sites/repo";
import { promotionsForOrder } from "../marketing/promotions";
import {
  getOrderingSettings, placeOrder, priceCart, saveOrderingSettings, setKitchenState, setOrderStatus,
  type CartLine, type OrderField, type OrderKind, type OrderStatus,
} from "./index";

/* ------------------------------------------------------------- guests -- */

export interface OrderState { error: string | null; unavailable?: string[]; field?: OrderField }

export async function placeOrderAction(_prev: OrderState, form: FormData): Promise<OrderState> {
  const sql = db();
  if (!sql) return { error: "Ordering is unavailable right now." };
  const get = (k: string) => String(form.get(k) ?? "").trim();
  if (get("website")) return { error: null }; // honeypot
  const h = await headers();
  if (!(await allow(sql, "order", clientAddress(h), 8, 30))) return { error: "Too many attempts. Please wait a few minutes or call us." };
  const site = await getPublishedSite(sql, get("site"));
  if (!site) return { error: "Ordering is unavailable right now." };

  let cart: CartLine[];
  try { cart = JSON.parse(get("cart") || "[]"); } catch { return { error: "Your order didn't come through. Please try again." }; }
  const kind: OrderKind = get("kind") === "catering" ? "catering" : "pickup";
  const [date, time] = get("when").split("T");
  const key = process.env.STRIPE_SECRET_KEY?.trim();

  const r = await placeOrder(sql, {
    orgId: site.orgId, venueId: site.venueId, timezone: site.timezone, content: site.content, kind, cart,
    tipCents: Math.round(Number(get("tip") || 0) * 100), date: date ?? "", time: time ?? "",
    name: get("name"), phone: get("phone"), email: get("email") || undefined,
    headcount: kind === "catering" ? Number(get("headcount")) : null, notes: get("notes"),
    payOnline: Boolean(key),
    promoCode: get("promo").slice(0, 40) || undefined,
  });
  if (!r.ok) return { error: r.error, unavailable: r.unavailable, field: r.field };

  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? ""}`;
  const status = `${origin}/s/${site.slug}/order/${r.token}`;
  if (key) {
    const url = await createOrderCheckout(sql, key, {
      orgId: site.orgId, orderId: r.id, number: r.number, totalCents: r.totalCents, restaurant: site.content.brand.name,
      returnUrl: `${status}?paid=1`, cancelUrl: `${origin}/s/${site.slug}/order?cancelled=1`, email: get("email") || null,
    });
    redirect(url);
  }
  redirect(status);
}

/**
 * The order page's preview of a promo code (or an automatic promotion)
 * against the cart. Only a preview: placing the order prices it again,
 * with the guest's phone for per-guest limits.
 */
export async function previewPromoAction(
  slug: string, kind: string, cart: CartLine[], code: string,
): Promise<{ discountCents: number; label: string | null; error: string | null }> {
  const sql = db();
  const site = sql ? await getPublishedSite(sql, String(slug)) : null;
  if (!sql || !site) return { discountCents: 0, label: null, error: null };
  const now = new Date();
  const settings = await getOrderingSettings(sql, site.orgId);
  const promotions = await promotionsForOrder(sql, site.orgId, null, now);
  const k: OrderKind = kind === "catering" ? "catering" : "pickup";
  const priced = priceCart(site.content, settings, k, Array.isArray(cart) ? cart.slice(0, 40) : [], 0, { code: String(code ?? "").slice(0, 40), promotions, now });
  if (!priced.ok) return { discountCents: 0, label: null, error: priced.error };
  return { discountCents: priced.discountCents, label: priced.promotion ? (priced.promotion.code ?? priced.promotion.name) : null, error: null };
}

/* ------------------------------------------------------------- staff --- */

const back = (org: string, q = "") => redirect(`/r/${org}/orders${q ? `?${q}` : ""}`);
const STATUSES: OrderStatus[] = ["accepted", "ready", "completed", "cancelled"];

export async function orderStatusAction(form: FormData) {
  const org = String(form.get("org") ?? "");
  const { tenant, org: o } = await requireTenant(org);
  const to = String(form.get("to") ?? "") as OrderStatus;
  if (!STATUSES.includes(to)) back(org, "err=Unknown+change.");
  let r: string;
  try {
    r = await setOrderStatus(db()!, tenant, String(form.get("id") ?? ""), to, { restaurant: o.name });
  } catch (err) {
    if (!(err instanceof Forbidden)) throw err;
    r = "forbidden";
  }
  back(org, r === "ok" ? "" : `err=${encodeURIComponent(r === "forbidden" ? "Your role can't change orders." : "That order has already moved on.")}`);
}

export async function orderingSettingsAction(form: FormData) {
  const org = String(form.get("org") ?? "");
  const { tenant } = await requireTenant(org);
  const sql = db()!;
  const cur = await getOrderingSettings(sql, tenant.orgId);
  const num = (k: string, fallback: number) => {
    const v = String(form.get(k) ?? "").trim();
    return v === "" ? fallback : Number(v);
  };
  let err: string | null;
  try {
    err = await withLeverDiff(sql, tenant, "ordering", "settings", () => saveOrderingSettings(sql, tenant, {
      ...cur,
      pickupEnabled: form.get("pickup") === "on",
      cateringEnabled: form.get("catering") === "on",
      taxBps: Math.round(num("tax", cur.taxBps / 100) * 100),
      leadMinutes: num("lead", cur.leadMinutes),
      cateringLeadHours: num("cateringLead", cur.cateringLeadHours),
      cateringMinCents: Math.round(num("cateringMin", cur.cateringMinCents / 100) * 100),
    }));
  } catch (e) {
    if (!(e instanceof Forbidden)) throw e;
    err = "Your role can't change ordering settings.";
  }
  back(org, err ? `err=${encodeURIComponent(err)}` : "ok=Saved.");
}

/** The two things a busy kitchen does mid-service: pause, and 86 an item. */
export async function kitchenAction(form: FormData) {
  const org = String(form.get("org") ?? "");
  const { tenant } = await requireTenant(org);
  const sql = db()!;
  const cur = await getOrderingSettings(sql, tenant.orgId);
  const pause = String(form.get("pause") ?? "");
  const item = String(form.get("item") ?? "");
  const next = { ...cur };
  if (pause === "resume") next.pausedUntil = null;
  else if (["15", "30", "60"].includes(pause)) next.pausedUntil = new Date(Date.now() + Number(pause) * 60_000);
  if (item) next.soldOut = cur.soldOut.includes(item) ? cur.soldOut.filter((i) => i !== item) : [...cur.soldOut, item].slice(0, 500);
  let err: string | null = null;
  try {
    await withLeverDiff(sql, tenant, "ordering", "kitchen board", () => setKitchenState(sql, tenant, next));
  } catch (e) {
    if (!(e instanceof Forbidden)) throw e;
    err = "Your role can't pause ordering or mark items sold out.";
  }
  back(org, err ? `err=${encodeURIComponent(err)}` : "");
}
