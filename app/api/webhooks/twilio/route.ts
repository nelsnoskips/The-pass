import { db } from "@/lib/db";
import { EMPTY_TWIML, handleInboundSms, verifyTwilioSignature } from "@/lib/messaging/inbound";

/**
 * Twilio's messaging webhook: texts guests send to our number. Set it in
 * Twilio as POST https://<site>/api/webhooks/twilio.
 *
 * Verified with X-Twilio-Signature against TWILIO_AUTH_TOKEN over the
 * exact URL Twilio called — taken from SITE_URL (or Netlify's URL) so a
 * proxy in front doesn't change it — before anything is read. STOP and
 * START are recorded on the guest (lib/messaging/inbound.ts); the reply
 * is empty TwiML because Twilio sends the standard confirmations itself.
 *
 * A static route, so it takes precedence over /api/webhooks/[provider].
 */
export const dynamic = "force-dynamic";

function signedUrl(req: Request): string {
  const u = new URL(req.url);
  const site = (process.env.SITE_URL ?? process.env.URL ?? "").replace(/\/+$/, "");
  return site ? `${site}${u.pathname}${u.search}` : req.url;
}

export async function POST(req: Request) {
  const raw = await req.text();
  const params = new URLSearchParams(raw);
  if (!verifyTwilioSignature(signedUrl(req), params.entries(), req.headers.get("x-twilio-signature"), process.env.TWILIO_AUTH_TOKEN?.trim())) {
    return new Response("Bad signature.", { status: 403 });
  }
  const sql = db();
  if (!sql) return new Response("No database.", { status: 503 });
  await handleInboundSms(sql, params.get("From") ?? "", params.get("Body") ?? "");
  return new Response(EMPTY_TWIML, { headers: { "Content-Type": "text/xml" } });
}
