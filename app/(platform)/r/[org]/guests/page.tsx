import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";
import { formatPhone } from "@/lib/sites/format";

export const dynamic = "force-dynamic";

/**
 * The restaurant's guest list. Theirs: built from their bookings, never
 * shown to anyone else, exportable (coming), and the list the marketing
 * agents draw from — which is why consent is shown next to every name.
 */
export default async function Guests({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ q?: string }> }) {
  const { org: slug } = await params;
  const { q = "" } = await searchParams;
  const { tenant } = await requireTenant(slug);
  const sql = db()!;
  const term = q.trim().slice(0, 80);
  const like = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const digits = term.replace(/\D/g, "");

  const guests = await sql<{
    id: string; name: string; phone: string; email: string | null; visit_count: number; no_show_count: number;
    last_visit_at: Date | null; sms_consent_at: Date | null; sms_opted_out_at: Date | null; upcoming: Date | null;
  }[]>`
    select g.id, g.name, g.phone, g.email, g.visit_count, g.no_show_count, g.last_visit_at,
           g.sms_consent_at, g.sms_opted_out_at,
           (select min(r.starts_at) from reservations r
             where r.guest_id = g.id and r.starts_at > now() and r.status in ('booked','confirmed')) as upcoming
    from guests g
    where g.org_id = ${tenant.orgId}
      ${term ? sql`and (g.name ilike ${like} or g.email ilike ${like} ${digits.length >= 3 ? sql`or g.phone like ${`%${digits}%`}` : sql``})` : sql``}
    order by g.visit_count desc, g.last_visit_at desc nulls last, g.created_at desc
    limit 200`;
  const [{ total, textable }] = await sql<{ total: number; textable: number }[]>`
    select count(*)::int as total,
           count(*) filter (where sms_consent_at is not null and sms_opted_out_at is null and phone like '+%')::int as textable
    from guests where org_id = ${tenant.orgId}`;

  const date = (d: Date | null) => d ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d) : "—";

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Guests</h1>
          <p className="pf-sub">{total} guests · {textable} can receive marketing texts</p>
        </div>
        <div className="pf-daynav" style={{ flexWrap: "wrap" }}>
        {can(tenant, "manage_venue") && (
          <>
            <a className="pf-btn" href={`/r/${slug}/export/guests.csv`} download>Export guests</a>
            <a className="pf-btn" href={`/r/${slug}/export/bookings.csv`} download>Export bookings</a>
          </>
        )}
        <form className="pf-daynav" role="search">
          <input name="q" defaultValue={term} placeholder="Name, phone or email" aria-label="Search guests"
            className="pf-input" style={{ width: 260 }} />
          <button className="pf-btn" type="submit">Search</button>
        </form>
        </div>
      </div>
      <section className="pf-panel pf-scroll">
        {guests.length === 0 ? (
          <p className="pf-empty">{term ? "No guests match that." : "Guests appear here as they book."}</p>
        ) : (
          <table className="pf-table">
            <thead>
              <tr><th>Guest</th><th>Visits</th><th>Last visit</th><th>Next booking</th><th>Texts</th></tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{g.name}</div>
                    <div className="pf-sub" style={{ marginTop: 0 }}>{[g.phone.startsWith("+") ? formatPhone(g.phone) : null, g.email].filter(Boolean).join(" · ") || "No contact"}</div>
                  </td>
                  <td className="num">
                    {g.visit_count}
                    {g.no_show_count > 0 && <span className="pf-pill warn" style={{ marginLeft: 8 }}>{g.no_show_count} no-show</span>}
                  </td>
                  <td className="num">{date(g.last_visit_at)}</td>
                  <td className="num">{date(g.upcoming)}</td>
                  <td>
                    {g.sms_opted_out_at ? <span className="pf-pill dot stop">Opted out</span>
                      : g.sms_consent_at ? <span className="pf-pill dot go">Opted in</span>
                      : <span className="pf-pill">Bookings only</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
