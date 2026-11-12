import type { Sql } from "postgres";
import { actionWords, stationName } from "../agent-runtime/catalog";
import { formatLever, lever } from "../levers";
import { smsConfigured } from "../messaging/sms";
import { getOrderingSettings } from "../ordering";
import { provider } from "../integrations/registry";
import { formatIn } from "../platform/when";
import { assertCan, type Tenant } from "../platform/tenant";
import { localDate, zonedToUtc } from "../reservations/time";

/**
 * The morning pass: the daily brief The Pass gives the owner — last
 * night, today, what's waiting for a decision, what it did yesterday,
 * and anything that needs attention. Shown at the top of Home, read by
 * the chat (get_morning_pass), and sent by email or text when an owner
 * turns that on (lib/brief/send.ts).
 *
 * Every day boundary is the venue's own midnight, never the server's.
 * A number that can't be known is null and renders "—", never 0 or $0:
 * the night before the restaurant joined, or online sales for a
 * restaurant that doesn't sell online.
 */

/** Statuses that count as a booking that's on (or was kept). */
const LIVE = ["booked", "confirmed", "seated", "completed"];
/** A party this size or larger is worth a heads-up. */
export const LARGE_PARTY = 6;
/** Words in booking or guest notes worth knowing before service. */
const NOTABLE = /birthday|anniversar|allerg|celiac|coeliac|gluten|nut\b|nuts\b|peanut|shellfish|dairy|vegan|vegetarian|wheelchair|high ?chair|propos|engage|vip/i;

export interface BriefParty { time: string; name: string; size: number; note?: string }

export interface MorningPass {
  org: { slug: string; name: string };
  venue: string;
  tz: string;
  /** Venue-local "yyyy-mm-dd". */
  date: string;
  lastNight: {
    date: string;
    covers: number | null; bookings: number | null; noShows: number | null; walkIns: number | null;
    onlineOrders: number | null; onlineSalesCents: number | null;
  };
  today: {
    bookings: number; covers: number;
    /** Today's covers against the average of the same weekday over the last four weeks; null with no history. */
    vsUsual: { usual: number; delta: number; weeks: number } | null;
    largeParties: BriefParty[];
    /** The first booking's time, "5:30 PM", or null. */
    firstBooking: string | null;
    notes: BriefParty[];
  };
  waiting: {
    count: number; proposals: number; changes: number;
    top: { title: string; href: string; from: string }[];
  };
  didYesterday: { station: string; text: string; at: Date }[];
  headsUps: { text: string; href: string }[];
}

const nextDay = (date: string, n = 1) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

