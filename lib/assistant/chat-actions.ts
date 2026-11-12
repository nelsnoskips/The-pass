import type Anthropic from "@anthropic-ai/sdk";
import type { Sql } from "postgres";
import type { SmsSender } from "../messaging/sms";
import { NEXT as ORDER_NEXT, setOrderStatus, type OrderStatus } from "../ordering";
import { refundDepositIfDue } from "../payments";
import { addMember } from "../platform/settings";
import { can, Forbidden, type Action, type Tenant } from "../platform/tenant";
import { notifyWaitlist } from "../reservations/followups";
import { sendCancellationNotice } from "../reservations/notify";
import { availableSlots, book, normalizePhone, setStatus } from "../reservations/repo";
import { localDate } from "../reservations/time";
import { formatClock, formatPhone, formatWhen } from "../sites/format";

/**
 * Things the assistant can do that aren't settings: take a booking,
 * cancel one, move an online order along, add someone to the team.
 *
 * Every action is "confirm": asking for it only writes a card (a
 * chat_changes row of kind 'action') with what will happen and the exact
 * input. Nothing happens until a person presses Apply; then the action is
 * checked again against how things are now, and runs with that person's
 * own permissions, logged as theirs. Actions can't be undone from the
 * card; the person reverses one by asking (cancel the booking, etc.).
 */

export type ActionArea = "reservations" | "ordering" | "team";
export const ACTION_AREAS: Record<ActionArea, { label: string; page: string }> = {
  reservations: { label: "Reservations", page: "host" },
  ordering: { label: "Online ordering", page: "orders" },
  team: { label: "Team", page: "settings/team" },
};

export interface ApplyOptions {
  /** For links in texts (the waitlist). Without it the waitlist isn't told. */
  baseUrl?: string;
  sender?: SmsSender;
  now?: Date;
}

type Input = Record<string, unknown>;
interface Prepared { input: Input; before: string; after: string; note: string }
type Err = { error: string };

export interface ActionDef {
  name: string;
  area: ActionArea;
  /** The card's heading, e.g. "New booking". */
  label: string;
  requires: Action;
  description: string;
  input_schema: Anthropic.Beta.Messages.BetaTool["input_schema"];
  /** Check the request and describe it exactly; changes nothing. */
  prepare(sql: Sql, t: Tenant, input: Input, now: Date): Promise<Err | Prepared>;
  /** Do it, after checking again. `stored` is the prepared input. */
  apply(sql: Sql, t: Tenant, stored: Input, opts: ApplyOptions): Promise<Err | { result: Input; after?: string }>;
}

const obj = (properties: Record<string, unknown>, required: string[]) => ({ type: "object" as const, properties, required, additionalProperties: false });
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const isErr = (x: unknown): x is Err => typeof x === "object" && x !== null && "error" in x;

/** "19:30", "7:30pm", "7 pm" → "19:30". */
export function parseClock(raw: string): string | null {
  const m = /^(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?$/i.exec(raw.trim());
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = m[3]?.toLowerCase().replace(/\./g, "");
  if (ap) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (ap === "pm" ? 12 : 0);
  }
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

const validDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));

async function firstVenue(sql: Sql, t: Tenant) {
  const rows = await sql<{ id: string; name: string; timezone: string; phone: string | null }[]>`
    select id, name, timezone, phone from venues where org_id = ${t.orgId} order by created_at`;
  return rows.find((v) => t.venueIds === null || t.venueIds.includes(v.id)) ?? null;
}

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ---------------------------------------------------- create_booking -- */

