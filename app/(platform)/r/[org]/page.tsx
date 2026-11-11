import Link from "next/link";
import { ChatComposer } from "@/components/platform/ChatComposer";
import { db } from "@/lib/db";
import { actionWords, AGENT_CARDS, agentName } from "@/lib/agent-runtime/catalog";
import { getOrderingSettings } from "@/lib/ordering";
import { requireTenant } from "@/lib/platform/context";
import { listOrgIntegrations } from "@/lib/platform/settings";
import { localDate, localTime, zonedToUtc } from "@/lib/reservations/time";
import { listVersions, siteForOrg } from "@/lib/sites/repo";

export const dynamic = "force-dynamic";

const LIVE = ['booked', 'confirmed', 'seated', 'completed'];
const ago = (d: Date) => {
  const m = Math.max(1, Math.round((Date.now() - d.getTime()) / 60_000));
  return m < 60 ? `${m}m ago` : m < 48 * 60 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

/**
 * The restaurant's cockpit: today against the same day last week, the
 * shape of the day by hour, what the agents want approved, and what
 * they've been doing.
 */
export default async function Home({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const { tenant, venues } = await requireTenant(org);
  const sql = db()!;
  const venue = venues[0];
  if (!venue) return <p className="pf-empty">No venues yet.</p>;
  const tz = venue.timezone;
  const now = new Date();
  const today = localDate(now, tz);
  const start = zonedToUtc(today, "00:00", tz);
  const end = new Date(start.getTime() + 86_400_000);
  const lwStart = new Date(start.getTime() - 7 * 86_400_000);
  const lwEnd = new Date(end.getTime() - 7 * 86_400_000);
  const week = new Date(start.getTime() + 7 * 86_400_000);

  const [day, hours, sales, fresh, pending, runs, activity, days, seats, ordering, site, ints] = await Promise.all([
    sql<{ lw: boolean; covers: number; bookings: number }[]>`
      select starts_at < ${start} as lw, coalesce(sum(party_size), 0)::int as covers, count(*)::int as bookings
      from reservations where org_id = ${tenant.orgId} and venue_id = ${venue.id} and status = any(${LIVE})
        and ((starts_at >= ${start} and starts_at < ${end}) or (starts_at >= ${lwStart} and starts_at < ${lwEnd}))
      group by 1`,
    sql<{ lw: boolean; h: number; covers: number }[]>`
      select starts_at < ${start} as lw, extract(hour from starts_at at time zone ${tz})::int as h, sum(party_size)::int as covers
      from reservations where org_id = ${tenant.orgId} and venue_id = ${venue.id} and status = any(${LIVE})
        and ((starts_at >= ${start} and starts_at < ${end}) or (starts_at >= ${lwStart} and starts_at < ${lwEnd}))
      group by 1, 2`,
    sql<{ lw: boolean; cents: number; n: number }[]>`
      select created_at < ${start} as lw, coalesce(sum(total_cents), 0)::int as cents, count(*)::int as n
      from orders where org_id = ${tenant.orgId} and status not in ('awaiting_payment', 'cancelled')
        and ((created_at >= ${start} and created_at < ${end}) or (created_at >= ${lwStart} and created_at < ${lwEnd}))
      group by 1`,
    sql<{ lw: boolean; n: number }[]>`
      select created_at < ${start} as lw, count(*)::int as n from guests where org_id = ${tenant.orgId}
        and ((created_at >= ${start} and created_at < ${end}) or (created_at >= ${lwStart} and created_at < ${lwEnd}))
      group by 1`,
    sql<{ id: string; agent_id: string; title: string; rationale: string; created_at: Date }[]>`
      select id, agent_id, title, rationale, created_at from agent_proposals
      where org_id = ${tenant.orgId} and status = 'pending' order by created_at desc limit 5`,
    sql<{ agent_id: string; runs: number; proposed: number; last: Date | null }[]>`
      select a.agent_id, count(*) filter (where a.started_at > now() - interval '7 days')::int as runs,
        (select count(*)::int from agent_proposals p where p.org_id = a.org_id and p.agent_id = a.agent_id and p.created_at > now() - interval '7 days') as proposed,
        max(a.started_at) as last
      from agent_runs a where a.org_id = ${tenant.orgId} group by a.org_id, a.agent_id`,
    sql<{ actor: string; action: string; created_at: Date }[]>`
      select actor, action, created_at from change_log
      where org_id = ${tenant.orgId} and actor like 'agent:%' order by created_at desc limit 8`,
    sql<{ day: string; covers: number }[]>`
      select to_char(starts_at at time zone ${tz}, 'YYYY-MM-DD') as day, sum(party_size)::int as covers
      from reservations where org_id = ${tenant.orgId} and venue_id = ${venue.id} and status = any(${LIVE})
        and starts_at >= ${start} and starts_at < ${week}
      group by 1`,
    sql<{ seats: number }[]>`select coalesce(sum(max_covers), 0)::int as seats from dining_tables where venue_id = ${venue.id} and org_id = ${tenant.orgId} and active`,
    getOrderingSettings(sql, tenant.orgId),
    siteForOrg(sql, tenant),
    listOrgIntegrations(sql, tenant),
  ]);

  const pick = <T extends { lw: boolean }>(rows: T[], lw: boolean) => rows.find((r) => r.lw === lw);
  const sellsOnline = ordering.pickupEnabled || ordering.cateringEnabled || sales.length > 0;
  const kpis = [
    { label: "Covers", now: pick(day, false)?.covers ?? 0, then: pick(day, true)?.covers ?? 0, fmt: (n: number) => String(n) },
    { label: "Bookings", now: pick(day, false)?.bookings ?? 0, then: pick(day, true)?.bookings ?? 0, fmt: (n: number) => String(n) },
    sellsOnline
      ? { label: "Online sales", now: pick(sales, false)?.cents ?? 0, then: pick(sales, true)?.cents ?? 0, fmt: (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}` }
      : { label: "Online sales", now: null, then: null, fmt: () => "—" },
    { label: "New guests", now: pick(fresh, false)?.n ?? 0, then: pick(fresh, true)?.n ?? 0, fmt: (n: number) => String(n) },
  ];

  const byHour = (lw: boolean) => new Map(hours.filter((h) => h.lw === lw).map((h) => [h.h, h.covers]));
  const nowH = byHour(false), thenH = byHour(true);
  const span = [...nowH.keys(), ...thenH.keys()];
  const first = span.length ? Math.min(11, ...span) : 11, last = span.length ? Math.max(22, ...span) : 22;
  const hourList = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const maxH = Math.max(1, ...nowH.values(), ...thenH.values());
  const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "a" : "p"}`;
  const currentHour = Number(localTime(now, tz).slice(0, 2));

  const runBy = new Map(runs.map((r) => [r.agent_id, r]));
  const live = AGENT_CARDS.filter((a) => runBy.get(a.id)?.last && runBy.get(a.id)!.last! > new Date(now.getTime() - 14 * 86_400_000)).length;
  const versions = site ? await listVersions(sql, tenant, site.id) : [];
  const draft = versions[0] && !versions[0].live;
  const requested = ints.filter((i) => i.status === "requested").length;
  const byDay = new Map(days.map((d) => [d.day, d.covers]));
  const weekRows = Array.from({ length: 7 }, (_, i) => {
    const [y, m, d] = today.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    return { date, covers: byDay.get(date) ?? 0 };
  });
  const maxWeek = Math.max(seats[0].seats, ...weekRows.map((w) => w.covers), 1);
  const hour = currentHour;
  const greeting = hour >= 5 && hour < 12 ? "Good morning" : hour >= 12 && hour < 17 ? "Good afternoon" : hour >= 17 && hour < 23 ? "Good evening" : "Late service";
  const longDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${today}T12:00:00Z`));
  const lastWeekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${today}T12:00:00Z`));
  const dayLabel = (date: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

  return (
    <div className="pf-home">
      <div className="pf-head">
        <div>
          <h1>{greeting}</h1>
          <p className="pf-sub">{venue.name} · {longDate}</p>
        </div>
        <Link className="pf-btn primary" href={`/r/${org}/host`}>Open the host stand</Link>
      </div>

      <div style={{ marginBottom: 18 }}>
        <ChatComposer org={org} thread={null} suggestions={["How does tonight look?", "Pause pickup orders for 20 minutes", "What are my reservation settings?"]} />
      </div>

      <section className="pf-panel">
        <h2>Today <span className="pf-h2-note">vs last {lastWeekday}</span></h2>
        <div className="pf-kpis">
          {kpis.map((k) => {
            const delta = k.now === null || k.then === null ? null : k.now - k.then;
            return (
              <div key={k.label} className="pf-kpi">
                <span className="l">{k.label}</span>
                <b className="mono">{k.now === null ? "—" : k.fmt(k.now)}</b>
                <span className={`d ${delta === null || delta === 0 ? "" : delta > 0 ? "up" : "down"}`}>
                  {delta === null ? "Not taking online orders" : delta === 0 ? `Same as last ${lastWeekday}` : `${delta > 0 ? "↑" : "↓"} ${k.fmt(Math.abs(delta))} · ${k.then === null ? "—" : k.fmt(k.then)} last week`}
                </span>
              </div>
            );
          })}
        </div>
        <div className="pf-body" style={{ paddingTop: 4 }}>
          <div className="pf-hours" role="img" aria-label="Covers by hour today, against the same day last week">
            {hourList.map((h) => (
              <div key={h} className={`pf-hour${h === currentHour ? " now" : ""}`} title={`${hourLabel(h)}: ${nowH.get(h) ?? 0} covers today, ${thenH.get(h) ?? 0} last ${lastWeekday}`}>
                <span className="then" style={{ height: `${((thenH.get(h) ?? 0) / maxH) * 100}%` }} />
                <span className="today" style={{ height: `${Math.max((nowH.get(h) ?? 0) ? 3 : 0, ((nowH.get(h) ?? 0) / maxH) * 100)}%` }} />
                <i className="mono">{hourLabel(h)}</i>
              </div>
            ))}
          </div>
          <p className="pf-legend mono"><span className="sw today" /> covers today <span className="sw then" /> last {lastWeekday}</p>
        </div>
      </section>

      <div className="pf-layout" style={{ marginTop: 18 }}>
        <div style={{ display: "grid", gap: 18 }}>
          <section className="pf-panel">
            <h2>Needs your approval · {pending.length}</h2>
            {pending.length === 0 ? <p className="pf-empty" style={{ padding: "22px 16px" }}>Nothing waiting. When an agent wants to act, it shows up here first.</p> : pending.map((p) => (
              <article key={p.id} className="pf-approve">
                <div className="pf-res-meta" style={{ marginTop: 0 }}>
                  <span className="pf-pill info">✦ Created by {agentName(p.agent_id)}</span>
                  <span className="mono">{ago(p.created_at)}</span>
                </div>
                <div className="pf-res-name">{p.title}</div>
                {p.rationale && <p className="r">{p.rationale}</p>}
                <Link className="pf-btn small ai" href={`/r/${org}/agents#p-${p.id}`}>Review</Link>
              </article>
            ))}
          </section>

          <section className="pf-panel">
            <h2>The week ahead</h2>
            <div className="pf-body" style={{ gap: 8 }}>
              {weekRows.map((w) => (
                <Link key={w.date} href={`/r/${org}/host?date=${w.date}`} className="pf-weekrow">
                  <span className="mono">{dayLabel(w.date)}</span>
                  <span className="bar"><span style={{ width: `${(w.covers / maxWeek) * 100}%` }} /></span>
                  <span className="mono n">{w.covers} <span>covers</span></span>
                </Link>
              ))}
            </div>
          </section>
        </div>

        <aside className="pf-sticky">
          <section className="pf-panel">
            <h2>Your agents <span className="pf-h2-note">{live} of {AGENT_CARDS.length} working</span></h2>
            <div className="pf-body">
              {AGENT_CARDS.map((a) => {
                const r = runBy.get(a.id);
                return (
                  <Link key={a.id} href={`/r/${org}/agents`} className="pf-agentrow">
                    <span className={`pf-dot${r?.last && r.last > new Date(now.getTime() - 14 * 86_400_000) ? " on" : ""}`} aria-hidden />
                    <span className="n">{a.name}</span>
                    <span className="mono s">{r ? `${r.runs} run${r.runs === 1 ? "" : "s"} · ${r.proposed} proposed` : "Not run yet"}</span>
                  </Link>
                );
              })}
              <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>Last 7 days.</p>
            </div>
          </section>
          <section className="pf-panel">
            <h2>Recent activity</h2>
            <div className="pf-body" style={{ gap: 10 }}>
              {activity.length === 0 ? <p className="pf-sub" style={{ margin: 0 }}>No agent activity yet.</p> : activity.map((a, i) => (
                <div key={i} className="pf-feed">
                  <span className="t">{actionWords(a.action)}</span>
                  <span className="mono s">{agentName(a.actor.replace(/^agent:/, ""))} · {ago(a.created_at)}</span>
                </div>
              ))}
            </div>
          </section>
          {(draft || requested > 0) && (
            <section className="pf-panel">
              <h2>Also waiting</h2>
              <div className="pf-body">
                {draft && <Link className="pf-btn small" href={`/r/${org}/website`} style={{ justifyContent: "flex-start" }}>An unpublished website draft</Link>}
                {requested > 0 && <Link className="pf-btn small" href={`/r/${org}/settings`} style={{ justifyContent: "flex-start" }}>{requested} connection{requested > 1 ? "s" : ""} being set up</Link>}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
