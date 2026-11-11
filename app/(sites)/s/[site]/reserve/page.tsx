import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingWidget } from "@/components/sites/BookingWidget";
import { db } from "@/lib/db";
import { localDate } from "@/lib/reservations/time";
import { getPublishedSite } from "@/lib/sites/repo";

type Params = { params: Promise<{ site: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { site: slug } = await params;
  const sql = db();
  const site = sql ? await getPublishedSite(sql, slug) : null;
  if (!site) return {};
  return {
    title: `Reserve a table | ${site.content.brand.name}`,
    description: `Book a table at ${site.content.brand.name}. Instant confirmation by text.`,
    alternates: { canonical: `/s/${site.slug}/reserve` },
  };
}

export default async function ReservePage({ params, searchParams }: Params & { searchParams: Promise<{ date?: string; party?: string }> }) {
  const { site: slug } = await params;
  const q = await searchParams;
  const sql = db();
  const site = sql ? await getPublishedSite(sql, slug) : null;
  if (!site) notFound();
  const c = site.content;

  const today = localDate(new Date(), site.timezone);
  const [y, m, d] = today.split("-").map(Number);
  const maxDate = new Date(Date.UTC(y, m - 1, d + site.bookingHorizonDays)).toISOString().slice(0, 10);

  return (
    <div className="site-wrap site-book">
      <div className="head">
        <p className="site-eyebrow">Reservations</p>
        <h1>Reserve a table</h1>
        <p style={{ marginTop: 18 }}>Pick a time and it&rsquo;s yours. No account, no booking fee.</p>
        {c.contact.phone && (
          <p>
            Prefer to talk to someone?{" "}
            <a href={`tel:${c.contact.phone.replace(/[^\d+]/g, "")}`}>{c.contact.phone}</a>
          </p>
        )}
      </div>
      <div className="hours">
        <p className="site-eyebrow">Hours</p>
        <table className="site-hours" style={{ marginTop: 8 }}>
          <tbody>
            {c.hours.map((h) => (
              <tr key={h.days}><th scope="row">{h.days}</th><td>{h.hours}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <BookingWidget slug={site.slug} today={today} maxDate={maxDate} maxParty={site.maxPartyOnline} restaurant={c.brand.name}
        initialDate={q.date && /^\d{4}-\d{2}-\d{2}$/.test(q.date) ? q.date : undefined}
        initialParty={q.party ? Number(q.party) || undefined : undefined} />
    </div>
  );
}
