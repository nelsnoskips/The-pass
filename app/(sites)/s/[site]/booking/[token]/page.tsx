import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CancelBooking } from "@/components/sites/CancelBooking";
import { ChangeBooking } from "@/components/sites/ChangeBooking";
import {
  cancelOutcome, cancelledDepositText, depositState, formatDeposit, policySentence, refundDeadline,
} from "@/lib/reservations/policy";
import { bookingByToken } from "@/lib/reservations/repo";
import { localDate } from "@/lib/reservations/time";
import { formatPhone, formatWhen, formatWhenZoned, mapHref, telHref } from "@/lib/sites/format";
import { getPublishedSite } from "@/lib/sites/repo";

// A private page reached by an unguessable link: never indexed.
export const metadata: Metadata = { title: "Your reservation", robots: { index: false, follow: false } };

function maxDate(tz: string, horizonDays: number) {
  const [y, m, d] = localDate(new Date(), tz).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + horizonDays)).toISOString().slice(0, 10);
}

const STATUS: Record<string, { label: string; tone: "ok" | "off" }> = {
  booked: { label: "Confirmed", tone: "ok" },
  confirmed: { label: "Confirmed", tone: "ok" },
  seated: { label: "Seated", tone: "ok" },
  completed: { label: "Completed", tone: "off" },
  cancelled: { label: "Cancelled", tone: "off" },
  no_show: { label: "Missed", tone: "off" },
};

export default async function BookingPage({ params, searchParams }: { params: Promise<{ site: string; token: string }>; searchParams: Promise<{ changed?: string; paid?: string }> }) {
  const { site: slug, token } = await params;
  const { changed, paid } = await searchParams;
  const sql = db();
  if (!sql) notFound();
  const [site, booking] = await Promise.all([getPublishedSite(sql, slug), bookingByToken(sql, token)]);
  // The token must belong to this restaurant's site.
  if (!site || !booking || booking.orgId !== site.orgId) notFound();

  const c = site.content;
  const status = STATUS[booking.status];
  const canCancel = booking.status === "booked" || booking.status === "confirmed";
  const first = booking.guestName.split(" ")[0];
  const tz = booking.timezone;
  const when = formatWhen(booking.startsAt, tz);
  const phone = c.contact.phone || (booking.venuePhone ? formatPhone(booking.venuePhone) : "");
  const address = c.contact.address || booking.venueAddress || "";
  const deposit = depositState(booking.depositCents, booking.depositStatus);
  const amount = formatDeposit(booking.depositCents);
  const now = new Date();
  const deadline = refundDeadline(booking.startsAt, booking.cancelCutoffHours);
  const beforeDeadline = deadline > now;
  const outcome = cancelOutcome({ ...booking, cutoffHours: booking.cancelCutoffHours, now });
  const guests = `${booking.partySize} ${booking.partySize === 1 ? "guest" : "guests"}`;
  const rebook = `/s/${site.slug}/reserve?party=${booking.partySize}`;

  return (
    <div className="site-wrap" style={{ maxWidth: 640, padding: "64px 24px 96px" }}>
      <span className={`site-status ${status.tone}`}>{status.label}</span>
      <h1 style={{ fontSize: "clamp(32px, 5vw, 46px)", lineHeight: 1.08, marginTop: 18 }}>
        {booking.status === "cancelled"
          ? "This reservation is cancelled."
          : canCancel
            ? changed ? `Done — you're moved, ${first}.` : `You're booked, ${first}.`
            : "Your reservation"}
      </h1>

      {paid && canCancel && <p className="site-note" role="status" style={{ marginTop: 14 }}>Deposit received — thank you. It comes off your bill.</p>}
      {booking.status === "cancelled" && (
        <p style={{ marginTop: 14 }}>
          {cancelledDepositText(booking.depositCents, booking.depositStatus) ?? "Nothing more to do — the table has gone back to the restaurant."}
        </p>
      )}
      <dl className="site-summary">
        <div><dt>Where</dt><dd>{c.brand.name}</dd></div>
        <div><dt>When</dt><dd>{when}</dd></div>
        <div><dt>Guests</dt><dd>{booking.partySize}</dd></div>
        {deposit !== "none" && (
          <div>
            <dt>Deposit</dt>
            <dd>
              {amount} · {deposit === "paid" ? (booking.status === "cancelled" ? "kept" : "paid, comes off your bill")
                : deposit === "refunded" ? "refunded"
                : booking.status === "cancelled" ? "not taken" : "not paid yet"}
            </dd>
          </div>
        )}
        {booking.notes && <div><dt>Your note</dt><dd>{booking.notes}</dd></div>}
        {address && (
          <div><dt>Address</dt><dd><a href={mapHref(address, c.contact.mapUrl)} target="_blank" rel="noopener noreferrer">{address}</a></dd></div>
        )}
        {phone && <div><dt>Phone</dt><dd><a href={telHref(phone)}>{phone}</a></dd></div>}
      </dl>

      {canCancel ? (
        <div className="site-stack">
          <div className="site-actions">
            <a href={`/s/${site.slug}/booking/${token}/calendar.ics`} className="site-btn ghost" download="reservation.ics">Add to calendar</a>
            {address && <a href={mapHref(address, c.contact.mapUrl)} target="_blank" rel="noopener noreferrer" className="site-btn ghost">Directions</a>}
            {phone && <a href={telHref(phone)} className="site-btn ghost">Call {c.brand.name}</a>}
          </div>
          <div className="site-note site-policy">
            <p style={{ color: "var(--ink)" }}>{policySentence(booking.cancelCutoffHours, booking.depositCents)}</p>
            {deposit === "paid" || deposit === "due" ? (
              <p>
                {beforeDeadline
                  ? <>Cancel by <b>{formatWhenZoned(deadline, tz)}</b> for a full refund.</>
                  : <>The refund cut-off was {formatWhenZoned(deadline, tz)}.</>}
              </p>
            ) : null}
            {site.cancellationPolicy && <p>{site.cancellationPolicy}</p>}
          </div>
          <ChangeBooking
            token={token} slug={site.slug}
            date={localDate(booking.startsAt, tz)} party={booking.partySize}
            today={localDate(new Date(), tz)} maxDate={maxDate(tz, site.bookingHorizonDays)}
            maxParty={site.maxPartyOnline}
          />
          <p className="site-note" style={{ margin: "8px 0 0" }}>
            Can&rsquo;t make it? Cancel and the table goes to someone on the waiting list.
          </p>
          <CancelBooking token={token} slug={site.slug} summary={`your table for ${guests} on ${when}`}
            outcome={outcome.text} refund={outcome.refund} />
        </div>
      ) : (
        <Link href={rebook} className="site-btn">{booking.status === "cancelled" ? "Book another time" : "Book another table"}</Link>
      )}
    </div>
  );
}
