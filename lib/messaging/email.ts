import { createHmac, timingSafeEqual } from "node:crypto";
import type { Sql } from "postgres";
import { Resend } from "resend";
import { log } from "../reservations/repo";

/**
 * Email campaigns to guests. Same rules as texts, adapted for email:
 * only guests with email consent on record, at most one campaign a week
 * each, and every message carries a one-click unsubscribe — in the body
 * and in the List-Unsubscribe header mail providers show as a button.
 *
 * The unsubscribe link is the guest's id signed with INTEGRATIONS_KEY,
 * so it works without a login and can't be forged for someone else.
 */

export type EmailSender = (msg: { from: string; to: string; subject: string; text: string; unsubscribeUrl: string }) =>
  Promise<{ status: "sent"; providerId: string } | { status: "dry_run" } | { status: "failed"; error: string }>;

export const sendEmail: EmailSender = async (msg) => {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { status: "dry_run" };
  try {
    const { data, error } = await new Resend(key).emails.send({
      from: msg.from, to: msg.to, subject: msg.subject, text: msg.text,
      headers: { "List-Unsubscribe": `<${msg.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (error) return { status: "failed", error: error.message };
    return { status: "sent", providerId: data?.id ?? "" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
};

function secret(): Buffer {
  const raw = process.env.INTEGRATIONS_KEY?.trim();
  if (!raw) throw new Error("INTEGRATIONS_KEY is not set.");
  return Buffer.from(raw, "base64");
}

export function unsubscribeToken(guestId: string): string {
  const mac = createHmac("sha256", secret()).update(`unsub:${guestId}`).digest("base64url").slice(0, 32);
  return `${Buffer.from(guestId).toString("base64url")}.${mac}`;
}

export function readUnsubscribeToken(token: string): string | null {
  const [id, mac] = token.split(".");
  if (!id || !mac || !process.env.INTEGRATIONS_KEY?.trim()) return null;
  const guestId = Buffer.from(id, "base64url").toString("utf8");
  if (!/^[0-9a-f-]{36}$/i.test(guestId)) return null;
  const want = createHmac("sha256", secret()).update(`unsub:${guestId}`).digest("base64url").slice(0, 32);
  return want.length === mac.length && timingSafeEqual(Buffer.from(want), Buffer.from(mac)) ? guestId : null;
}

export async function unsubscribeEmail(sql: Sql, guestId: string): Promise<{ restaurant: string } | null> {
  const [g] = await sql<{ org_id: string; name: string }[]>`
    update guests g set email_opted_out_at = coalesce(g.email_opted_out_at, now())
    from orgs o where g.id = ${guestId} and o.id = g.org_id
    returning g.org_id, o.name`;
  if (!g) return null;
  await log(sql, g.org_id, "guest", "guest.email_unsubscribed", "guest", guestId);
  return { restaurant: g.name };
}

const WEEK = 7 * 86_400_000;

/** Of these guests, the ones who may get a marketing email right now. */
export async function emailable(sql: Sql, orgId: string, ids: string[], now = new Date()) {
  const uuids = ids.filter((i) => /^[0-9a-f-]{36}$/i.test(i));
  if (!uuids.length) return [];
  return sql<{ id: string; email: string; name: string }[]>`
    select g.id, g.email, g.name from guests g
    where g.org_id = ${orgId} and g.id = any(${uuids}::uuid[]) and g.email is not null
      and g.email_consent_at is not null and g.email_opted_out_at is null
      and not exists (select 1 from guest_messages m where m.guest_id = g.id and m.kind = 'marketing'
                      and m.channel = 'email' and m.created_at > ${new Date(now.getTime() - WEEK)})`;
}

export async function sendEmailCampaign(
  sql: Sql,
  input: { orgId: string; actor: string; guestIds: string[]; subject: string; body: string; baseUrl: string; campaignId?: string | null },
  sender: EmailSender = sendEmail,
): Promise<{ sent: number; dry_run: number; failed: number; skipped: number }> {
  const [org] = await sql<{ name: string }[]>`select name from orgs where id = ${input.orgId}`;
  const fromAddress = (process.env.MAIL_FROM ?? "The Pass <onboarding@resend.dev>").replace(/^.*<|>.*$/g, "");
  const from = `${org?.name ?? "The Pass"} <${fromAddress}>`;
  const recipients = await emailable(sql, input.orgId, input.guestIds);
  const tally = { sent: 0, dry_run: 0, failed: 0, skipped: input.guestIds.length - recipients.length };
  // Without INTEGRATIONS_KEY there is no working unsubscribe link, so
  // nothing may leave: every message is recorded as a dry run instead.
  const signed = Boolean(process.env.INTEGRATIONS_KEY?.trim());
  for (const g of recipients) {
    let r: Awaited<ReturnType<EmailSender>> = { status: "dry_run" };
    if (signed) {
      const token = unsubscribeToken(g.id);
      const unsubscribeUrl = `${input.baseUrl}/api/unsubscribe/${token}`;
      const pageUrl = `${input.baseUrl}/u/${token}`;
      const first = g.name.split(" ")[0];
      const text = `Hi ${first},\n\n${input.body.trim()}\n\n—\n${org?.name ?? ""}\nUnsubscribe: ${pageUrl}`;
      r = await sender({ from, to: g.email, subject: input.subject, text, unsubscribeUrl });
    }
    tally[r.status]++;
    await sql`
      insert into guest_messages (org_id, guest_id, channel, kind, body, status, provider_id, error, sent_by, campaign_id)
      values (${input.orgId}, ${g.id}, 'email', 'marketing', ${`${input.subject}\n\n${input.body.trim()}`}, ${r.status},
              ${r.status === "sent" ? r.providerId : null}, ${r.status === "failed" ? r.error : null}, ${input.actor}, ${input.campaignId ?? null})`;
  }
  await log(sql, input.orgId, input.actor, "guests.email_marketing", "guest_messages", null, { ...tally, subject: input.subject });
  return tally;
}
