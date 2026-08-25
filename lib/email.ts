import { Resend } from "resend";

/**
 * Outbound mail.
 *
 * Everything here degrades to a log line when RESEND_API_KEY is unset,
 * so the app runs end to end in development and in a fresh deploy
 * before any account exists. A failed send never throws into a request
 * handler either: a client who has just written twenty comments should
 * see "submitted", because the comments are already in the database —
 * the email is a notification, not the record.
 */
const FROM = process.env.MAIL_FROM ?? "The Pass <onboarding@resend.dev>";
const TO = process.env.STUDIO_EMAIL ?? "nelson.schnebelen@gmail.com";

function client() {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

export async function sendMail(opts: {
  to?: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const resend = client();
  const to = opts.to ?? TO;

  if (!resend) {
    console.info(`[mail:skipped] to=${to} subject=${opts.subject}`);
    return { ok: false, skipped: true };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: opts.subject,
      text: opts.text,
    });
    if (error) {
      console.error("[mail:error]", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[mail:threw]", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export const mailConfigured = () => Boolean(process.env.RESEND_API_KEY);
export const studioEmail = () => TO;
