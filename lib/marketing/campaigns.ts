import type { Sql } from "postgres";
import { sendGuestSms, textable } from "../agent-runtime/agents/reservations";
import type { AgentContext } from "../agent-runtime/tool";
import { integrationsKeyConfigured } from "../integrations/secrets";
import { emailable, sendEmail, sendEmailCampaign, type EmailSender } from "../messaging/email";
import { sendSms, type SmsSender } from "../messaging/sms";
import { consentFilter } from "../platform/audiences";
import { assertCan, can, type MemberRole, type Tenant } from "../platform/tenant";
import { log } from "../reservations/repo";
import { zonedToUtc } from "../reservations/time";
import { getSegment, segmentMemberIds } from "./segments";

/**
 * Campaigns: one text or email to one segment.
 *
 * Anyone with message_guests can draft one; agents can draft one too
 * (created_by agent:<id>), but only a person sends or schedules it. A
 * send goes through the same code as every other marketing message —
 * the Reservations agent's send_guest_sms tool for texts, the email
 * campaign sender for email — so consent, opt-outs, the once-a-week cap,
 * texting hours and the STOP line are checked in one place, at the
 * moment of sending. With no Twilio or Resend keys every message is
 * recorded as a dry run and nothing leaves.
 */

export type Channel = "sms" | "email";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";

export interface Campaign {
  id: string; name: string; channel: Channel; segment: string; segment_name: string;
  subject: string | null; body: string; status: CampaignStatus;
  scheduled_for: Date | null; scheduled_by: string | null; sent_at: Date | null; sent_by: string | null;
  skipped: number; last_error: string | null; created_by: string; requested_by: string | null;
  created_at: Date; updated_at: Date;
}

export const CAMPAIGN_STATUS: Record<CampaignStatus, { text: string; tone: string }> = {
  draft: { text: "Draft", tone: "" },
  scheduled: { text: "Scheduled", tone: "info" },
  sending: { text: "Sending", tone: "warn" },
  sent: { text: "Sent", tone: "go" },
  failed: { text: "Failed", tone: "stop" },
};

export const SMS_MAX = 300;
const SMS_CHUNK = 200; // send_guest_sms takes at most 200 recipients a call
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = 86_400_000;

export { smsParts } from "./sms-count";

/* ------------------------------------------------------------ drafts -- */

export interface DraftInput { id?: string; name: string; channel: string; segment: string; subject?: string; body: string }

export async function saveDraft(
  sql: Sql, t: Tenant, input: DraftInput, opts: { createdBy?: string } = {},
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  assertCan(t, "message_guests");
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 100);
  const channel: Channel | null = input.channel === "sms" || input.channel === "email" ? input.channel : null;
  const body = input.body.trim();
  const subject = (input.subject ?? "").trim().slice(0, 120) || null;
  if (!name) return { ok: false, error: "Give the campaign a name." };
  if (!channel) return { ok: false, error: "Pick text or email." };
  const seg = await getSegment(sql, t, input.segment);
  if (!seg) return { ok: false, error: "Pick a segment." };
  if (!body) return { ok: false, error: "Write the message." };
  if (channel === "sms" && body.length > SMS_MAX) return { ok: false, error: `Keep texts under ${SMS_MAX} characters.` };
  if (channel === "email" && !subject) return { ok: false, error: "An email needs a subject." };
  if (channel === "email" && (body.length < 10 || body.length > 5000)) return { ok: false, error: "An email message is 10 to 5,000 characters." };

  if (input.id) {
    if (!UUID.test(input.id)) return { ok: false, error: "Campaign not found." };
    const rows = await sql<{ id: string }[]>`
      update campaigns set name = ${name}, channel = ${channel}, segment = ${seg.id}, segment_name = ${seg.name},
        subject = ${channel === "email" ? subject : null}, body = ${body}, updated_at = now()
      where id = ${input.id} and org_id = ${t.orgId} and status = 'draft' returning id`;
    if (!rows.length) return { ok: false, error: "Only a draft can be edited. Unschedule it first." };
    await log(sql, t.orgId, t.actor, "campaign.edited", "campaign", input.id, { name, channel, segment: seg.name });
    return { ok: true, id: input.id };
  }
  const createdBy = opts.createdBy ?? t.actor;
  const [c] = await sql<{ id: string }[]>`
    insert into campaigns (org_id, name, channel, segment, segment_name, subject, body, created_by, requested_by)
    values (${t.orgId}, ${name}, ${channel}, ${seg.id}, ${seg.name}, ${channel === "email" ? subject : null}, ${body},
            ${createdBy}, ${createdBy === t.actor ? null : t.actor})
    returning id`;
  await log(sql, t.orgId, createdBy, "campaign.drafted", "campaign", c.id, { name, channel, segment: seg.name, ...(createdBy !== t.actor ? { requestedBy: t.actor } : {}) });
  return { ok: true, id: c.id };
}