const createBooking: ActionDef = {
  name: "create_booking",
  area: "reservations",
  label: "New booking",
  requires: "book",
  description: "Take a booking for a guest, the way the host stand does (staff rules: no online limits). date is yyyy-mm-dd and time is the restaurant's local time, e.g. 19:30. phone may be empty if the guest gave none (then they get no texts). notes may be empty. The booking is shown to the person as a card to Apply; it isn't made until they do. If the time isn't free, the result lists free times nearby.",
  input_schema: obj({
    name: { type: "string" }, phone: { type: "string" }, party_size: { type: "integer" },
    date: { type: "string" }, time: { type: "string" }, notes: { type: "string" },
  }, ["name", "phone", "party_size", "date", "time", "notes"]),
  async prepare(sql, t, i, now) {
    const name = str(i.name).slice(0, 80);
    const rawPhone = str(i.phone);
    const party = Number(i.party_size);
    const date = str(i.date);
    const time = parseClock(str(i.time));
    const notes = str(i.notes).slice(0, 300);
    if (!name) return { error: "The booking needs the guest's name." };
    if (rawPhone && !normalizePhone(rawPhone)) return { error: "That phone number doesn't look right." };
    if (!Number.isInteger(party) || party < 1 || party > 30) return { error: "Party size must be between 1 and 30." };
    if (!validDate(date)) return { error: "Use the date as yyyy-mm-dd." };
    if (!time) return { error: "Give the time like 19:30 or 7:30pm." };
    const v = await firstVenue(sql, t);
    if (!v) return { error: "There's no venue to book." };
    if (!can(t, "book", v.id)) return { error: "The person you're helping can't take bookings." };
    if (date < localDate(now, v.timezone)) return { error: "That date has passed." };
    const slots = await availableSlots(sql, { orgId: t.orgId, venueId: v.id, date, partySize: party, channel: "staff", now });
    const slot = slots.find((s) => s.time === time);
    if (!slot) {
      const want = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
      const near = [...slots].sort((a, b) => Math.abs(Number(a.time.slice(0, 2)) * 60 + Number(a.time.slice(3)) - want)
        - Math.abs(Number(b.time.slice(0, 2)) * 60 + Number(b.time.slice(3)) - want)).slice(0, 4).sort((a, b) => a.time.localeCompare(b.time));
      return { error: near.length
        ? `${formatClock(time)} isn't free for ${party} that day. Free nearby: ${near.map((s) => formatClock(s.time)).join(", ")}.`
        : `Nothing is free for ${party} on ${date}.` };
    }
    const [table] = await sql<{ label: string }[]>`select label from dining_tables where id = ${slot.tableId} and org_id = ${t.orgId}`;
    const phone = rawPhone ? normalizePhone(rawPhone)! : "";
    const notesText = notes ? ` · “${notes}”` : "";
    return {
      input: { venue_id: v.id, name, phone, party_size: party, date, time, notes },
      before: "",
      after: `${name}${phone ? ` (${formatPhone(phone)})` : ""} · ${party} ${party === 1 ? "guest" : "guests"} · ${formatWhen(slot.startsAt, v.timezone)} · table ${table?.label ?? "?"}${notesText}`,
      note: [
        "Made as a staff booking, like one taken by phone. The table is picked again when you press Apply.",
        phone ? "" : "No phone number: the guest won't get texts.",
        slot.depositCents > 0 ? `A ${money(slot.depositCents)} deposit applies; take it at the host stand.` : "",
      ].filter(Boolean).join(" "),
    };
  },
  async apply(sql, t, i, opts) {
    const venueId = String(i.venue_id);
    if (!can(t, "book", venueId)) return { error: "Your role can't take bookings." };
    const r = await book(sql, {
      orgId: t.orgId, venueId, date: String(i.date), time: String(i.time), partySize: Number(i.party_size),
      guest: { name: String(i.name), phone: String(i.phone ?? "") }, notes: String(i.notes ?? "") || null,
      source: "phone", actor: t.actor, channel: "staff", now: opts.now,
    });
    if (!r.ok) {
      return { error: {
        invalid_phone: "That phone number doesn't look right.", invalid_name: "The booking needs a name.",
        unavailable: "That time is no longer free. Ask again for another time.", venue_not_found: "Venue not found.",
        already_booked: "They already have a booking that day.", too_many: "Too many bookings for that number.",
      }[r.reason] };
    }
    const [v] = await sql<{ timezone: string }[]>`select timezone from venues where id = ${venueId}`;
    const res = r.reservation;
    return {
      result: { reservation_id: res.id, table: res.tableLabels[0] ?? null },
      after: `${res.guestName}${res.guestPhone.startsWith("+") ? ` (${formatPhone(res.guestPhone)})` : ""} · ${res.partySize} ${res.partySize === 1 ? "guest" : "guests"} · ${formatWhen(res.startsAt, v.timezone)} · table ${res.tableLabels.join(" + ")}${res.notes ? ` · “${res.notes}”` : ""}`,
    };
  },
};

