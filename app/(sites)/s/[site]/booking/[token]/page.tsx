import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { bookingByToken } from "@/lib/reservations/repo";
import { cancelBooking } from "@/lib/sites/actions";
import { formatWhen } from "@/lib/sites/format";
import { getPublishedSite } from "@/lib/sites/repo";

// A private page reached by an unguessable link: never indexed.
export const metadata: Metadata = { title: "Your reservation", robots: { index: false, follow: false } };

const STATUS: Record<string, { label: string; tone: "ok" | "off" }> = {
  booked: { label: "Confirmed", tone: "ok" },
  confirmed: { label: "Confirmed", tone: "ok" },
  seated: { label: "Seated", tone: "ok" },
  completed: { label: "Completed", tone: "off" },
  cancelled: { label: "Cancelled", tone: "off" },
  no_show: { label: "Missed", tone: "off" },
};

export default async function BookingPage({ params }: { params: Promise<{ site: string; token: string }> }) {
  const { site: slug, token } = await params;
  const sql = db();
  if (!sql) notFound();
  const [site, booking] = await Promise.all([getPublishedSite(sql, slug), bookingByToken(sql, token)]);
  // The token must belong to this restaurant's site.
  if (!site || !booking || booking.orgId !== site.orgId) notFound();

  const c = site.content;
  const status = STATUS[booking.status];
  const canCancel = booking.status === "booked" || booking.status === "confirmed";
  const first = booking.guestName.split(" ")[0];

  return (
    <div className="site-wrap" style={{ maxWidth: 640, padding: "64px 24px 96px" }}>
      <span className={`site-status ${status.tone}`}>{status.label}</span>
      <h1 style={{ fontSize: "clamp(32px, 5vw, 46px)", lineHeight: 1.08, marginTop: 18 }}>
        {booking.status === "cancelled"
          ? "This reservation is cancelled."
          : canCancel
            ? `You're booked, ${first}.`
            : "Your reservation"}
      </h1>

      <dl className="site-summary">
        <div><dt>Where</dt><dd>{c.brand.name}</dd></div>
        <div><dt>When</dt><dd>{formatWhen(booking.startsAt, booking.timezone)}</dd></div>
        <div><dt>Guests</dt><dd>{booking.partySize}</dd></div>
        {booking.notes && <div><dt>Your note</dt><dd>{booking.notes}</dd></div>}
        {c.contact.address && <div><dt>Address</dt><dd>{c.contact.address}</dd></div>}
      </dl>

      {canCancel ? (
        <>
          <p className="site-note" style={{ marginBottom: 20 }}>
            Plans changed? Cancel here and the table goes back to someone else.
            To change the time or party size, cancel and book again{c.contact.phone ? `, or call ${c.contact.phone}` : ""}.
          </p>
          <form action={cancelBooking}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="site" value={site.slug} />
            <button type="submit" className="site-btn ghost">Cancel this reservation</button>
          </form>
        </>
      ) : (
        <Link href={`/s/${site.slug}/reserve`} className="site-btn">Book another table</Link>
      )}
    </div>
  );
}
