"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { refundDepositIfDue } from "../payments";
import { notifyWaitlist } from "../reservations/followups";
import { LATE_AFTER_MINUTES, UNDO_MINUTES } from "../reservations/floor";
import { sendCancellationNotice } from "../reservations/notify";
import { localDate } from "../reservations/time";
import { headers } from "next/headers";
import {
  availableSlots, blockingParty, book, seatChoices, seatWalkIn, setStatus, undoStatus,
  type ReservationStatus, type TableChoice,
} from "../reservations/repo";
import {
  addToWaitlist, notifyRequest, quoteWait, removeFromWaitlist, seatFromWaitlist, textTableReady,
} from "../reservations/waitlist";
import { formatClock, formatWhen } from "../sites/format";
import { requireTenant } from "./context";
import { can, Forbidden } from "./tenant";

/**
 * Host stand actions. Each one resolves the tenant again from the
 * session: the page having rendered proves nothing about this request.
 * They return errors to show beside the button rather than throwing, and
 * the client wraps each call so a dropped connection is an inline error
 * too, with whatever the host typed kept.
 */

const ALLOWED: ReservationStatus[] = ["confirmed", "seated", "completed", "no_show", "cancelled"];

export interface StatusReply {
  error: string | null;
  /** The table is taken: offer the table picker. */
  pick?: boolean;
  /** What happened, for the Undo toast ("Seated Ana at T5"). */
  done?: string;
}

const clock = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(d).replace(/\s?[AP]M$/, "");

async function forbiddenAsError<T>(fn: () => Promise<T>, error: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Forbidden) return error;
    throw err;
  }
}

export async function changeStatus(org: string, reservationId: string, status: ReservationStatus, tableId?: string): Promise<StatusReply> {
  const sql = db();
  if (!sql || !ALLOWED.includes(status)) return { error: "Not allowed." };
  const { tenant } = await requireTenant(org);
  if (!can(tenant, "book")) return { error: "Your role can't change bookings." };

  const [before] = await sql<{ status: ReservationStatus; guest_id: string; name: string; phone: string; starts_at: Date; timezone: string; venue_phone: string | null; venue_id: string }[]>`
    select r.status, r.guest_id, g.name, g.phone, r.starts_at, v.timezone, v.phone as venue_phone, r.venue_id
    from reservations r join guests g on g.id = r.guest_id join venues v on v.id = r.venue_id
    where r.id = ${reservationId} and r.org_id = ${tenant.orgId}`;
  if (!before) return { error: "Booking not found." };
  const result = await forbiddenAsError(() => setStatus(sql, tenant, reservationId, status, { tableId }), "forbidden" as const);
  switch (result) {
    case "ok": break;
    case "forbidden": return { error: "Your role can't change bookings at this venue." };
    case "not_found": return { error: "Booking not found." };
    case "not_today": return { error: status === "seated" ? "You can only seat a party on the day of their booking." : "You can only mark a no-show on the day." };
    case "too_early": return { error: `A no-show can be marked ${LATE_AFTER_MINUTES} minutes after their time.` };
    case "table_unavailable": return { error: "That table is held for another booking. Pick another.", pick: true };
    case "occupied": {
      const o = await blockingParty(sql, tenant, reservationId);
      return {
        error: o
          ? `${o.tableLabel} is taken — ${o.source === "walk_in" ? "Walk-in" : o.guestName}, seated ${clock(o.seatedAt, before.timezone)}. Pick another table.`
          : "That table is taken. Pick another table.",
        pick: true,
      };
    }
    default:
      return {
        error: status === "no_show"
          ? "Only a party that hasn't arrived can be marked a no-show."
          : "That booking can't change to that status.",
      };
  }

  if (status === "cancelled" && ["booked", "confirmed"].includes(before.status)) {
    const [o] = await sql<{ name: string }[]>`select name from orgs where id = ${tenant.orgId}`;
    try {
      await sendCancellationNotice(sql, {
        orgId: tenant.orgId, guestId: before.guest_id, phone: before.phone, restaurant: o.name,
        when: formatWhen(before.starts_at, before.timezone), restaurantPhone: before.venue_phone,
      });
    } catch (err) {
      console.error("Cancellation notice failed", err);
    }
    try {
      // The restaurant cancelled: the deposit always goes back.
      await refundDepositIfDue(sql, tenant.orgId, reservationId, "restaurant");
    } catch (err) {
      console.error("Deposit refund failed", err);
    }
    try {
      const h = await headers();
      await notifyWaitlist(sql, {
        orgId: tenant.orgId, venueId: before.venue_id, date: localDate(before.starts_at, before.timezone),
        baseUrl: `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? ""}`,
      });
    } catch (err) {
      console.error("Waitlist notify failed", err);
    }
  }
  revalidatePath(`/r/${org}/host`);
  const first = before.name.split(/\s+/)[0] || before.name;
  if (status === "seated") {
    const [t] = await sql<{ labels: string }[]>`
      select string_agg(t.label, ', ' order by t.label) as labels from reservation_tables rt
      join dining_tables t on t.id = rt.table_id where rt.reservation_id = ${reservationId}`;
    return { error: null, done: `Seated ${first}${t?.labels ? ` at ${t.labels}` : ""}` };
  }
  if (status === "completed") return { error: null, done: `${first}'s table is free` };
  if (status === "no_show") return { error: null, done: `${first} marked a no-show` };
  return { error: null };
}