/* ---------------------------------------------------- cancel_booking -- */

interface Live { id: string; venue_id: string; guest_id: string; name: string; phone: string; party_size: number; starts_at: Date;
  status: "booked" | "confirmed" | "seated" | "completed" | "cancelled" | "no_show"; timezone: string; venue_phone: string | null; deposit_status: string }

async function loadBooking(sql: Sql, t: Tenant, id: string): Promise<Live | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await sql<Live[]>`
    select r.id, r.venue_id, r.guest_id, g.name, g.phone, r.party_size, r.starts_at, r.status, v.timezone,
           v.phone as venue_phone, r.deposit_status
    from reservations r join guests g on g.id = r.guest_id join venues v on v.id = r.venue_id
    where r.id = ${id} and r.org_id = ${t.orgId}`;
  return r ?? null;
}

const describeBooking = (r: Live) =>
  `${r.name} · ${r.party_size} ${r.party_size === 1 ? "guest" : "guests"} · ${formatWhen(r.starts_at, r.timezone)}`;

const cancelBooking: ActionDef = {
  name: "cancel_booking",
  area: "reservations",
  label: "Cancel a booking",
  requires: "book",
  description: "Cancel a guest's booking, found by their name (or part of it) and the date (yyyy-mm-dd, local). time may be empty; give it (e.g. 19:30) if the guest has more than one booking that day. The guest gets a text saying the restaurant cancelled, and any deposit is refunded. Shown to the person as a card to Apply; nothing is cancelled until they do.",
  input_schema: obj({ guest_name: { type: "string" }, date: { type: "string" }, time: { type: "string" } }, ["guest_name", "date", "time"]),
  async prepare(sql, t, i) {
    const name = str(i.guest_name).slice(0, 60);
    const date = str(i.date);
    const time = str(i.time) ? parseClock(str(i.time)) : null;
    if (name.length < 2) return { error: "Give the guest's name." };
    if (!validDate(date)) return { error: "Use the date as yyyy-mm-dd." };
    if (str(i.time) && !time) return { error: "Give the time like 19:30 or 7:30pm." };
    const like = `%${name.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const found = await sql<(Live & { local_time: string })[]>`
      select r.id, r.venue_id, r.guest_id, g.name, g.phone, r.party_size, r.starts_at, r.status, v.timezone,
             v.phone as venue_phone, r.deposit_status, to_char(r.starts_at at time zone v.timezone, 'HH24:MI') as local_time
      from reservations r join guests g on g.id = r.guest_id join venues v on v.id = r.venue_id
      where r.org_id = ${t.orgId} and g.name ilike ${like}
        and (r.starts_at at time zone v.timezone)::date = ${date}::date
        and r.status in ('booked', 'confirmed')
      order by r.starts_at limit 10`;
    const mine = found.filter((r) => t.venueIds === null || t.venueIds.includes(r.venue_id));
    const hits = time ? mine.filter((r) => r.local_time === time) : mine;
    if (hits.length === 0) return { error: `No upcoming booking for “${name}” on ${date}${time ? ` at ${formatClock(time)}` : ""}.` };
    if (hits.length > 1) {
      return { error: `More than one booking matches: ${hits.map((r) => `${r.name} at ${formatClock(r.local_time)} (${r.party_size})`).join("; ")}. Say which, with the time.` };
    }
    const r = hits[0];
    if (!can(t, "book", r.venue_id)) return { error: "The person you're helping can't change bookings." };
    return {
      input: { reservation_id: r.id },
      before: `${describeBooking(r)} · ${r.status === "confirmed" ? "Confirmed" : "Booked"}`,
      after: "Cancelled",
      note: [
        r.phone.startsWith("+") ? `${r.name.split(" ")[0]} gets a text saying the restaurant cancelled.` : "No phone on file, so the guest isn't texted.",
        ["held", "captured"].includes(r.deposit_status) ? "Their deposit is refunded." : "",
        "Can't be undone from here; to rebook, ask.",
      ].filter(Boolean).join(" "),
    };
  },
  async apply(sql, t, i, opts) {
    const r = await loadBooking(sql, t, String(i.reservation_id));
    if (!r) return { error: "That booking no longer exists." };
    if (!["booked", "confirmed"].includes(r.status)) return { error: `That booking is ${r.status.replace("_", "-")} now, so it can't be cancelled.` };
    if (!can(t, "book", r.venue_id)) return { error: "Your role can't change bookings." };
    const s = await setStatus(sql, t, r.id, "cancelled");
    if (s !== "ok") return { error: "That booking can't be cancelled now." };
    const [o] = await sql<{ name: string }[]>`select name from orgs where id = ${t.orgId}`;
    const result: Input = { cancelled: true, texted: false, refunded: false, waitlist: 0 };
    try {
      if (r.phone.startsWith("+")) {
        await sendCancellationNotice(sql, {
          orgId: t.orgId, guestId: r.guest_id, phone: r.phone, restaurant: o.name,
          when: formatWhen(r.starts_at, r.timezone), restaurantPhone: r.venue_phone,
        }, opts.sender);
        result.texted = true;
      }
    } catch (err) {
      console.error("Cancellation notice failed", err);
    }
    try {
      // The restaurant cancelled: the deposit always goes back.
      result.refunded = await refundDepositIfDue(sql, t.orgId, r.id, "restaurant");
    } catch (err) {
      console.error("Deposit refund failed", err);
    }
    if (opts.baseUrl) {
      try {
        result.waitlist = (await notifyWaitlist(sql, { orgId: t.orgId, venueId: r.venue_id, date: localDate(r.starts_at, r.timezone), baseUrl: opts.baseUrl }, opts.sender)).notified;
      } catch (err) {
        console.error("Waitlist notify failed", err);
      }
    }
    return { result, after: `Cancelled${result.texted ? " · guest texted" : ""}${result.refunded ? " · deposit refunded" : ""}` };
  },
};

