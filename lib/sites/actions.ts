"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db";
import { allow, clientAddress } from "../platform/ratelimit";
import { sendBookingConfirmation } from "../reservations/notify";
import { joinWaitlist, notifyWaitlist } from "../reservations/followups";
import { availableSlots, book, bookingByToken, cancelByToken, modifyByToken } from "../reservations/repo";
import { localDate } from "../reservations/time";
import { formatClock, formatWhen } from "./format";
import { getPublishedSite } from "./repo";

/**
 * The public booking actions. Everything a browser sends is untrusted:
 * the site comes from its slug, limits come from the venue, and the
 * engine re-checks the slot inside the booking transaction.
 */

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

export interface TimeOption {
  time: string;
  label: string;
  /** The service it falls in, e.g. "Dinner", for grouping. */
  period: string;
  depositCents: number;
}

export interface DayTimes {
  times: TimeOption[];
  /** Whether the restaurant serves that day at all — a waitlist for a
   *  closed day would be a promise we can't keep. */
  open: boolean;
}

export async function findTimes(slug: string, date: string, partySize: number): Promise<DayTimes> {
  const none = { times: [], open: false };
  const sql = db();
  if (!sql || !DATE.test(date) || !Number.isInteger(partySize)) return none;
  const site = await getPublishedSite(sql, slug);
  if (!site) return none;
  const [slots, periods, closed] = await Promise.all([
    availableSlots(sql, { orgId: site.orgId, venueId: site.venueId, date, partySize, channel: "online" }),
    sql<{ id: string; name: string; days_of_week: number[] }[]>`
      select id, name, days_of_week from service_periods where venue_id = ${site.venueId} and org_id = ${site.orgId}`,
    sql`select 1 from venue_closures where venue_id = ${site.venueId} and org_id = ${site.orgId} and date = ${date}`,
  ]);
  const names = new Map(periods.map((p) => [p.id, p.name]));
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return {
    open: closed.length === 0 && periods.some((p) => p.days_of_week.map(Number).includes(day)),
    times: slots.map((s) => ({
      time: s.time, label: formatClock(s.time), period: names.get(s.periodId) ?? "", depositCents: s.depositCents,
    })),
  };
}

export interface ReserveState {
  error: string | null;
}

export async function reserve(_prev: ReserveState, form: FormData): Promise<ReserveState> {
  const sql = db();
  if (!sql) return { error: "Booking is unavailable right now. Please call us." };

  const get = (k: string) => String(form.get(k) ?? "").trim();
  // A field no person sees or fills. Bots do.
  if (get("website")) return { error: null };

  const slug = get("site");
  const date = get("date");
  const time = get("time");
  const partySize = Number(get("party"));
  const site = await getPublishedSite(sql, slug);
  if (!site || !DATE.test(date) || !TIME.test(time) || !Number.isInteger(partySize)) {
    return { error: "Something was missing from that booking. Please pick a time again." };
  }
  const h = await headers();
  if (!(await allow(sql, "book", clientAddress(h), 10, 10))) {
    return { error: "Too many attempts from this connection. Please wait a few minutes, or call us." };
  }
  const name = get("name").slice(0, 120);
  const email = get("email").slice(0, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email doesn't look right." };

  const result = await book(sql, {
    orgId: site.orgId, venueId: site.venueId, date, time, partySize,
    guest: { name, phone: get("phone"), email: email || null, smsMarketingConsent: form.get("marketing") === "on" },
    notes: get("notes").slice(0, 500) || null,
    source: "website", actor: "guest", channel: "online",
  });

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      invalid_phone: "Please enter a mobile number we can text your confirmation to.",
      invalid_name: "Please tell us the name for the booking.",
      unavailable: "That time was just taken. Please choose another.",
      venue_not_found: "Booking is unavailable right now. Please call us.",
      already_booked: "You already have a table that day. Use the link in your confirmation text to change it, or call us.",
      too_many: "That's a lot of bookings in a short time. Please call us and we'll sort it out.",
    };
    return { error: messages[result.reason] };
  }

  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? ""}`;
  const path = `/s/${site.slug}/booking/${result.reservation.manageToken}`;
  // A failed text must not fail the booking: the table is already held.
  try {
    await sendBookingConfirmation(sql, {
      orgId: site.orgId,
      reservation: result.reservation,
      restaurant: site.content.brand.name,
      when: formatWhen(result.reservation.startsAt, site.timezone),
      manageUrl: `${origin}${path}`,
    });
  } catch (err) {
    console.error("Booking confirmation failed", err);
  }
  redirect(path);
}

async function origin(): Promise<string> {
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host") ?? ""}`;
}