/** Tables to offer in the Seat picker. */
export async function seatOptions(org: string, reservationId: string): Promise<TableChoice[]> {
  const sql = db();
  if (!sql) return [];
  const { tenant } = await requireTenant(org);
  return forbiddenAsError(() => seatChoices(sql, tenant, reservationId), []);
}

export async function undoChange(org: string, reservationId: string): Promise<{ error: string | null }> {
  const sql = db();
  if (!sql) return { error: "Unavailable." };
  const { tenant } = await requireTenant(org);
  const r = await forbiddenAsError(() => undoStatus(sql, tenant, reservationId), "forbidden" as const);
  revalidatePath(`/r/${org}/host`);
  const msg: Record<typeof r, string | null> = {
    ok: null,
    forbidden: "Your role can't change bookings.",
    not_found: "Booking not found.",
    invalid: "There's nothing to undo on that booking.",
    expired: `Undo is only possible for ${UNDO_MINUTES} minutes.`,
    occupied: "Someone else is seated at that table now.",
    table_unavailable: "That table has been given to another party since.",
  };
  return { error: msg[r] };
}

export interface FormState {
  ok: string | null;
  error: string | null;
  /** The field the error is about, to focus and mark invalid. */
  field?: "party" | "name" | "phone" | "time" | "quote" | null;
  /** No table now: the wait to quote for the waitlist. */
  quote?: number | null;
}

export interface WalkInInput { party: number; name: string; phone: string }

export async function walkIn(org: string, venueId: string, input: WalkInInput): Promise<FormState> {
  const sql = db();
  if (!sql) return { ok: null, error: "Unavailable." };
  const { tenant } = await requireTenant(org);
  if (!can(tenant, "book", venueId)) return { ok: null, error: "Your role can't seat guests here." };
  const party = Number(input.party);
  if (!Number.isInteger(party) || party < 1 || party > 30) return { ok: null, error: "Enter a party size from 1 to 30.", field: "party" };
  const r = await seatWalkIn(sql, tenant, {
    venueId, partySize: party, name: String(input.name ?? ""), phone: String(input.phone ?? ""),
  });
  if (!r.ok) {
    if (r.reason === "no_table") {
      const quote = await quoteWait(sql, tenant, venueId, party);
      return {
        ok: null, field: "party", quote,
        error: quote === null ? `No table here seats ${party}.` : `No table free for ${party} right now.`,
      };
    }
    const msg = { invalid_phone: "That phone number doesn't look right.", invalid_name: "Add a name.", venue_not_found: "Venue not found." };
    return { ok: null, error: msg[r.reason], field: r.reason === "invalid_phone" ? "phone" : r.reason === "invalid_name" ? "name" : null };
  }
  revalidatePath(`/r/${org}/host`);
  return { ok: `Seated at ${r.tableLabel}.`, error: null };
}