/* ----------------------------------------------- update_order_status -- */

const STATUS_WORDS: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment", placed: "New", accepted: "Accepted", ready: "Ready", completed: "Picked up", cancelled: "Cancelled",
};

const updateOrderStatus: ActionDef = {
  name: "update_order_status",
  area: "ordering",
  label: "Online order",
  requires: "book",
  description: "Move an online order along by its number: accepted (the kitchen has it), ready (the guest is texted that it's ready for pickup), completed (picked up), or cancelled (the guest is texted). Only the next step is allowed: new → accepted → ready → completed; new or accepted orders can be cancelled. Shown to the person as a card to Apply.",
  input_schema: obj({ order_number: { type: "integer" }, status: { type: "string", enum: ["accepted", "ready", "completed", "cancelled"] } }, ["order_number", "status"]),
  async prepare(sql, t, i) {
    const number = Number(i.order_number);
    const to = str(i.status) as OrderStatus;
    if (!Number.isInteger(number)) return { error: "Give the order number." };
    if (!["accepted", "ready", "completed", "cancelled"].includes(to)) return { error: "Status is accepted, ready, completed or cancelled." };
    if (!can(t, "book")) return { error: "The person you're helping can't change orders." };
    const [o] = await sql<{ id: string; status: OrderStatus; name: string; kind: string; phone: string; payment: string; total_cents: number }[]>`
      select id, status, name, kind, phone, payment, total_cents from orders where org_id = ${t.orgId} and number = ${number}
      order by created_at desc limit 1`;
    if (!o) return { error: `There's no order ${number}.` };
    if (o.status === to) return { error: `Order ${number} is already ${STATUS_WORDS[to].toLowerCase()}.` };
    if (!ORDER_NEXT[o.status].includes(to)) return { error: `Order ${number} is ${STATUS_WORDS[o.status].toLowerCase()}; it can't go to ${STATUS_WORDS[to].toLowerCase()}.` };
    const first = o.name.split(" ")[0];
    const texted = o.phone.startsWith("+");
    return {
      input: { order_id: o.id, number, from: o.status, to },
      before: `Order ${number} · ${o.name} · ${money(o.total_cents)} · ${STATUS_WORDS[o.status]}`,
      after: STATUS_WORDS[to],
      note: [
        to === "ready" && o.kind === "pickup" && texted ? `${first} gets a text that it's ready for pickup.` : "",
        to === "cancelled" && texted ? `${first} gets a text that it's cancelled.` : "",
        to === "cancelled" && o.payment === "paid" ? "It was paid online; cancelling here doesn't refund it." : "",
        "Can't be undone from here.",
      ].filter(Boolean).join(" "),
    };
  },
  async apply(sql, t, i, opts) {
    if (!can(t, "book")) return { error: "Your role can't change orders." };
    const [o] = await sql<{ status: OrderStatus }[]>`select status from orders where id = ${String(i.order_id)} and org_id = ${t.orgId}`;
    if (!o) return { error: "That order no longer exists." };
    if (o.status !== i.from) return { error: `Order ${i.number} changed since this was proposed: it's ${STATUS_WORDS[o.status].toLowerCase()} now.` };
    const [org] = await sql<{ name: string }[]>`select name from orgs where id = ${t.orgId}`;
    const r = await setOrderStatus(sql, t, String(i.order_id), i.to as OrderStatus, { restaurant: org.name, sender: opts.sender });
    if (r !== "ok") return { error: `Order ${i.number} can't go to ${STATUS_WORDS[i.to as OrderStatus].toLowerCase()} now.` };
    return { result: { status: i.to } };
  },
};

