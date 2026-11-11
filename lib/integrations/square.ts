import { createHmac, timingSafeEqual } from "node:crypto";
import type { Sql } from "postgres";
import { recordCheck } from "../guests/visits";
import { log } from "../reservations/repo";
import { open, seal } from "./secrets";

/**
 * Square: a restaurant signs in, and every completed payment becomes a
 * check on the guest who paid — matched by the phone or email on their
 * Square customer record — so visits and spend fill the guest list
 * without anyone typing them.
 *
 *   SQUARE_APPLICATION_ID, SQUARE_APPLICATION_SECRET,
 *   SQUARE_WEBHOOK_SIGNATURE_KEY, SQUARE_ENVIRONMENT (sandbox|production)
 *   Webhook URL: <site>/api/webhooks/square   OAuth redirect:
 *   <site>/api/integrations/square/callback
 */

type Fetch = typeof fetch;
const VERSION = "2025-01-23";

function base(): string {
  return process.env.SQUARE_ENVIRONMENT === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
}

export function squareConfigured(): boolean {
  return Boolean(process.env.SQUARE_APPLICATION_ID?.trim() && process.env.SQUARE_APPLICATION_SECRET?.trim());
}

export function squareAuthorizeUrl(state: string): string {
  const u = new URL(`${base()}/oauth2/authorize`);
  u.searchParams.set("client_id", process.env.SQUARE_APPLICATION_ID ?? "");
  u.searchParams.set("scope", "PAYMENTS_READ CUSTOMERS_READ MERCHANT_PROFILE_READ");
  u.searchParams.set("session", "false");
  u.searchParams.set("state", state);
  return u.toString();
}

async function json<T>(res: Response, what: string): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { errors?: { detail?: string }[]; message?: string };
  if (!res.ok) throw new Error(`Square ${what}: ${body.errors?.[0]?.detail ?? body.message ?? res.status}`);
  return body;
}

export async function connectSquare(sql: Sql, orgId: string, code: string, actor: string, f: Fetch = fetch): Promise<string> {
  const t = await json<{ access_token: string; refresh_token: string; merchant_id: string }>(await f(`${base()}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Square-Version": VERSION },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APPLICATION_ID, client_secret: process.env.SQUARE_APPLICATION_SECRET,
      code, grant_type: "authorization_code",
    }),
  }), "token");
  const m = await json<{ merchant?: { business_name?: string } }>(await f(`${base()}/v2/merchants/${t.merchant_id}`, {
    headers: { Authorization: `Bearer ${t.access_token}`, "Square-Version": VERSION },
  }), "merchant");
  const label = m.merchant?.business_name ?? t.merchant_id;
  // One Square account belongs to one restaurant: a second org claiming
  // it would receive the first one's guests' checks.
  const [taken] = await sql`
    select 1 from org_integrations where provider = 'square' and settings->>'merchantId' = ${t.merchant_id} and org_id <> ${orgId}`;
  if (taken) throw new Error("That Square account is already connected to another restaurant.");
  await sql`
    insert into org_integrations (org_id, provider, status, account_label, settings, secret, updated_by)
    values (${orgId}, 'square', 'connected', ${label}, ${sql.json({ merchantId: t.merchant_id })},
            ${seal(JSON.stringify({ access: t.access_token, refresh: t.refresh_token }))}, ${actor})
    on conflict (org_id, provider) do update set status = 'connected', account_label = excluded.account_label,
      settings = excluded.settings, secret = excluded.secret, updated_by = excluded.updated_by, updated_at = now(), error = null`;
  await log(sql, orgId, actor, "integration.connected", "integration", "square", { merchant: label });
  return label;
}

/** Square signs base64(HMAC-SHA256(notification URL + raw body)). */
export function verifySquareSignature(raw: string, header: string | null, url: string, key: string): boolean {
  if (!header) return false;
  const expected = createHmac("sha256", key).update(url + raw).digest("base64");
  return expected.length === header.length && timingSafeEqual(Buffer.from(expected), Buffer.from(header));
}

interface SquareEvent {
  merchant_id: string;
  type: string;
  data?: { object?: { payment?: {
    id: string; status: string; customer_id?: string; buyer_email_address?: string;
    total_money?: { amount: number; currency: string }; updated_at?: string;
  } } };
}

/** A completed payment → a check on the matching guest. */
export async function handleSquareEvent(sql: Sql, event: SquareEvent, f: Fetch = fetch): Promise<boolean> {
  const p = event.data?.object?.payment;
  if (!p || !event.type.startsWith("payment.") || p.status !== "COMPLETED") return false;
  const [org] = await sql<{ org_id: string; secret: string | null }[]>`
    select org_id, secret from org_integrations
    where provider = 'square' and status = 'connected' and settings->>'merchantId' = ${event.merchant_id}`;
  if (!org) return false;

  let phone: string | null = null;
  let email: string | null = p.buyer_email_address ?? null;
  if (p.customer_id && org.secret) {
    const { access } = JSON.parse(open(org.secret)) as { access: string };
    const res = await f(`${base()}/v2/customers/${p.customer_id}`, {
      headers: { Authorization: `Bearer ${access}`, "Square-Version": VERSION },
    });
    if (res.ok) {
      const c = (await res.json()) as { customer?: { phone_number?: string; email_address?: string } };
      phone = c.customer?.phone_number ?? null;
      email = c.customer?.email_address ?? email;
    }
  }
  const r = await recordCheck(sql, {
    orgId: org.org_id, source: "square", externalId: p.id,
    amountCents: p.total_money?.amount ?? 0, closedAt: new Date(p.updated_at ?? Date.now()), phone, email,
  });
  return r.recorded;
}
