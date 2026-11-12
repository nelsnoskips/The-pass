import type { Sql } from "postgres";
import { assertCan, type Tenant } from "../platform/tenant";

/**
 * "Get updates" in the app: a browser's push subscription, stored per
 * restaurant. Only a shell for now — nothing is sent — and nothing is
 * stored at all until push keys (VAPID) are configured, so a guest is
 * never told they're signed up for something that can't reach them.
 */

/** The public key browsers need to subscribe, or null when push isn't set up. */
export function vapidPublicKey(): string | null {
  const k = process.env.VAPID_PUBLIC_KEY?.trim();
  return k && /^[A-Za-z0-9_-]{40,200}$/.test(k) ? k : null;
}

export interface PushInput { endpoint: string; keys: { p256dh: string; auth: string } }

const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

/** A PushSubscription.toJSON() as a browser sends it, checked field by field. */
export function parsePushSubscription(body: unknown): { ok: true; sub: PushInput } | { ok: false; error: string } {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const s = b.subscription && typeof b.subscription === "object" ? (b.subscription as Record<string, unknown>) : b;
  const endpoint = typeof s.endpoint === "string" ? s.endpoint.trim() : "";
  let url: URL | null = null;
  try { url = new URL(endpoint); } catch { url = null; }
  if (!url || url.protocol !== "https:" || endpoint.length > 1000 || url.username || url.password) {
    return { ok: false, error: "That subscription's address isn't valid." };
  }
  const keys = s.keys && typeof s.keys === "object" ? (s.keys as Record<string, unknown>) : {};
  const p256dh = typeof keys.p256dh === "string" ? keys.p256dh : "";
  const auth = typeof keys.auth === "string" ? keys.auth : "";
  if (!B64URL.test(p256dh) || p256dh.length < 80 || p256dh.length > 100) return { ok: false, error: "That subscription's key isn't valid." };
  if (!B64URL.test(auth) || auth.length < 16 || auth.length > 32) return { ok: false, error: "That subscription's key isn't valid." };
  return { ok: true, sub: { endpoint, keys: { p256dh, auth } } };
}

export type PushResult =
  | { stored: true }
  | { stored: false; reason: "not_configured" | "invalid"; error: string };

/**
 * Store (or refresh) a subscription for a restaurant. A browser's
 * endpoint belongs to the restaurant it subscribed to; it is never moved
 * to another one.
 */
export async function savePushSubscription(sql: Sql, orgId: string, body: unknown, vapid = vapidPublicKey()): Promise<PushResult> {
  if (!vapid) return { stored: false, reason: "not_configured", error: "Updates are coming soon." };
  const p = parsePushSubscription(body);
  if (!p.ok) return { stored: false, reason: "invalid", error: p.error };
  const rows = await sql`
    insert into push_subscriptions (org_id, endpoint, keys) values (${orgId}, ${p.sub.endpoint}, ${sql.json(p.sub.keys)})
    on conflict (endpoint) do update set keys = excluded.keys, last_seen_at = now()
      where push_subscriptions.org_id = excluded.org_id
    returning id`;
  if (!rows.length) return { stored: false, reason: "invalid", error: "That subscription belongs to another app." };
  return { stored: true };
}

/** "Turn off updates": forget this browser for this restaurant. */
export async function removePushSubscription(sql: Sql, orgId: string, endpoint: string): Promise<boolean> {
  if (!endpoint || endpoint.length > 1000) return false;
  const rows = await sql`delete from push_subscriptions where org_id = ${orgId} and endpoint = ${endpoint} returning id`;
  return rows.length > 0;
}

/** How many guests have turned on updates. */
export async function pushSubscriberCount(sql: Sql, t: Tenant): Promise<number> {
  assertCan(t, "view");
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from push_subscriptions where org_id = ${t.orgId}`;
  return n;
}