const money = (c: unknown) => (typeof c === "number" && Number.isFinite(c) ? `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—");

/** One of a station's own change-log entries, in words. */
export function describeAction(action: string, detail: Record<string, unknown> = {}): string {
  const d = detail;
  switch (action) {
    case "guests.sms_marketing": {
      const n = Number(d.sent ?? 0) + Number(d.dry_run ?? 0);
      return `Texted ${n} guest${n === 1 ? "" : "s"}${Number(d.dry_run ?? 0) > 0 && !Number(d.sent ?? 0) ? " (recorded, not sent: texting is off)" : ""}`;
    }
    case "ads.budget_changed":
      return `Changed the ${d.name ?? "Google"} budget from ${money(d.from_cents)} to ${money(d.to_cents)} a day`;
    case "ads.campaign_paused": return `Paused ${d.name ?? "a Google campaign"}`;
    case "ads.negative_added": return typeof d.term === "string" ? `Blocked the search “${d.term}”` : "Blocked a wasted search";
    case "review.replied": return "Posted a reply to a Google review";
    case "site.version_saved": return "Saved a website draft for you to publish";
    case "campaign.drafted": return typeof d.name === "string" ? `Drafted the campaign “${d.name}”` : "Drafted a campaign";
    default: return actionWords(action);
  }
}

export async function buildMorningPass(sql: Sql, tenant: Tenant, now = new Date()): Promise<MorningPass | null> {
  assertCan(tenant, "view");
  const [o] = await sql<{ slug: string; name: string; created_at: Date }[]>`select slug, name, created_at from orgs where id = ${tenant.orgId}`;
  if (!o) return null;
  const venues = (await sql<{ id: string; name: string; timezone: string }[]>`
    select id, name, timezone from venues where org_id = ${tenant.orgId} order by created_at, name`)
    .filter((v) => tenant.venueIds === null || tenant.venueIds.includes(v.id));
  const venue = venues[0];
  if (!venue) return null;
  const tz = venue.timezone;
  const today = localDate(now, tz);
  const yesterday = nextDay(today, -1);
  const tStart = zonedToUtc(today, "00:00", tz), tEnd = zonedToUtc(nextDay(today), "00:00", tz);
  const yStart = zonedToUtc(yesterday, "00:00", tz);
  const bornDay = zonedToUtc(localDate(o.created_at, tz), "00:00", tz);
  const base = `/r/${o.slug}`;
  // The same weekday over the last four weeks, only days the restaurant was here for.
  const pastDays = [7, 14, 21, 28].map((n) => nextDay(today, -n))
    .map((d) => ({ d, start: zonedToUtc(d, "00:00", tz), end: zonedToUtc(nextDay(d), "00:00", tz) }))
    .filter((p) => p.start >= bornDay);

  const [night, nightOrders, todays, history, proposals, changes, agentLog, executed, ordering, integrations] = await Promise.all([
    sql<{ covers: number; bookings: number; no_shows: number; walk_ins: number; total: number }[]>`
      select coalesce(sum(party_size) filter (where status = any(${LIVE})), 0)::int as covers,
             count(*) filter (where source <> 'walk_in' and status <> 'cancelled')::int as bookings,
             count(*) filter (where status = 'no_show')::int as no_shows, count(*)::int as total,
             count(*) filter (where source = 'walk_in' and status = any(${LIVE}))::int as walk_ins
      from reservations where org_id = ${tenant.orgId} and venue_id = ${venue.id} and starts_at >= ${yStart} and starts_at < ${tStart}`,
    sql<{ n: number; cents: number }[]>`
      select count(*)::int as n, coalesce(sum(total_cents), 0)::int as cents from orders
      where org_id = ${tenant.orgId} and status not in ('awaiting_payment', 'cancelled') and created_at >= ${yStart} and created_at < ${tStart}`,
    sql<{ starts_at: Date; party_size: number; source: string; notes: string | null; name: string; guest_notes: string | null; tags: string[] }[]>`
      select r.starts_at, r.party_size, r.source, r.notes, g.name, g.notes as guest_notes, g.tags
      from reservations r join guests g on g.id = r.guest_id
      where r.org_id = ${tenant.orgId} and r.venue_id = ${venue.id} and r.status = any(${LIVE})
        and r.starts_at >= ${tStart} and r.starts_at < ${tEnd}
      order by r.starts_at`,
    pastDays.length
      ? sql<{ day: string; covers: number; n: number }[]>`
          select to_char(starts_at at time zone ${tz}, 'YYYY-MM-DD') as day,
                 coalesce(sum(party_size) filter (where status = any(${LIVE})), 0)::int as covers, count(*)::int as n
          from reservations where org_id = ${tenant.orgId} and venue_id = ${venue.id}
            and starts_at >= ${pastDays[pastDays.length - 1].start} and starts_at < ${pastDays[0].end}
          group by 1`
      : Promise.resolve([]),
    sql<{ id: string; agent_id: string; title: string; created_at: Date }[]>`
      select id, agent_id, title, created_at from agent_proposals
      where org_id = ${tenant.orgId} and status = 'pending' order by created_at desc`,
    sql<{ id: string; thread_id: string; pillar: string; lever: string; label: string; after: unknown; kind: string; created_at: Date }[]>`
      select id, thread_id, pillar, lever, label, after, kind, created_at from chat_changes
      where org_id = ${tenant.orgId} and status = 'pending' order by created_at desc`,
    sql<{ actor: string; action: string; detail: Record<string, unknown>; created_at: Date }[]>`
      select actor, action, detail, created_at from change_log
      where org_id = ${tenant.orgId} and actor like 'agent:%' and created_at >= ${yStart} and created_at < ${tStart}
        and action not in ('agent.denied')
      order by created_at`,
    sql<{ agent_id: string; title: string; decided_by: string | null; decided_at: Date }[]>`
      select agent_id, title, decided_by, decided_at from agent_proposals
      where org_id = ${tenant.orgId} and status = 'executed' and decided_at >= ${yStart} and decided_at < ${tStart}
      order by decided_at`,
    getOrderingSettings(sql, tenant.orgId),
    sql<{ provider: string; status: string }[]>`select provider, status from org_integrations where org_id = ${tenant.orgId}`,
  ]);

  // Last night: unknown before the restaurant was on The Pass — unless it
  // joined during the day and its book already has last night in it.
  const n = night[0];
  const known = o.created_at <= yStart || (o.created_at < tStart && n.total + nightOrders[0].n > 0);
  const sellsOnline = ordering.pickupEnabled || ordering.cateringEnabled || nightOrders[0].n > 0;
  const lastNight = {
    date: yesterday,
    covers: known ? n.covers : null, bookings: known ? n.bookings : null,
    noShows: known ? n.no_shows : null, walkIns: known ? n.walk_ins : null,
    onlineOrders: known && sellsOnline ? nightOrders[0].n : null,
    onlineSalesCents: known && sellsOnline ? nightOrders[0].cents : null,
  };

  const time = (d: Date) => formatIn(d, tz, "time");
  const covers = todays.reduce((s, r) => s + r.party_size, 0);
  const byDay = new Map(history.map((h) => [h.day, h]));
  const usualDays = pastDays.filter((p) => byDay.has(p.d));
  const vsUsual = pastDays.length && usualDays.length
    ? (() => {
      const usual = Math.round(pastDays.reduce((s, p) => s + (byDay.get(p.d)?.covers ?? 0), 0) / pastDays.length);
      return { usual, delta: covers - usual, weeks: pastDays.length };
    })()
    : null;
  const notes: BriefParty[] = [];
  for (const r of todays) {
    const text = [r.notes, r.guest_notes, ...(r.tags ?? [])].filter(Boolean).join(" · ");
    if (text && NOTABLE.test(text)) {
      const line = [r.notes, r.guest_notes, ...(r.tags ?? []).filter((t) => NOTABLE.test(t))].filter((x): x is string => Boolean(x && NOTABLE.test(x))).join(" · ");
      notes.push({ time: time(r.starts_at), name: r.name, size: r.party_size, note: line.slice(0, 140) });
    }
  }

  const top = [
    ...proposals.map((p) => ({ title: p.title, href: `${base}/agents#p-${p.id}`, from: stationName(p.agent_id) || "The Pass", at: p.created_at })),
    ...changes.map((c) => {
      const def = c.kind === "lever" ? lever(c.pillar, c.lever) : undefined;
      const what = def ? `${c.label} → ${formatLever(def, c.after as never, undefined, tz)}` : typeof c.after === "string" && c.after ? `${c.label}: ${c.after}` : c.label;
      return { title: what, href: `/r/${o.slug}/chat?t=${c.thread_id}#c-${c.id}`, from: "Ask The Pass", at: c.created_at };
    }),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 3).map(({ title, href, from }) => ({ title, href, from }));

  // What The Pass did yesterday. An action that ran because someone
  // approved it says so; approvals with no logged action are listed too.
  const unmatched = [...executed];
  const didYesterday: MorningPass["didYesterday"] = [];
  const proposedBy = new Map<string, number>();
  for (const e of agentLog) {
    const id = e.actor.slice(6);
    if (e.action === "agent.proposed") { proposedBy.set(id, (proposedBy.get(id) ?? 0) + 1); continue; }
    if (e.action.startsWith("agent.")) continue;
    let text = describeAction(e.action, e.detail);
    const i = unmatched.findIndex((p) => p.agent_id === id && Math.abs(p.decided_at.getTime() - e.created_at.getTime()) < 5 * 60_000);
    if (i >= 0) {
      const p = unmatched.splice(i, 1)[0];
      text += ` (${p.decided_by ? `${p.decided_by} approved` : "approved"} ${time(p.decided_at)})`;
    }
    didYesterday.push({ station: stationName(id), text, at: e.created_at });
  }
  for (const p of unmatched) {
    didYesterday.push({ station: stationName(p.agent_id), text: `${p.title} (${p.decided_by ? `${p.decided_by} approved` : "approved"} ${time(p.decided_at)})`, at: p.decided_at });
  }
  for (const [id, count] of proposedBy) {
    didYesterday.push({ station: stationName(id), text: `Drafted ${count} thing${count === 1 ? "" : "s"} for your approval`, at: yStart });
  }
  didYesterday.sort((a, b) => a.at.getTime() - b.at.getTime());

  const headsUps: MorningPass["headsUps"] = [];
  if (!smsConfigured()) headsUps.push({ text: "Texting is off: booking confirmations and reminders aren't reaching guests.", href: `${base}/settings` });
  if ((ordering.pickupEnabled || ordering.cateringEnabled) && ordering.pausedUntil && ordering.pausedUntil > now) {
    headsUps.push({ text: `Online ordering is paused until ${formatIn(ordering.pausedUntil, tz, ordering.pausedUntil < tEnd ? "time" : "datetime")}.`, href: `${base}/orders` });
  }
  for (const i of integrations.filter((x) => x.status === "error")) {
    headsUps.push({ text: `${provider(i.provider)?.name ?? i.provider} needs attention: it stopped connecting.`, href: `${base}/settings` });
  }

  return {
    org: { slug: o.slug, name: o.name }, venue: venue.name, tz, date: today, lastNight,
    today: {
      bookings: todays.length, covers, vsUsual,
      largeParties: todays.filter((r) => r.party_size >= LARGE_PARTY).map((r) => ({ time: time(r.starts_at), name: r.name, size: r.party_size })),
      firstBooking: todays.length ? formatIn(todays[0].starts_at, tz, "time") : null,
      notes: notes.slice(0, 5),
    },
    waiting: { count: proposals.length + changes.length, proposals: proposals.length, changes: changes.length, top },
    didYesterday: didYesterday.slice(0, 12),
    headsUps,
  };
}

