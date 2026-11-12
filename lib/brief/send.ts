import type { Sql } from "postgres";
import { sendMail } from "../email";
import { sendSms, type SmsResult } from "../messaging/sms";
import { localDate, localTime, minutesOf } from "../reservations/time";
import type { Tenant } from "../platform/tenant";
import { buildMorningPass, longDay, renderMorningPassText } from "./index";

/**
 * Sends the morning pass to each restaurant that turned it on, at its own
 * local send time, once a day. Run hourly (/api/jobs/brief).
 *
 *  - Due from the send time until three hours after it, in the venue's
 *    timezone, so an hourly clock never misses it and a late run doesn't
 *    send a "morning" brief at dinner.
 *  - The day is claimed (brief_sends, unique per org and local date)
 *    before anything goes out: overlapping runs can't send it twice.
 *  - Recipients are read from the team again at send time: someone
 *    removed from the team stops getting it.
 *  - With no email or SMS provider configured the send is a dry run,
 *    recorded like any other.
 */

export type BriefSender = (to: string, subject: string, text: string) => Promise<SmsResult>;

export const emailBrief: BriefSender = async (to, subject, text) => {
  const r = await sendMail({ to, subject, text });
  if (r.ok) return { status: "sent", providerId: "" };
  return r.skipped ? { status: "dry_run" } : { status: "failed", error: r.error ?? "Email failed." };
};

export const smsBrief: BriefSender = (to, _subject, text) => sendSms(to, text);

/** How long after the send time a missed brief still goes out. */
export const DUE_FOR_MINUTES = 180;

/** Is a brief set for `sendAt` ("HH:MM") due at local time `nowLocal` ("HH:MM")? */
export function briefDue(sendAt: string, nowLocal: string): boolean {
  const diff = minutesOf(nowLocal) - minutesOf(sendAt.slice(0, 5));
  return diff >= 0 && diff < DUE_FOR_MINUTES;
}

export interface BriefRunResult { due: number; sent: number; dryRun: number; failed: number; alreadySent: number }

export async function sendDueBriefs(
  sql: Sql,
  baseUrl: string,
  now = new Date(),
  senders: { email: BriefSender; sms: BriefSender } = { email: emailBrief, sms: smsBrief },
): Promise<BriefRunResult> {
  const out: BriefRunResult = { due: 0, sent: 0, dryRun: 0, failed: 0, alreadySent: 0 };
  const orgs = await sql<{ org_id: string; slug: string; send_at: string; channel: "email" | "sms"; recipients: string[]; tz: string | null }[]>`
    select b.org_id, o.slug, b.send_at::text as send_at, b.channel, b.recipients,
           (select v.timezone from venues v where v.org_id = b.org_id order by v.created_at, v.name limit 1) as tz
    from brief_settings b join orgs o on o.id = b.org_id
    where b.enabled`;

  for (const o of orgs) {
    if (!o.tz || !briefDue(o.send_at, localTime(now, o.tz))) continue;
    out.due++;
    const day = localDate(now, o.tz);
    const [claim] = await sql<{ id: string }[]>`
      insert into brief_sends (org_id, local_date, channel) values (${o.org_id}, ${day}, ${o.channel})
      on conflict (org_id, local_date) do nothing returning id`;
    if (!claim) { out.alreadySent++; continue; }

    // The job reads for the whole org; the brief only ever reads.
    const tenant: Tenant = { orgId: o.org_id, actor: "agent:brief", role: "viewer", venueIds: null };
    const brief = await buildMorningPass(sql, tenant, now);
    const team = await sql<{ email: string; phone: string | null }[]>`
      select lower(email) as email, phone from org_members
      where org_id = ${o.org_id} and lower(email) = any(${o.recipients.map((e) => e.toLowerCase())})`;
    const home = `${baseUrl}/r/${o.slug}`;
    const results: { member: string; status: SmsResult["status"]; error?: string }[] = [];
    let body = "";
    if (brief) {
      body = renderMorningPassText(brief, home, { short: o.channel === "sms" });
      const subject = `Your morning pass — ${longDay(brief.date)}`;
      for (const m of team) {
        const to = o.channel === "sms" ? m.phone : m.email;
        if (!to) { results.push({ member: m.email, status: "failed", error: "No mobile number on the team record." }); continue; }
        const r = await senders[o.channel](to, subject, body);
        results.push({ member: m.email, status: r.status, ...(r.status === "failed" ? { error: r.error } : {}) });
      }
    }
    const count = (s: string) => results.filter((r) => r.status === s).length;
    const status = !results.length ? "failed"
      : count("sent") === results.length ? "sent"
      : count("dry_run") === results.length ? "dry_run"
      : count("failed") === results.length ? "failed" : "partial";
    await sql`update brief_sends set status = ${status}, recipients = ${sql.json(results as never)}, body = ${body} where id = ${claim.id}`;
    out.sent += count("sent"); out.dryRun += count("dry_run"); out.failed += count("failed") + (results.length ? 0 : 1);
  }
  return out;
}