/* -------------------------------------------------- add_team_member -- */

const ROLE_WORDS: Record<string, string> = {
  owner: "Owner: everything, including the team and spend",
  manager: "Manager: bookings, website, guests, approvals",
  host: "Host: bookings, seating, walk-ins",
  viewer: "Viewer: can look, can't change anything",
};

const addTeamMember: ActionDef = {
  name: "add_team_member",
  area: "team",
  label: "Team",
  requires: "manage_team",
  description: "Let someone sign in to this restaurant, or change the role of someone who already can. role is owner, manager, host or viewer. Shown to the person as a card to Apply.",
  input_schema: obj({ email: { type: "string" }, role: { type: "string", enum: ["owner", "manager", "host", "viewer"] } }, ["email", "role"]),
  async prepare(sql, t, i) {
    const email = str(i.email).toLowerCase();
    const role = str(i.role);
    if (!can(t, "manage_team")) return { error: "Only an owner can change the team." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return { error: "That email doesn't look right." };
    if (!ROLE_WORDS[role]) return { error: "Role is owner, manager, host or viewer." };
    const [m] = await sql<{ role: string }[]>`select role from org_members where org_id = ${t.orgId} and lower(email) = ${email}`;
    if (m?.role === role) return { error: `${email} is already a ${role}.` };
    return {
      input: { email, role, was: m?.role ?? null },
      before: m ? `${email} · ${ROLE_WORDS[m.role] ?? m.role}` : "",
      after: `${email} · ${ROLE_WORDS[role]}`,
      note: `${m ? "Their role changes" : "They sign in at /login with this email, no password"}. Can't be undone from here; remove them in Settings → Team.`,
    };
  },
  async apply(sql, t, i) {
    if (!can(t, "manage_team")) return { error: "Only an owner can change the team." };
    const [m] = await sql<{ role: string }[]>`select role from org_members where org_id = ${t.orgId} and lower(email) = ${String(i.email)}`;
    if ((m?.role ?? null) !== (i.was ?? null)) return { error: `${i.email}'s access changed since this was proposed. Ask again.` };
    const err = await addMember(sql, t, String(i.email), String(i.role));
    return err ? { error: err } : { result: { email: i.email, role: i.role } };
  },
};

export const ACTIONS: ActionDef[] = [createBooking, cancelBooking, updateOrderStatus, addTeamMember];
export const actionDef = (name: string | null | undefined) => ACTIONS.find((a) => a.name === name);

/**
 * Write the card for an action the assistant was asked to take. Returns
 * what the model should tell the person.
 */
export async function proposeAction(sql: Sql, t: Tenant, threadId: string, name: string, input: Input, reason: string, now = new Date()) {
  const def = actionDef(name);
  if (!def) return { error: `Unknown action ${name}.` };
  if (!can(t, def.requires)) return { error: `The person you're helping isn't allowed to do that (${def.label.toLowerCase()}).` };
  const p = await def.prepare(sql, t, input, now);
  if (isErr(p)) return p;
  const [c] = await sql<{ id: string }[]>`
    insert into chat_changes (org_id, thread_id, kind, action, action_input, pillar, lever, label, value, before, after, risk, status, reason, requested_by)
    values (${t.orgId}, ${threadId}, 'action', ${def.name}, ${sql.json(p.input as never)}, ${def.area}, ${def.name}, ${def.label}, '',
            ${sql.json(p.before)}, ${sql.json(p.after)}, 'confirm', 'pending', ${(reason || p.note).slice(0, 300)}, ${t.actor})
    returning id`;
  return { id: c.id, status: "waiting_for_apply", action: def.label, will: p.after, ...(p.before ? { now: p.before } : {}), note: `Not done yet: it's shown to the person with an Apply button. ${p.note}` };
}

/**
 * A person presses Apply on an action card. The row is claimed first so a
 * double press can't do it twice; the action re-checks everything.
 */
export async function applyAction(sql: Sql, t: Tenant, changeId: string, opts: ApplyOptions = {}): Promise<{ ok: boolean; error?: string }> {
  const [c] = await sql<{ id: string; action: string; action_input: Input }[]>`
    select id, action, action_input from chat_changes
    where id = ${changeId} and org_id = ${t.orgId} and kind = 'action' and status = 'pending'`;
  if (!c) return { ok: false, error: "That change was already decided." };
  const def = actionDef(c.action);
  if (!def) return { ok: false, error: "That action no longer exists." };
  // Permission first, so a refusal leaves the card for someone who can.
  if (!can(t, def.requires)) return { ok: false, error: `Your role can't do this (${def.label.toLowerCase()}).` };
  const [claimed] = await sql`update chat_changes set decided_by = ${t.actor}, decided_at = now()
    where id = ${c.id} and org_id = ${t.orgId} and status = 'pending' and decided_at is null returning id`;
  if (!claimed) return { ok: false, error: "That change is already being applied." };

  let out: Err | { result: Input; after?: string };
  try {
    out = await def.apply(sql, t, c.action_input, opts);
  } catch (err) {
    if (!(err instanceof Forbidden)) {
      await sql`update chat_changes set decided_by = null, decided_at = null where id = ${c.id}`;
      throw err;
    }
    out = { error: "Your role can't do this." };
  }
  if (isErr(out)) {
    await sql`update chat_changes set status = 'failed', error = ${out.error}, decided_by = ${t.actor}, decided_at = now() where id = ${c.id}`;
    return { ok: false, error: out.error };
  }
  await sql`update chat_changes set status = 'applied', result = ${sql.json(out.result as never)},
            after = coalesce(${out.after ? sql.json(out.after) : null}::jsonb, after), decided_by = ${t.actor}, decided_at = now()
            where id = ${c.id}`;
  return { ok: true };
}