export async function staffTimes(org: string, venueId: string, date: string, party: number): Promise<{ time: string; label: string }[]> {
  const sql = db();
  if (!sql || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(party)) return [];
  const { tenant } = await requireTenant(org);
  if (tenant.venueIds !== null && !tenant.venueIds.includes(venueId)) return [];
  const slots = await availableSlots(sql, { orgId: tenant.orgId, venueId, date, partySize: party, channel: "staff" });
  return slots.map((s) => ({ time: s.time, label: formatClock(s.time) }));
}

export interface PhoneInput { date: string; time: string; party: number; name: string; phone: string; notes: string }

export async function phoneBooking(org: string, venueId: string, input: PhoneInput): Promise<FormState> {
  const sql = db();
  if (!sql) return { ok: null, error: "Unavailable." };
  const { tenant } = await requireTenant(org);
  if (!can(tenant, "book")) return { ok: null, error: "Your role can't take bookings." };
  if (tenant.venueIds !== null && !tenant.venueIds.includes(venueId)) return { ok: null, error: "Not your venue." };
  const party = Number(input.party);
  if (!Number.isInteger(party) || party < 1 || party > 30) return { ok: null, error: "Enter a party size from 1 to 30.", field: "party" };
  if (!String(input.name ?? "").trim()) return { ok: null, error: "Add a name.", field: "name" };
  if (!/^\d{2}:\d{2}$/.test(String(input.time ?? ""))) return { ok: null, error: "Choose a time.", field: "time" };
  const r = await book(sql, {
    orgId: tenant.orgId, venueId, date: String(input.date ?? ""), time: String(input.time),
    partySize: party,
    guest: { name: String(input.name), phone: String(input.phone ?? "") },
    notes: String(input.notes ?? "").trim().slice(0, 500) || null,
    source: "phone", actor: tenant.actor, channel: "staff",
  });
  if (!r.ok) {
    const msg: Record<typeof r.reason, string> = {
      invalid_phone: "That phone number doesn't look right.", invalid_name: "Add a name.",
      unavailable: "That time is no longer free. Pick another.", venue_not_found: "Venue not found.",
      already_booked: "They already have a booking that day.", too_many: "Too many bookings for that number.",
    };
    const field: FormState["field"] = r.reason === "invalid_phone" || r.reason === "already_booked" || r.reason === "too_many"
      ? "phone" : r.reason === "invalid_name" ? "name" : r.reason === "unavailable" ? "time" : null;
    return { ok: null, error: msg[r.reason], field };
  }
  revalidatePath(`/r/${org}/host`);
  return { ok: `Booked ${r.reservation.guestName}, ${party} at ${formatClock(String(input.time))}, table ${r.reservation.tableLabels[0]}.`, error: null };
}

export async function markPaid(org: string, reservationId: string): Promise<{ error: string | null }> {
  const sql = db();
  if (!sql) return { error: "Unavailable." };
  const { tenant } = await requireTenant(org);
  if (!can(tenant, "book")) return { error: "Your role can't do that." };
  const { markDepositPaid } = await import("../payments");
  const ok = await markDepositPaid(sql, tenant.orgId, reservationId, tenant.actor);
  revalidatePath(`/r/${org}/host`);
  return ok ? { error: null } : { error: "Already paid, or no deposit due." };
}

export async function redeemReward(org: string, rewardId: string): Promise<{ error: string | null }> {
  const sql = db();
  if (!sql) return { error: "Unavailable." };
  const { tenant } = await requireTenant(org);
  if (!can(tenant, "book")) return { error: "Your role can't do that." };
  const { redeem } = await import("../guests/loyalty");
  const ok = await redeem(sql, tenant, rewardId);
  revalidatePath(`/r/${org}/host`);
  return ok ? { error: null } : { error: "Already given." };
}

