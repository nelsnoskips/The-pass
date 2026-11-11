import { sendSms, SEND_WINDOW, withOptOut, type SmsSender } from "../../messaging/sms";
import { log } from "../../reservations/repo";
import { localDate, localTime, weekday, zonedToUtc } from "../../reservations/time";
import type { AgentSpec } from "../runner";
import { defineTool, type AgentContext, type ToolDef } from "../tool";

/**
 * Reservations Agent: looks ahead at the book, finds the quiet shifts,
 * and proposes filling them from the restaurant's own guest list.
 *
 * It reads freely. It never texts anyone on its own: a marketing SMS is
 * always a proposal, only ever goes to guests with recorded consent, at
 * most once a week each, and only inside the sending window.
 */

const MAX_RECIPIENTS = 200;
const MAX_SMS_CHARS = 300;
const MARKETING_GAP_DAYS = 7;

async function venueTimezone(ctx: AgentContext): Promise<string> {
  const [v] = await ctx.sql<{ timezone: string }[]>`
    select timezone from venues where org_id = ${ctx.tenant.orgId} order by created_at limit 1`;
  return v?.timezone ?? "America/New_York";
}

const bookingsOutlook = defineTool<{ days: number }>({
  name: "get_bookings_outlook",
  description:
    "Covers booked versus seats, per day, for the coming days across the restaurant's venues. Use it first to see which upcoming days are quiet. Returns one row per venue per day with the weekday, whether the venue takes bookings that day, covers booked, number of bookings, and total seats.",
  inputSchema: {
    type: "object",
    properties: { days: { type: "integer", enum: [3, 7, 14], description: "How many days ahead to look, starting tomorrow." } },
    required: ["days"],
    additionalProperties: false,
  },
  tier: "auto",
  requires: "view",
  async run(ctx, { days }) {
    const { sql, tenant } = ctx;
    const venues = await sql<{ id: string; name: string; timezone: string }[]>`
      select id, name, timezone from venues where org_id = ${tenant.orgId} order by name`;
    const out: Record<string, unknown>[] = [];
    for (const v of venues) {
      const [{ seats }] = await sql<{ seats: number }[]>`
        select coalesce(sum(max_covers), 0)::int as seats from dining_tables
        where venue_id = ${v.id} and org_id = ${tenant.orgId} and active`;
      const periods = await sql<{ days_of_week: number[] }[]>`
        select days_of_week from service_periods where venue_id = ${v.id} and org_id = ${tenant.orgId}`;
      const today = localDate(ctx.now, v.timezone);
      for (let i = 1; i <= days; i++) {
        const date = addDays(today, i);
        const from = zonedToUtc(date, "00:00", v.timezone);
        const to = new Date(from.getTime() + 24 * 3_600_000);
        const [b] = await sql<{ covers: number; bookings: number }[]>`
          select coalesce(sum(party_size), 0)::int as covers, count(*)::int as bookings
          from reservations
          where venue_id = ${v.id} and org_id = ${tenant.orgId}
            and status in ('booked', 'confirmed', 'seated')
            and starts_at >= ${from} and starts_at < ${to}`;
        const dow = weekday(date);
        out.push({
          venue: v.name, date,
          weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow],
          open: periods.some((p) => p.days_of_week.map(Number).includes(dow)),
          coversBooked: b.covers, bookings: b.bookings, seats,
        });
      }
    }
    return out;
  },
});

const lapsedGuests = defineTool<{ min_visits: number; lapsed_days: number }>({
  name: "find_lapsed_guests",
  description:
    "Regulars who haven't been in for a while and can be texted: at least min_visits completed visits, none in the last lapsed_days, with SMS marketing consent on record, not opted out, and not sent a promotion in the last week. Returns up to 200 guests (id, first name, visits, days since last visit) plus how many otherwise-matching guests were left out for lack of consent.",
  inputSchema: {
    type: "object",
    properties: {
      min_visits: { type: "integer", enum: [1, 2, 3, 5], description: "Minimum completed visits." },
      lapsed_days: { type: "integer", enum: [30, 45, 60, 90], description: "No visit in at least this many days." },
    },
    required: ["min_visits", "lapsed_days"],
    additionalProperties: false,
  },
  tier: "auto",
  requires: "view",
  async run(ctx, { min_visits, lapsed_days }) {
    const { sql, tenant } = ctx;
    const cutoff = new Date(ctx.now.getTime() - lapsed_days * 86_400_000);
    const recent = new Date(ctx.now.getTime() - MARKETING_GAP_DAYS * 86_400_000);
    const rows = await sql<{ id: string; name: string; visit_count: number; last_visit_at: Date; textable: boolean }[]>`
      select g.id, g.name, g.visit_count, g.last_visit_at,
             (g.sms_consent_at is not null and g.sms_opted_out_at is null
              and not exists (select 1 from guest_messages m
                              where m.guest_id = g.id and m.kind = 'marketing' and m.created_at > ${recent})) as textable
      from guests g
      where g.org_id = ${tenant.orgId} and g.visit_count >= ${min_visits}
        and g.last_visit_at is not null and g.last_visit_at < ${cutoff}
      order by g.visit_count desc, g.last_visit_at desc`;
    const textable = rows.filter((r) => r.textable).slice(0, MAX_RECIPIENTS);
    return {
      guests: textable.map((r) => ({
        id: r.id,
        firstName: r.name.split(" ")[0],
        visits: r.visit_count,
        daysSinceLastVisit: Math.floor((ctx.now.getTime() - r.last_visit_at.getTime()) / 86_400_000),
      })),
      leftOutNoConsentOrRecentlyTexted: rows.length - rows.filter((r) => r.textable).length,
    };
  },
});

