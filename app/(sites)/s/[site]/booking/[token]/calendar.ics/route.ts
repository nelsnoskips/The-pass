import { db } from "@/lib/db";
import { bookingIcs } from "@/lib/reservations/ics";
import { bookingByToken } from "@/lib/reservations/repo";
import { formatPhone } from "@/lib/sites/format";
import { getPublishedSite } from "@/lib/sites/repo";

/** "Add to calendar" for a guest's own booking, by its private link. */
export async function GET(req: Request, { params }: { params: Promise<{ site: string; token: string }> }) {
  const { site: slug, token } = await params;
  const sql = db();
  if (!sql) return new Response("Not found", { status: 404 });
  const [site, booking] = await Promise.all([getPublishedSite(sql, slug), bookingByToken(sql, token)]);
  if (!site || !booking || booking.orgId !== site.orgId || booking.status === "cancelled") {
    return new Response("Not found", { status: 404 });
  }
  const c = site.content;
  const manageUrl = new URL(`/s/${site.slug}/booking/${token}`, req.url).toString();
  const body = bookingIcs({
    uid: `${booking.id}@thepass`,
    restaurant: c.brand.name,
    partySize: booking.partySize,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    address: c.contact.address || booking.venueAddress,
    phone: c.contact.phone || (booking.venuePhone ? formatPhone(booking.venuePhone) : null),
    manageUrl,
  });
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="reservation.ics"`,
      // A private link: never cached by anyone in between, never indexed.
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
