import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { listOrgIntegrations } from "@/lib/platform/settings";
import { localDate, localTime, zonedToUtc } from "@/lib/reservations/time";
import { listVersions, siteForOrg } from "@/lib/sites/repo";

export const dynamic = "force-dynamic";

/**
 * The restaurant's front page: tonight, the week ahead, and anything
 * waiting on a person. Each tile links to where it's handled.
 */
export default async function Overview({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const { tenant, venues } = await requireTenant(org);
  const sql = db()!;
  const venue = venues[0];
  if (!venue) return <p className="pf-empty">No venues yet.</p>;

  const today = localDate(new Date(), venue.timezone);
  const from = zonedToUtc(today, "00:00", venue.timezone);
  const to = new Date(from.getTime() + 7 * 86_400_000);
  const [days, pending, msgs, guests, site, ints, seats] = await Promise.all([
    sql<{ day: string; covers: number; bookings: number }[]>`
      select to_char(starts_at at time zone ${venue.timezone}, 'YYYY-MM-DD') as day,
             sum(party_size)::int as covers, count(*)::int as bookings
      from reservations
      where org_id = ${tenant.orgId} and venue_id = ${venue.id} and status in ('booked','confirmed','seated','completed')
        and starts_at >= ${from} and starts_at < ${to}
      group by 1 order by 1`,
    sql<{ n: number }[]>`select count(*)::int as n from agent_proposals where org_id = ${tenant.orgId} and status = 'pending'`,
    sql<{ n: number }[]>`select count(*)::int as n from guest_messages where org_id = ${tenant.orgId} and created_at > now() - interval '7 days'`,
    sql<{ total: number; fresh: number; textable: number }[]>`
      select count(*)::int as total,
             count(*) filter (where created_at > now() - interval '30 days')::int as fresh,
             count(*) filter (where sms_consent_at is not null and sms_opted_out_at is null and phone like '+%')::int as textable
      from guests where org_id = ${tenant.orgId}`,
    siteForOrg(sql, tenant),
    listOrgIntegrations(sql, tenant),
    sql<{ seats: number }[]>`select coalesce(sum(max_covers), 0)::int as seats from dining_tables where venue_id = ${venue.id} and org_id = ${tenant.orgId} and active`,
  ]);
  const versions = site ? await listVersions(sql, tenant, site.id) : [];
  const draft = versions[0] && !versions[0].live;
  const byDay = new Map(days.map((d) => [d.day, d]));
  const week = Array.from({ length: 7 }, (_, i) => {
    const [y, m, d] = today.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    return { date, ...(byDay.get(date) ?? { covers: 0, bookings: 0 }) };
  });
  const max = Math.max(seats[0].seats, ...week.map((w) => w.covers), 1);
  const tonight = week[0];
  const requested = ints.filter((i) => i.status === "requested").length;
  // The restaurant's clock, not the server's.
  const hour = Number(localTime(new Date(), venue.timezone).slice(0, 2));
  const greeting = hour >= 5 && hour < 12 ? "Good morning" : hour >= 12 && hour < 17 ? "Good afternoon" : hour >= 17 && hour < 23 ? "Good evening" : "Late service";
  const longDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${today}T12:00:00Z`));
  const label = (date: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

  const todo: { text: string; href: string; ai?: boolean }[] = [];
  if (pending[0].n) todo.push({ text: `${pending[0].n} agent proposal${pending[0].n > 1 ? "s" : ""} waiting for you`, href: `/r/${org}/agents`, ai: true });
  if (draft) todo.push({ text: "An unpublished website draft", href: `/r/${org}/website` });
  if (requested) todo.push({ text: `${requested} connection${requested > 1 ? "s" : ""} being set up by The Pass team`, href: `/r/${org}/settings` });

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>{greeting}</h1>
          <p className="pf-sub">{venue.name} · {longDate}</p>
        </div>
        <Link className="pf-btn primary" href={`/r/${org}/host`}>Open the host stand</Link>
      </div>

      <div className="pf-stats">
        <div className="pf-stat"><b>{tonight.covers}</b><span>covers today · {tonight.bookings} bookings</span></div>
        <div className="pf-stat"><b>{Math.round((tonight.covers / Math.max(1, seats[0].seats)) * 100)}%</b><span>of {seats[0].seats} seats booked today</span></div>
        <div className="pf-stat"><b>{week.reduce((s, w) => s + w.covers, 0)}</b><span>covers, next 7 days</span></div>
        <div className="pf-stat"><b>{guests[0].total}</b><span>guests · {guests[0].fresh} new this month</span></div>
        <div className="pf-stat"><b>{msgs[0].n}</b><span>texts sent this week</span></div>
      </div>

      <div className="pf-layout">
        <section className="pf-panel">
          <h2>The week ahead</h2>
          <div className="pf-body" style={{ gap: 8 }}>
            {week.map((w) => (
              <Link key={w.date} href={`/r/${org}/host?date=${w.date}`} style={{ display: "grid", gridTemplateColumns: "70px minmax(0, 1fr) 90px", gap: 12, alignItems: "center", textDecoration: "none" }}>
                <span className="mono" style={{ fontSize: 13, color: "var(--muted)" }}>{label(w.date)}</span>
                <span style={{ height: 10, borderRadius: 999, background: "oklch(1 0 0 / 0.06)", overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${(w.covers / max) * 100}%`, borderRadius: 999, background: "linear-gradient(90deg, var(--brand), var(--brand-2))", boxShadow: "0 0 12px oklch(0.72 0.075 78 / 0.5)", transition: "width .6s var(--spring)" }} />
                </span>
                <span className="mono" style={{ fontSize: 13, textAlign: "right" }}>{w.covers} <span style={{ color: "var(--faint)" }}>covers</span></span>
              </Link>
            ))}
          </div>
        </section>
        <aside className="pf-sticky">
          <section className="pf-panel">
            <h2>Waiting on you</h2>
            <div className="pf-body">
              {todo.length === 0 ? <p className="pf-sub" style={{ margin: 0 }}>Nothing. Everything&rsquo;s handled.</p> : todo.map((t) => (
                <Link key={t.text} href={t.href} className={`pf-btn${t.ai ? " ai" : ""}`} style={{ justifyContent: "flex-start" }}>
                  {t.ai && <span aria-hidden>✦</span>}{t.text}
                </Link>
              ))}
            </div>
          </section>
          <section className="pf-panel">
            <h2>Guest list</h2>
            <div className="pf-body">
              <p style={{ margin: 0 }}><b className="mono">{guests[0].textable}</b> <span className="pf-sub">of {guests[0].total} guests can get texts from you.</span></p>
              <Link className="pf-btn small" href={`/r/${org}/messages`}>Write to them</Link>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