export function sendGuestSms(sender: SmsSender = sendSms): ToolDef {
  return defineTool<{ guest_ids: string[]; message: string; rationale: string }>({
    name: "send_guest_sms",
    description:
      "Send one marketing text to a list of guests (ids from find_lapsed_guests). The same message goes to everyone; write it in the restaurant's voice, under 300 characters, with a specific reason to come in and a specific day. Do not include an opt-out line; it is added automatically. Put why this group and why now in rationale; the owner reads it when deciding.",
    inputSchema: {
      type: "object",
      properties: {
        guest_ids: { type: "array", items: { type: "string" }, description: "Guest ids to text." },
        message: { type: "string", description: "The text message body." },
        rationale: { type: "string", description: "Why these guests, why now, in one or two sentences with the numbers." },
      },
      required: ["guest_ids", "message", "rationale"],
      additionalProperties: false,
    },
    tier: "approve",
    requires: "message_guests",
    title: (i) => `Text ${i.guest_ids.length} guest${i.guest_ids.length === 1 ? "" : "s"}: “${i.message.slice(0, 60)}${i.message.length > 60 ? "…" : ""}”`,
    async check(ctx, input, phase) {
      const ids = Array.isArray(input.guest_ids) ? input.guest_ids : [];
      const message = typeof input.message === "string" ? input.message.trim() : "";
      if (ids.length === 0) return { ok: false, reason: "No recipients." };
      if (ids.length > MAX_RECIPIENTS) return { ok: false, reason: `At most ${MAX_RECIPIENTS} recipients per message.` };
      if (!message) return { ok: false, reason: "The message is empty." };
      if (message.length > MAX_SMS_CHARS) return { ok: false, reason: `Keep the message under ${MAX_SMS_CHARS} characters.` };
      if ((await textable(ctx, ids)).length === 0) {
        return { ok: false, reason: "None of these guests can be texted: no marketing consent on record, opted out, or already texted this week." };
      }
      if (phase === "execute") {
        const hour = Number(localTime(ctx.now, await venueTimezone(ctx)).slice(0, 2));
        if (hour < SEND_WINDOW.startHour || hour >= SEND_WINDOW.endHour) {
          return { ok: false, reason: `Outside the sending window (${SEND_WINDOW.startHour}:00–${SEND_WINDOW.endHour}:00 local). Approve it during the day.` };
        }
      }
      return { ok: true };
    },
    async run(ctx, input) {
      const { sql, tenant } = ctx;
      // Consent is read again at the moment of sending, not trusted from
      // when the list was drawn up.
      const recipients = await textable(ctx, input.guest_ids);
      const body = withOptOut(input.message);
      const tally = { sent: 0, dry_run: 0, failed: 0, skipped: input.guest_ids.length - recipients.length };
      for (const g of recipients) {
        const r = await sender(g.phone, body);
        tally[r.status]++;
        await sql`
          insert into guest_messages (org_id, guest_id, kind, body, status, provider_id, error, sent_by)
          values (${tenant.orgId}, ${g.id}, 'marketing', ${body}, ${r.status},
                  ${r.status === "sent" ? r.providerId : null}, ${r.status === "failed" ? r.error : null}, ${tenant.actor})`;
      }
      await log(sql, tenant.orgId, tenant.actor, "guests.sms_marketing", "guest_messages", null, { ...tally, body });
      return tally;
    },
  });
}

/** Of these guests, the ones who may receive a marketing text right now. */
async function textable(ctx: AgentContext, ids: string[]): Promise<{ id: string; phone: string }[]> {
  const uuids = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (uuids.length === 0) return [];
  const recent = new Date(ctx.now.getTime() - MARKETING_GAP_DAYS * 86_400_000);
  return ctx.sql<{ id: string; phone: string }[]>`
    select g.id, g.phone from guests g
    where g.org_id = ${ctx.tenant.orgId} and g.id = any(${uuids}::uuid[])
      and g.phone like '+%'
      and g.sms_consent_at is not null and g.sms_opted_out_at is null
      and not exists (select 1 from guest_messages m
                      where m.guest_id = g.id and m.kind = 'marketing' and m.created_at > ${recent})`;
}

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function reservationsAgent(sender?: SmsSender): AgentSpec {
  return {
    id: "reservations",
    name: "Reservations Agent",
    effort: "medium",
    system: `You are the Reservations Agent for a restaurant, working inside The Pass. Your job is to keep the dining room full using the restaurant's own guest list, so it doesn't depend on booking networks that charge per cover.

Each run, look at the bookings for the days ahead and decide whether any open day is quiet enough to act on. A day is worth acting on when it is open, at least two days away (so guests have time to plan), and booked well below the days around it or below roughly a third of its seats. Most runs, nothing needs doing — a normal week is not a problem to fix, and guests who are texted too often stop reading. Saying "nothing to do this week" is a good outcome.

When a day does need help, find lapsed regulars and propose one text for one day. Write it the way a good host would: short, warm, specific about the day, with a real reason to come in. Offer a discount only if the owner's notes say they want that; an invitation is usually enough. Never invent menu items, events or offers you weren't told about.

You can read bookings and guests freely. Texting guests always goes to the owner for approval first, and only guests with marketing consent on record can be included — the tools enforce both. If a tool refuses something, don't look for another way to do it; report what was refused and why.

Finish with a short summary for the owner in plain language: what the week looks like, what you proposed and why (with the numbers), or why you proposed nothing.`,
    tools: [bookingsOutlook, lapsedGuests, sendGuestSms(sender)],
  };
}