export async function deleteDraft(sql: Sql, t: Tenant, id: string): Promise<boolean> {
  assertCan(t, "message_guests");
  if (!UUID.test(id)) return false;
  const rows = await sql<{ name: string }[]>`delete from campaigns where id = ${id} and org_id = ${t.orgId} and status = 'draft' returning name`;
  if (rows.length) await log(sql, t.orgId, t.actor, "campaign.deleted", "campaign", id, { name: rows[0].name });
  return rows.length > 0;
}

/* ------------------------------------------------------------- reads -- */

export async function listCampaigns(sql: Sql, t: Tenant): Promise<(Campaign & { messages: number })[]> {
  assertCan(t, "view");
  return sql<(Campaign & { messages: number })[]>`
    select c.*, (select count(*)::int from guest_messages m where m.campaign_id = c.id and m.org_id = c.org_id) as messages
    from campaigns c where c.org_id = ${t.orgId} order by c.created_at desc limit 200`;
}

export async function getCampaign(sql: Sql, t: Tenant, id: string): Promise<Campaign | null> {
  assertCan(t, "view");
  if (!UUID.test(id)) return null;
  const [c] = await sql<Campaign[]>`select * from campaigns where id = ${id} and org_id = ${t.orgId}`;
  return c ?? null;
}

/**
 * Who a send would reach right now: the segment's members, then those
 * with consent for the channel, then those not already sent a campaign
 * in the last week. `recipients` is exactly who would receive it.
 */
export interface Reach { members: number; consented: number; recentlyMessaged: number; recipients: string[] }

export async function reach(sql: Sql, t: Tenant, segment: string, channel: Channel, now = new Date()): Promise<Reach | null> {
  assertCan(t, "view");
  const seg = await getSegment(sql, t, segment);
  if (!seg) return null;
  const ids = await segmentMemberIds(sql, t, seg.rules, now);
  if (!ids.length) return { members: 0, consented: 0, recentlyMessaged: 0, recipients: [] };
  const [{ consented }] = await sql<{ consented: number }[]>`
    select count(*)::int as consented from guests g where g.org_id = ${t.orgId} and g.id = any(${ids}::uuid[])
      and ${consentFilter(sql, channel)}`;
  const ok = channel === "sms"
    ? (await textable(agentCtx(sql, t, now), ids)).map((g) => g.id)
    : (await emailable(sql, t.orgId, ids, now)).map((g) => g.id);
  return { members: ids.length, consented, recentlyMessaged: consented - ok.length, recipients: ok };
}

const agentCtx = (sql: Sql, tenant: Tenant, now: Date): AgentContext => ({ sql, tenant, agentId: "campaigns", runId: null, now });

/* ------------------------------------------------------------- sends -- */

export interface SendOptions {
  now?: Date;
  /** The number of recipients the person confirmed. A different count
   *  now means the audience moved; nothing is sent. */
  expected?: number;
  baseUrl: string;
  smsSender?: SmsSender;
  emailSender?: EmailSender;
}