/** Freed a table: tell whoever was waiting for that day. Never blocks the guest's own action. */
async function afterRelease(orgId: string, venueId: string, startsAt: Date, timezone: string) {
  const sql = db();
  if (!sql) return;
  try {
    await notifyWaitlist(sql, { orgId, venueId, date: localDate(startsAt, timezone), baseUrl: await origin() });
  } catch (err) {
    console.error("Waitlist notify failed", err);
  }
}

export async function cancelBooking(form: FormData): Promise<void> {
  const sql = db();
  const token = String(form.get("token") ?? "");
  const slug = String(form.get("site") ?? "");
  if (!sql || !token) return;
  const booking = await bookingByToken(sql, token);
  if (!booking) return;
  if (await cancelByToken(sql, token)) {
    await afterRelease(booking.orgId, booking.venueId, booking.startsAt, booking.timezone);
  }
  redirect(`/s/${slug}/booking/${token}`);
}

/** Times a booking could move to: its own table counts as free. */
export async function findChangeTimes(token: string, date: string, partySize: number): Promise<TimeOption[]> {
  const sql = db();
  if (!sql || !DATE.test(date) || !Number.isInteger(partySize)) return [];
  const booking = await bookingByToken(sql, token);
  if (!booking) return [];
  const slots = await availableSlots(sql, {
    orgId: booking.orgId, venueId: booking.venueId, date, partySize, channel: "online", exclude: booking.id,
  });
  return slots.map((s) => ({ time: s.time, label: formatClock(s.time), period: "", depositCents: s.depositCents }));
}

export async function changeBooking(_prev: ReserveState, form: FormData): Promise<ReserveState> {
  const sql = db();
  if (!sql) return { error: "Unavailable right now. Please call us." };
  const token = String(form.get("token") ?? "");
  const slug = String(form.get("site") ?? "");
  const date = String(form.get("date") ?? "");
  const time = String(form.get("time") ?? "");
  const partySize = Number(form.get("party"));
  if (!DATE.test(date) || !TIME.test(time) || !Number.isInteger(partySize)) return { error: "Pick a new time first." };
  const before = await bookingByToken(sql, token);
  if (!before) return { error: "We couldn't find that booking." };
  const r = await modifyByToken(sql, token, { date, time, partySize });
  if (!r.ok) {
    return { error: r.reason === "unavailable" ? "That time was just taken. Please choose another." : "This booking can't be changed online. Please call us." };
  }
  if (before.startsAt.getTime() !== r.startsAt.getTime() || before.partySize > partySize) {
    await afterRelease(before.orgId, before.venueId, before.startsAt, before.timezone);
  }
  redirect(`/s/${slug}/booking/${token}?changed=1`);
}

export async function joinWaitlistAction(_prev: ReserveState & { joined?: boolean }, form: FormData): Promise<ReserveState & { joined?: boolean }> {
  const sql = db();
  if (!sql) return { error: "Unavailable right now. Please call us." };
  const h = await headers();
  if (!(await allow(sql, "waitlist", clientAddress(h), 10, 10))) return { error: "Too many requests. Please wait a few minutes." };
  const site = await getPublishedSite(sql, String(form.get("site") ?? ""));
  if (!site) return { error: "Unavailable right now." };
  const r = await joinWaitlist(sql, {
    orgId: site.orgId, venueId: site.venueId, date: String(form.get("date") ?? ""),
    partySize: Number(form.get("party")), name: String(form.get("name") ?? ""), phone: String(form.get("phone") ?? ""),
  });
  if (!r.ok) return { error: r.reason === "invalid_phone" ? "Please enter a mobile number we can text." : "Please add your name." };
  return { error: null, joined: true };
}
