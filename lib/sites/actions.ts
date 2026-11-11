"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "../db";
import { sendBookingConfirmation } from "../reservations/notify";
import { availableSlots, book, bookingByToken, cancelByToken } from "../reservations/repo";
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

export async function findTimes(slug: string, date: string, partySize: number): Promise<TimeOption[]> {
  const sql = db();
  if (!sql || !DATE.test(date) || !Number.isInteger(partySize)) return [];
  const site = await getPublishedSite(sql, slug);
  if (!site) return [];
  const [slots, periods] = await Promise.all([
    availableSlots(sql, { orgId: site.orgId, venueId: site.venueId, date, partySize, channel: "online" }),
    sql<{ id: string; name: string }[]>`
      select id, name from service_periods where venue_id = ${site.venueId} and org_id = ${site.orgId}`,
  ]);
  const names = new Map(periods.map((p) => [p.id, p.name]));
  return slots.map((s) => ({
    time: s.time, label: formatClock(s.time), period: names.get(s.periodId) ?? "", depositCents: s.depositCents,
  }));
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
    };
    return { error: messages[result.reason] };
  }

  const h = await headers();
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

export async function cancelBooking(form: FormData): Promise<void> {
  const sql = db();
  const token = String(form.get("token") ?? "");
  const slug = String(form.get("site") ?? "");
  if (!sql || !token) return;
  const booking = await bookingByToken(sql, token);
  if (!booking) return;
  await cancelByToken(sql, token);
  redirect(`/s/${slug}/booking/${token}`);
}
