"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { notifyWaitlist } from "../reservations/followups";
import { sendCancellationNotice } from "../reservations/notify";
import { localDate } from "../reservations/time";
import { headers } from "next/headers";
import { availableSlots, book, seatWalkIn, setStatus, type ReservationStatus } from "../reservations/repo";
import { formatClock, formatWhen } from "../sites/format";
import { requireTenant } from "./context";
import { can } from "./tenant";

/**
 * Host stand actions. Each one resolves the tenant again from the
 * session: the page having rendered proves nothing about this request.
 */

const ALLOWED: ReservationStatus[] = ["confirmed", "seated", "completed", "no_show", "cancelled"];

export async function changeStatus(org: string, reservationId: string, status: ReservationStatus): Promise<{ error: string | null }> {
  const sql = db();
  if (!sql || !ALLOWED.includes(status)) return { error: "Not allowed." };
  const { tenant } = await requireTenant(org);
  if (!can(tenant, "book")) return { error: "Your role can't change bookings." };

  const [before] = await sql<{ status: ReservationStatus; guest_id: string; phone: string; starts_at: Date; timezone: string; venue_phone: string | null; venue_id: string }[]>`
    select r.status, r.guest_id, g.phone, r.starts_at, v.timezone, v.phone as venue_phone, r.venue_id
    from reservations r join guests g on g.id = r.guest_id join venues v on v.id = r.venue_id
    where r.id = ${reservationId} and r.org_id = ${tenant.orgId}`;
  if (!before) return { error: "Booking not found." };
  const result = await setStatus(sql, tenant, reservationId, status);
  if (result === "not_found") return { error: "Booking not found." };
  if (result === "invalid") {
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
  return { error: null };
}

export interface FormState { ok: string | null; error: string | null }

export async function walkIn(_prev: FormState, form: FormData): Promise<FormState> {
  const sql = db();
  const org = String(form.get("org") ?? "");
  if (!sql) return { ok: null, error: "Unavailable." };
  const { tenant } = await requireTenant(org);
  const party = Number(form.get("party"));
  if (!Number.isInteger(party) || party < 1 || party > 30) return { ok: null, error: "Enter a party size." };
  const r = await seatWalkIn(sql, tenant, {
    venueId: String(form.get("venue") ?? ""), partySize: party,
    name: String(form.get("name") ?? ""), phone: String(form.get("phone") ?? ""),
  });
  if (!r.ok) {
    const msg = { no_table: `No table free for ${party} right now.`, invalid_phone: "That phone number doesn't look right.", invalid_name: "Add a name.", venue_not_found: "Venue not found." };
    return { ok: null, error: msg[r.reason] };
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

export async function phoneBooking(_prev: FormState, form: FormData): Promise<FormState> {
  const sql = db();
  const org = String(form.get("org") ?? "");
  if (!sql) return { ok: null, error: "Unavailable." };
  const { tenant } = await requireTenant(org);
  if (!can(tenant, "book")) return { ok: null, error: "Your role can't take bookings." };
  const venueId = String(form.get("venue") ?? "");
  if (tenant.venueIds !== null && !tenant.venueIds.includes(venueId)) return { ok: null, error: "Not your venue." };
  const party = Number(form.get("party"));
  const r = await book(sql, {
    orgId: tenant.orgId, venueId, date: String(form.get("date") ?? ""), time: String(form.get("time") ?? ""),
    partySize: party,
    guest: { name: String(form.get("name") ?? ""), phone: String(form.get("phone") ?? "") },
    notes: String(form.get("notes") ?? "").trim() || null,
    source: "phone", actor: tenant.actor, channel: "staff",
  });
  if (!r.ok) {
    const msg: Record<typeof r.reason, string> = {
      invalid_phone: "That phone number doesn't look right.", invalid_name: "Add a name.",
      unavailable: "That time is no longer free.", venue_not_found: "Venue not found.",
      already_booked: "They already have a booking that day.", too_many: "Too many bookings for that number.",
    };
    return { ok: null, error: msg[r.reason] };
  }
  revalidatePath(`/r/${org}/host`);
  return { ok: `Booked ${r.reservation.guestName}, ${party} at ${formatClock(String(form.get("time")))}, table ${r.reservation.tableLabels[0]}.`, error: null };
}