export type SendResult =
  | { ok: true; sent: number; dry_run: number; failed: number; skipped: number }
  | { ok: false; error: string; later?: boolean };

async function venueTimezone(sql: Sql, orgId: string) {
  const [v] = await sql<{ timezone: string }[]>`select timezone from venues where org_id = ${orgId} order by created_at limit 1`;
  return v?.timezone ?? "America/New_York";
}

/** Send a draft or scheduled campaign now. Needs message_guests. */
export async function sendNow(sql: Sql, t: Tenant, id: string, opts: SendOptions): Promise<SendResult> {
  assertCan(t, "message_guests");
  const now = opts.now ?? new Date();
  const c = await getCampaign(sql, t, id);
  if (!c) return { ok: false, error: "Campaign not found." };
  if (c.status !== "draft" && c.status !== "scheduled") return { ok: false, error: "This campaign has already gone out." };
  if (c.channel === "email" && !integrationsKeyConfigured() && process.env.RESEND_API_KEY) {
    return { ok: false, error: "Email campaigns need INTEGRATIONS_KEY set, for the unsubscribe links." };
  }
  const r = await reach(sql, t, c.segment, c.channel, now);
  if (!r) return { ok: false, error: "The segment for this campaign was deleted. Edit it and pick another." };
  if (opts.expected !== undefined && opts.expected !== r.recipients.length) {
    return { ok: false, error: `The audience changed: it's ${r.recipients.length} guests now, not ${opts.expected}. Check the new count and confirm again.` };
  }
  if (r.recipients.length === 0) return { ok: false, error: "Nobody in this segment can receive it right now: no consent on record, opted out, or already sent a campaign this week." };

  const ctx = agentCtx(sql, t, now);
  const tool = sendGuestSms(opts.smsSender ?? sendSms, c.id);
  if (c.channel === "sms") {
    // The texting-hours rule and the rest of the tool's hard rules, before
    // anything is claimed, so a refused send leaves the campaign as it was.
    const check = await tool.check!(ctx, { guest_ids: r.recipients.slice(0, SMS_CHUNK), message: c.body, rationale: "" }, "execute");
    if (!check.ok) return { ok: false, error: check.reason, later: check.later };
  }

  // Claim it: only one sender ever gets past this line.
  const claimed = await sql`
    update campaigns set status = 'sending', sent_at = ${now}, sent_by = ${t.actor}, updated_at = now()
    where id = ${c.id} and org_id = ${t.orgId} and status in ('draft', 'scheduled') returning id`;
  if (!claimed.length) return { ok: false, error: "This campaign has already gone out." };

  const tally = { sent: 0, dry_run: 0, failed: 0, skipped: r.members - r.recipients.length };
  try {
    if (c.channel === "sms") {
      for (let i = 0; i < r.recipients.length; i += SMS_CHUNK) {
        const chunk = r.recipients.slice(i, i + SMS_CHUNK);
        const out = (await tool.run(ctx, { guest_ids: chunk, message: c.body, rationale: `Campaign “${c.name}”` })) as typeof tally;
        tally.sent += out.sent; tally.dry_run += out.dry_run; tally.failed += out.failed; tally.skipped += out.skipped;
      }
    } else {
      const out = await sendEmailCampaign(sql, {
        orgId: t.orgId, actor: t.actor, guestIds: r.recipients, subject: c.subject ?? "", body: c.body, baseUrl: opts.baseUrl, campaignId: c.id,
      }, opts.emailSender ?? sendEmail);
      tally.sent += out.sent; tally.dry_run += out.dry_run; tally.failed += out.failed; tally.skipped += out.skipped;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sql`update campaigns set status = 'failed', last_error = ${message.slice(0, 500)}, updated_at = now() where id = ${c.id} and org_id = ${t.orgId}`;
    await log(sql, t.orgId, t.actor, "campaign.failed", "campaign", c.id, { error: message.slice(0, 200) });
    return { ok: false, error: "Sending stopped part way. What went out is in the results." };
  }
  await sql`update campaigns set status = 'sent', skipped = ${tally.skipped}, last_error = null, updated_at = now() where id = ${c.id} and org_id = ${t.orgId}`;
  await log(sql, t.orgId, t.actor, "campaign.sent", "campaign", c.id, { name: c.name, channel: c.channel, segment: c.segment_name, ...tally });
  return { ok: true, ...tally };
}

/** Schedule a draft. `when` is "yyyy-mm-ddTHH:MM" in the restaurant's time. */
export async function schedule(sql: Sql, t: Tenant, id: string, when: string, now = new Date()): Promise<{ ok: true; at: Date } | { ok: false; error: string }> {
  assertCan(t, "message_guests");
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(when.trim());
  if (!m) return { ok: false, error: "Pick a date and time." };
  const at = zonedToUtc(m[1], m[2], await venueTimezone(sql, t.orgId));
  if (at.getTime() < now.getTime() + 5 * 60_000) return { ok: false, error: "Pick a time at least five minutes from now." };
  if (at.getTime() > now.getTime() + 90 * DAY) return { ok: false, error: "Campaigns can be scheduled up to 90 days ahead." };
  const rows = await sql`
    update campaigns set status = 'scheduled', scheduled_for = ${at}, scheduled_by = ${t.actor}, scheduled_role = ${t.role}, updated_at = now()
    where id = ${id} and org_id = ${t.orgId} and status in ('draft', 'scheduled') returning id`;
  if (!rows.length) return { ok: false, error: "Only a draft can be scheduled." };
  await log(sql, t.orgId, t.actor, "campaign.scheduled", "campaign", id, { at: at.toISOString() });
  return { ok: true, at };
}

export async function unschedule(sql: Sql, t: Tenant, id: string): Promise<boolean> {
  assertCan(t, "message_guests");
  if (!UUID.test(id)) return false;
  const rows = await sql`
    update campaigns set status = 'draft', scheduled_for = null, scheduled_by = null, scheduled_role = null, updated_at = now()
    where id = ${id} and org_id = ${t.orgId} and status = 'scheduled' returning id`;
  if (rows.length) await log(sql, t.orgId, t.actor, "campaign.unscheduled", "campaign", id);
  return rows.length > 0;
}

/**
 * The hourly job: send every scheduled campaign that is due, once.
 * It runs as the person who scheduled it — they confirmed the send. A
 * text that falls outside texting hours waits for the next run; one
 * that can't go at all is marked failed with the reason.
 */
export async function runDueCampaigns(
  sql: Sql, opts: Omit<SendOptions, "expected">,
): Promise<{ id: string; org: string; result: SendResult }[]> {
  const now = opts.now ?? new Date();
  const due = await sql<{ id: string; org_id: string; scheduled_by: string | null; scheduled_role: string | null; created_by: string }[]>`
    select id, org_id, scheduled_by, scheduled_role, created_by from campaigns
    where status = 'scheduled' and scheduled_for <= ${now} order by scheduled_for limit 50`;
  const out: { id: string; org: string; result: SendResult }[] = [];
  for (const c of due) {
    // Send with the scheduler's permissions as they are now, not as they
    // were when it was scheduled: someone removed from the team, or moved
    // to a role that can't message guests, can't send by waiting.
    const actor = c.scheduled_by ?? c.created_by;
    const [m] = await sql<{ role: MemberRole; venue_ids: string[] | null }[]>`
      select role, venue_ids from org_members where org_id = ${c.org_id} and lower(email) = lower(${actor})`;
    // The Pass's own staff aren't team members; they keep the staff role.
    const tenant: Tenant | null = m ? { orgId: c.org_id, actor, role: m.role, venueIds: m.venue_ids }
      : c.scheduled_role === "staff" ? { orgId: c.org_id, actor, role: "staff", venueIds: null } : null;
    let result: SendResult;
    try {
      if (!tenant || !can(tenant, "message_guests")) throw new Error(`${actor} can no longer send messages for this restaurant, so the scheduled campaign wasn't sent.`);
      result = await sendNow(sql, tenant, c.id, { ...opts, now });
    } catch (err) {
      result = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
    if (!result.ok && !result.later) {
      await sql`update campaigns set status = 'failed', last_error = ${result.error.slice(0, 500)}, updated_at = now()
                where id = ${c.id} and org_id = ${c.org_id} and status = 'scheduled'`;
    }
    out.push({ id: c.id, org: c.org_id, result });
  }
  return out;
}

/* ----------------------------------------------------------- results -- */

export interface CampaignResults {
  recipients: number; sent: number; dryRun: number; failed: number; skipped: number;
  optedOutSince: number;
  /** Recipients who booked or ordered within 7 days of the send. Not
   *  proof the campaign caused it. */
  cameBack: { guests: number; bookings: number; orders: number; orderCents: number };
}

export async function campaignResults(sql: Sql, t: Tenant, c: Campaign): Promise<CampaignResults | null> {
  assertCan(t, "view");
  if (!c.sent_at) return null;
  const until = new Date(c.sent_at.getTime() + 7 * DAY);
  const [r] = await sql<{ recipients: number; sent: number; dry_run: number; failed: number; opted_out: number; came_back: number; bookings: number; orders: number; order_cents: number }[]>`
    with rec as (
      select distinct m.guest_id from guest_messages m where m.campaign_id = ${c.id} and m.org_id = ${t.orgId}
    ), b as (
      select r.guest_id, count(*)::int as n from reservations r join rec on rec.guest_id = r.guest_id
      where r.org_id = ${t.orgId} and r.created_at >= ${c.sent_at} and r.created_at < ${until} and r.status <> 'cancelled'
      group by r.guest_id
    ), o as (
      select o.guest_id, count(*)::int as n, sum(o.total_cents)::int as cents from orders o join rec on rec.guest_id = o.guest_id
      where o.org_id = ${t.orgId} and o.created_at >= ${c.sent_at} and o.created_at < ${until}
        and o.status not in ('cancelled', 'awaiting_payment')
      group by o.guest_id
    )
    select
      (select count(*)::int from guest_messages where campaign_id = ${c.id} and org_id = ${t.orgId}) as recipients,
      (select count(*)::int from guest_messages where campaign_id = ${c.id} and org_id = ${t.orgId} and status = 'sent') as sent,
      (select count(*)::int from guest_messages where campaign_id = ${c.id} and org_id = ${t.orgId} and status = 'dry_run') as dry_run,
      (select count(*)::int from guest_messages where campaign_id = ${c.id} and org_id = ${t.orgId} and status = 'failed') as failed,
      (select count(*)::int from guests g join rec on rec.guest_id = g.id where g.org_id = ${t.orgId}
         and ${c.channel === "sms" ? sql`g.sms_opted_out_at >= ${c.sent_at}` : sql`g.email_opted_out_at >= ${c.sent_at}`}) as opted_out,
      (select count(*)::int from (select guest_id from b union select guest_id from o) x) as came_back,
      (select coalesce(sum(n), 0)::int from b) as bookings,
      (select coalesce(sum(n), 0)::int from o) as orders,
      (select coalesce(sum(cents), 0)::int from o) as order_cents`;
  return {
    recipients: r.recipients, sent: r.sent, dryRun: r.dry_run, failed: r.failed, skipped: c.skipped,
    optedOutSince: r.opted_out,
    cameBack: { guests: r.came_back, bookings: r.bookings, orders: r.orders, orderCents: r.order_cents },
  };
}