/** A number for the brief: "—" when unknown. */
export const num = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("en-US"));
/** Whole dollars for the brief: "—" when unknown, never "$0" for missing. */
export const dollars = (c: number | null | undefined) => (c === null || c === undefined ? "—" : `$${Math.round(c / 100).toLocaleString("en-US")}`);

/** "Thursday, November 12" for a venue-local date. */
export const longDay = (date: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const weekdayOf = (date: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

/** "+6 on your usual Thursday (34)", or "—" with no history. */
export function usualLine(b: MorningPass): string {
  const v = b.today.vsUsual;
  if (!v) return "—";
  const day = weekdayOf(b.date);
  if (v.delta === 0) return `Same as your usual ${day} (${v.usual})`;
  return `${v.delta > 0 ? "+" : "−"}${Math.abs(v.delta)} on your usual ${day} (${v.usual})`;
}

/**
 * The brief as plain text, for email (full) or a text message (short).
 * Scannable: one fact per line, numbers first, and a link to Home.
 */
export function renderMorningPassText(b: MorningPass, homeUrl: string, opts: { short?: boolean } = {}): string {
  const l = b.lastNight, t = b.today;
  const last = `Last night: ${num(l.covers)} covers, ${num(l.noShows)} no-show${l.noShows === 1 ? "" : "s"}, ${num(l.walkIns)} walk-in${l.walkIns === 1 ? "" : "s"}${l.onlineOrders !== null ? `, ${num(l.onlineOrders)} online order${l.onlineOrders === 1 ? "" : "s"} (${dollars(l.onlineSalesCents)})` : ""}.`;
  const today = `Today: ${t.covers} covers in ${t.bookings} booking${t.bookings === 1 ? "" : "s"}${t.vsUsual ? ` — ${usualLine(b).replace(/^./, (c) => c.toLowerCase())}` : ""}${t.firstBooking ? `. First at ${t.firstBooking}` : ""}.`;
  const waiting = b.waiting.count ? `Waiting for you: ${b.waiting.count}.` : "Nothing waiting for you.";
  if (opts.short) {
    return [`${b.org.name} — your morning pass`, last, today, waiting, ...b.headsUps.slice(0, 1).map((h) => h.text), homeUrl].join("\n");
  }
  const lines = [`Your morning pass — ${longDay(b.date)}`, `${b.venue}`, "", last, "", today];
  for (const p of t.largeParties) lines.push(`  • ${p.time} party of ${p.size} — ${p.name}`);
  for (const p of t.notes) lines.push(`  • ${p.time} ${p.name} (${p.size}): ${p.note}`);
  lines.push("", waiting);
  for (const w of b.waiting.top) lines.push(`  • ${w.title} (${w.from})`);
  if (b.didYesterday.length) {
    lines.push("", "What The Pass did yesterday:");
    for (const d of b.didYesterday) lines.push(`  • ${d.station ? `${d.station}: ` : ""}${d.text}`);
  }
  if (b.headsUps.length) {
    lines.push("", "Heads-up:");
    for (const h of b.headsUps) lines.push(`  • ${h.text}`);
  }
  lines.push("", `Open The Pass: ${homeUrl}`, "", "The Pass doesn't touch your kitchen, payroll or point of sale.");
  return lines.join("\n");
}
