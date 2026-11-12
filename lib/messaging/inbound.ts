import { createHmac, timingSafeEqual } from "node:crypto";
import type { Sql } from "postgres";
import { normalizePhone } from "../guests/phone";
import { log } from "../reservations/repo";

/**
 * Texts coming in from guests, through Twilio's messaging webhook.
 *
 * For now the only thing we act on is opting out and back in. Twilio
 * itself blocks further texts to a number that sent STOP and sends the
 * standard confirmation; we record it on the guest so our own consent
 * checks (every marketing send) agree, and so the guest list shows it.
 *
 * Every restaurant currently texts from one shared number, so a STOP
 * means "stop texting me from this number" — it opts the phone out at
 * every restaurant it's on. When restaurants get their own numbers, match
 * on the message's To number as well.
 */

/** Twilio's documented algorithm: the full URL, then each POST param's
 *  name and value appended in name order, HMAC-SHA1 with the auth token,
 *  base64. */
export function twilioSignature(url: string, params: Iterable<[string, string]>, authToken: string): string {
  const pairs = [...params].sort(([a, av], [b, bv]) => (a < b ? -1 : a > b ? 1 : av < bv ? -1 : av > bv ? 1 : 0));
  const data = url + pairs.map(([k, v]) => k + v).join("");
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

export function verifyTwilioSignature(url: string, params: Iterable<[string, string]>, header: string | null, authToken: string | undefined): boolean {
  if (!header || !authToken) return false;
  const expected = Buffer.from(twilioSignature(url, params, authToken));
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const STOP = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const START = new Set(["START", "UNSTOP"]);

/** The opt-out keyword in a message, if it is one. The whole message
 *  must be the keyword (any case, surrounding spaces/punctuation). */
export function optKeyword(body: string): { kind: "stop" | "start"; word: string } | null {
  const word = body.trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "").toUpperCase();
  if (STOP.has(word)) return { kind: "stop", word };
  if (START.has(word)) return { kind: "start", word };
  return null;
}

export interface InboundResult { handled: "stop" | "start" | "ignored"; guests: number }

/** Apply one inbound text: From and Body as Twilio posts them. */
export async function handleInboundSms(sql: Sql, from: string, body: string, now = new Date()): Promise<InboundResult> {
  const k = optKeyword(body);
  const phone = normalizePhone(from);
  if (!k || !phone) return { handled: "ignored", guests: 0 };
  const note = "One sending number is shared by every restaurant, so this applies to this phone at all of them.";
  const rows = k.kind === "stop"
    ? await sql<{ id: string; org_id: string }[]>`
        update guests set sms_opted_out_at = ${now} where phone = ${phone} and sms_opted_out_at is null returning id, org_id`
    : await sql<{ id: string; org_id: string }[]>`
        update guests set sms_opted_out_at = null where phone = ${phone} and sms_opted_out_at is not null returning id, org_id`;
  for (const g of rows) {
    await log(sql, g.org_id, "guest", k.kind === "stop" ? "guest.sms_opted_out" : "guest.sms_opted_in", "guest", g.id,
      { via: "sms", keyword: k.word, note });
  }
  return { handled: k.kind, guests: rows.length };
}

/** An empty TwiML reply: Twilio sends the standard STOP/START confirmations itself. */
export const EMPTY_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
