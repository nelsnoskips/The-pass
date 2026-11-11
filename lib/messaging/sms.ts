/**
 * SMS out, through Twilio's REST API. With no Twilio credentials the
 * sender is a dry run: the message is recorded and nothing is sent, so
 * every flow above this works end to end before the account exists.
 *
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM (E.164 or a
 *   messaging service SID starting MG)
 */

export type SmsResult =
  | { status: "sent"; providerId: string }
  | { status: "dry_run" }
  | { status: "failed"; error: string };

export type SmsSender = (to: string, body: string) => Promise<SmsResult>;

export function smsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}

export const sendSms: SmsSender = async (to, body) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) return { status: "dry_run" };

  const form = new URLSearchParams({ To: to, Body: body });
  form.set(from.startsWith("MG") ? "MessagingServiceSid" : "From", from);
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const json = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok || !json.sid) return { status: "failed", error: json.message ?? `HTTP ${res.status}` };
    return { status: "sent", providerId: json.sid };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
};

/** Marketing texts must say how to stop. */
export function withOptOut(body: string): string {
  return /\bSTOP\b/i.test(body) ? body : `${body.trim()} Reply STOP to opt out.`;
}

/** Local hours when marketing texts may go out (TCPA: 8am–9pm; we keep
 *  a margin). */
export const SEND_WINDOW = { startHour: 10, endHour: 20 };
