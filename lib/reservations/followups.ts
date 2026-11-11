import type { Sql } from "postgres";
import { sendSms, type SmsSender } from "../messaging/sms";
import { formatWhen } from "../sites/format";
import { availableSlots, normalizePhone } from "./repo";
import { localDate } from "./time";

/**
 * The messages that follow a booking: the reminder before it, and the
 * waitlist text when a table opens. All transactional — about a guest's
 * own booking or their own request — and all recorded in guest_messages.
 */

/** Look this far ahead for bookings to remind. */
const REMIND_FROM_HOURS = 20;
const REMIND_TO_HOURS = 28;

/**
 * Text everyone whose booking starts 20–28 hours from now and hasn't had
 * a reminder. Run hourly; each booking is reminded once, and the guest's
 * one-tap link is in the text, before any cancellation cut-off.
 */
export async function sendDueReminders(
  sql: Sql,
  baseUrl: string,
  now = new Date(),
  sender: SmsSender = sendSms,
): Promise<{ sent: number }> {
  const from = new Date(now.getTime() + REMIND_FROM_HOURS * 3_600_000);
  const to = new Date(now.getTime() + REMIND_TO_HOURS * 3_600_000);
  // Claim the batch first, so two overlapping runs can't double-text.
  const due = await sql<{
    id: string; org_id: string; guest_id: string; phone: string; party_size: number;
    starts_at: Date; manage_token: string; timezone: string; slug: string | null; restaurant: string;
  }[]>`
    with claimed as (
      update reservations r set reminder_sent_at = ${now}
      where r.status in ('booked', 'confirmed') and r.reminder_sent_at is null
        and r.starts_at >= ${from} and r.starts_at < ${to}
        and exists (select 1 from guests g where g.id = r.guest_id and g.phone like '+%')
      returning r.id, r.org_id, r.guest_id, r.venue_id, r.party_size, r.starts_at, r.manage_token
    )
    select c.id, c.org_id, c.guest_id, g.phone, c.party_size, c.starts_at, c.manage_token,
           v.timezone, s.slug, o.name as restaurant
    from claimed c
    join guests g on g.id = c.guest_id
    join venues v on v.id = c.venue_id
    join orgs o on o.id = c.org_id
    left join sites s on s.venue_id = c.venue_id`;

  let sent = 0;
  for (const r of due) {
    const link = r.slug ? ` Can't make it? ${baseUrl}/s/${r.slug}/booking/${r.manage_token}` : "";
    const body = `${r.restaurant}: see you ${formatWhen(r.starts_at, r.timezone)}, table for ${r.party_size}.${link}`;
    const result = await sender(r.phone, body);
    await record(sql, r.org_id, r.guest_id, body, result);
    if (result.status !== "failed") sent++;
  }
  return { sent };
}

export type WaitlistJoin = { ok: true } | { ok: false; reason: "invalid_phone" | "invalid" };

export async function joinWaitlist(
  sql: Sql,
  input: { orgId: string; venueId: string; date: string; partySize: number; name: string; phone: string },
): Promise<WaitlistJoin> {
  const phone = normalizePhone(input.phone);
  if (!phone) return { ok: false, reason: "invalid_phone" };
  const name = input.name.trim().slice(0, 120);
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isInteger(input.partySize) || input.partySize < 1) {
    return { ok: false, reason: "invalid" };
  }
  await sql`
    insert into waitlist_requests (org_id, venue_id, name, phone, date, party_size)
    values (${input.orgId}, ${input.venueId}, ${name}, ${phone}, ${input.date}, ${input.partySize})
    on conflict (venue_id, phone, date) do update
      set party_size = excluded.party_size, name = excluded.name, status = 'waiting', notified_at = null`;
  return { ok: true };
}

/**
 * After a table frees up on a date, text waiting guests whose party now
 * fits, in the order they asked — at most three per opening, so a single
 * cancellation doesn't summon a crowd. First to book gets it.
 */
export async function notifyWaitlist(
  sql: Sql,
  input: { orgId: string; venueId: string; date: string; baseUrl: string; now?: Date },
  sender: SmsSender = sendSms,
): Promise<{ notified: number }> {
  const now = input.now ?? new Date();
  const [v] = await sql<{ timezone: string; restaurant: string; slug: string | null }[]>`
    select v.timezone, o.name as restaurant, s.slug
    from venues v join orgs o on o.id = v.org_id left join sites s on s.venue_id = v.id
    where v.id = ${input.venueId} and v.org_id = ${input.orgId}`;
  if (!v || !v.slug || input.date < localDate(now, v.timezone)) return { notified: 0 };

  const waiting = await sql<{ id: string; phone: string; party_size: number; name: string }[]>`
    select id, phone, party_size, name from waitlist_requests
    where venue_id = ${input.venueId} and org_id = ${input.orgId} and date = ${input.date} and status = 'waiting'
    order by created_at limit 20`;
  let notified = 0;
  for (const w of waiting) {
    if (notified >= 3) break;
    const slots = await availableSlots(sql, {
      orgId: input.orgId, venueId: input.venueId, date: input.date, partySize: w.party_size, channel: "online", now,
    });
    if (slots.length === 0) continue;
    const claimed = await sql`
      update waitlist_requests set status = 'notified', notified_at = ${now}
      where id = ${w.id} and status = 'waiting' returning id`;
    if (claimed.length === 0) continue;
    const day = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })
      .format(new Date(`${input.date}T12:00:00Z`));
    const body = `${v.restaurant}: a table for ${w.party_size} just opened on ${day}. First to book gets it: ${input.baseUrl}/s/${v.slug}/reserve?date=${input.date}&party=${w.party_size}`;
    const result = await sender(w.phone, body);
    const [g] = await sql<{ id: string }[]>`
      insert into guests (org_id, phone, name) values (${input.orgId}, ${w.phone}, ${w.name})
      on conflict (org_id, phone) do update set name = guests.name returning id`;
    await record(sql, input.orgId, g.id, body, result);
    notified++;
  }
  return { notified };
}

async function record(sql: Sql, orgId: string, guestId: string, body: string, result: Awaited<ReturnType<SmsSender>>) {
  await sql`
    insert into guest_messages (org_id, guest_id, kind, body, status, provider_id, error, sent_by)
    values (${orgId}, ${guestId}, 'transactional', ${body}, ${result.status},
            ${result.status === "sent" ? result.providerId : null},
            ${result.status === "failed" ? result.error : null}, 'system')`;
}

export { formatWhen };