/* ------------------------------------------------------------ waitlist -- */

export async function addWaiting(org: string, venueId: string, input: WalkInInput & { quote: number }): Promise<FormState> {
  const sql = db();
  if (!sql) return { ok: null, error: "Unavailable." };
  const { tenant } = await requireTenant(org);
  if (!can(tenant, "book", venueId)) return { ok: null, error: "Your role can't do that." };
  const r = await addToWaitlist(sql, tenant, {
    venueId, name: String(input.name ?? ""), phone: String(input.phone ?? ""),
    partySize: Number(input.party), quotedMinutes: Number(input.quote),
  });
  if (!r.ok) {
    return r.reason === "invalid_phone"
      ? { ok: null, error: "That phone number doesn't look right.", field: "phone" }
      : { ok: null, error: "Check the party size and quoted wait.", field: "quote" };
  }
  revalidatePath(`/r/${org}/host`);
  return { ok: `${input.name.trim() || "Walk-in"} added to the waitlist · quoted ${input.quote} min.`, error: null };
}

async function restaurantName(orgId: string) {
  const [o] = await db()!<{ name: string }[]>`select name from orgs where id = ${orgId}`;
  return o?.name ?? "The restaurant";
}

export async function textReady(org: string, id: string): Promise<{ error: string | null }> {
  const sql = db();
  if (!sql) return { error: "Unavailable." };
  const { tenant } = await requireTenant(org);
  const r = await forbiddenAsError(() => restaurantName(tenant.orgId).then((restaurant) => textTableReady(sql, tenant, id, { restaurant })), "forbidden" as const);
  revalidatePath(`/r/${org}/host`);
  const msg = { ok: null, forbidden: "Your role can't text guests.", not_found: "They're no longer on the waitlist.", no_phone: "No mobile number for this party.", failed: "The text didn't go through. Try again or call them over." };
  return { error: msg[r] };
}

export async function seatWaiting(org: string, id: string): Promise<{ error: string | null; done?: string }> {
  const sql = db();
  if (!sql) return { error: "Unavailable." };
  const { tenant } = await requireTenant(org);
  type Seat = Awaited<ReturnType<typeof seatFromWaitlist>> | { ok: false; reason: "forbidden" };
  const r = await forbiddenAsError<Seat>(() => seatFromWaitlist(sql, tenant, id), { ok: false, reason: "forbidden" });
  revalidatePath(`/r/${org}/host`);
  if (r.ok) return { error: null, done: `Seated at ${r.tableLabel}` };
  const msg: Record<string, string> = {
    forbidden: "Your role can't seat guests.", not_found: "They're no longer on the waitlist.",
    no_table: "No table that fits is free yet.", invalid_phone: "That phone number doesn't look right.",
  };
  return { error: msg[r.reason] ?? "Couldn't seat them." };
}

export async function removeWaiting(org: string, id: string): Promise<{ error: string | null }> {
  const sql = db();
  if (!sql) return { error: "Unavailable." };
  const { tenant } = await requireTenant(org);
  const ok = await forbiddenAsError(() => removeFromWaitlist(sql, tenant, id), false);
  revalidatePath(`/r/${org}/host`);
  return { error: ok ? null : "Already off the waitlist." };
}

export async function notifySignup(org: string, id: string): Promise<{ error: string | null }> {
  const sql = db();
  if (!sql) return { error: "Unavailable." };
  const { tenant } = await requireTenant(org);
  const h = await headers();
  const baseUrl = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? ""}`;
  const r = await forbiddenAsError(
    () => restaurantName(tenant.orgId).then((restaurant) => notifyRequest(sql, tenant, id, { restaurant, baseUrl })),
    "forbidden" as const,
  );
  revalidatePath(`/r/${org}/host`);
  const msg = { ok: null, forbidden: "Your role can't text guests.", not_found: "That sign-up is closed.", no_phone: "No number.", failed: "The text didn't go through." };
  return { error: msg[r] };
}
