import Link from "next/link";
import { DayBars, HBars, Kpi } from "@/components/platform/ReportBits";
import { db } from "@/lib/db";
import type { Tenant } from "@/lib/platform/tenant";
import { count, money, pct } from "@/lib/reports/format";
import { overviewReport } from "@/lib/reports/overview";
import type { Periods } from "@/lib/reports/period";
import { share } from "@/lib/reports/period";
import { bookingsReport, guestsReport, ordersReport } from "@/lib/reports/sections";
import { formatIn } from "@/lib/platform/when";

/**
 * The reporting tabs other than Ads. Each loads its own report from
 * lib/reports and lays it out; no numbers are worked out here.
 */

const SOURCE: Record<string, string> = { website: "Your website", phone: "Phone", walk_in: "Walk-in", google: "Google", instagram: "Instagram", import: "Imported", agent: "Agent", host: "Host stand" };
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hourLabel = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "a" : "p"}`;


interface TabProps { org: string; tenant: Tenant; p: Periods; compare: boolean }

const GROUPS: { title: string; keys: string[] }[] = [
  { title: "In the room", keys: ["covers", "bookings", "no_show_rate"] },
  { title: "Online orders", keys: ["online_sales", "orders", "average_order"] },
  { title: "Guests", keys: ["new_guests", "repeat_share", "messages"] },
  { title: "Loyalty and gift cards", keys: ["rewards_earned", "rewards_redeemed", "gift_sold", "gift_redeemed"] },
];

export async function OverviewTab({ org, tenant, p, compare }: TabProps) {
  const r = await overviewReport(db()!, tenant, p);
  const byKey = new Map(r.metrics.map((m) => [m.key, m]));
  const setup: Record<string, { show: boolean; text: string; href: string }> = {
    "Online orders": { show: !r.available.ordering, text: "Turn on online ordering", href: `/r/${org}/orders` },
    "Loyalty and gift cards": { show: !r.available.loyalty && !r.available.giftCards, text: "Set up loyalty", href: `/r/${org}/settings/loyalty` },
  };
  return (
    <>
      {GROUPS.map((g) => (
        <section key={g.title} className="pf-panel pf-rgroup">
          <h2>{g.title}{compare && <span className="pf-h2-note">vs the previous {p.days} days</span>}</h2>
          <div className="pf-kpis">
            {g.keys.map((k) => byKey.get(k)!).map((m) => (
              <Kpi key={m.key} label={m.label} unit={m.unit} cur={m.cur} prev={m.prev} days={p.days} upIsGood={m.upIsGood} definition={m.definition} compare={compare} />
            ))}
          </div>
          {setup[g.title]?.show && (
            <div className="pf-body" style={{ paddingTop: 12 }}>
              <p className="pf-sub" style={{ margin: 0 }}>— means this isn&rsquo;t set up yet. <Link href={setup[g.title].href}>{setup[g.title].text}</Link></p>
            </div>
          )}
        </section>
      ))}
    </>
  );
}

export async function BookingsTab({ org, tenant, p, compare }: TabProps) {
  const r = await bookingsReport(db()!, tenant, p);
  const maxHeat = Math.max(1, ...r.heat.flat());
  return (
    <>
      <section className="pf-panel pf-rgroup">
        <div className="pf-kpis">
          <Kpi label="Bookings" unit="count" cur={r.total.bookings} prev={r.prevTotal.bookings} days={p.days} compare={compare}
            definition="Reservations and walk-ins for dates in this period, not counting cancellations." />
          <Kpi label="Covers booked" unit="count" cur={r.total.covers} prev={r.prevTotal.covers} days={p.days} compare={compare}
            definition="Party sizes of those bookings added up, including ones still to come." />
          <Kpi label="Average party" unit="count" cur={r.total.bookings ? r.total.covers / r.total.bookings : null}
            prev={r.prevTotal.bookings ? r.prevTotal.covers / r.prevTotal.bookings : null} days={p.days} compare={compare}
            definition="Covers booked divided by bookings." />
        </div>
        <div className="pf-body">
          <DayBars days={r.days.map((d) => ({ day: d.day, value: d.bookings }))} prev={compare ? r.prevDays.map((d) => ({ day: d.day, value: d.bookings })) : null}
            unit="count" noun="bookings" label={`Bookings per day over the last ${p.days} days`} />
        </div>
      </section>

      <div className="pf-layout">
        <section className="pf-panel">
          <h2>When people book to come in <span className="pf-h2-note">day of week by hour</span></h2>
          <div className="pf-body">
            {r.hours.length === 0 ? <p className="pf-sub" style={{ margin: 0 }}>No bookings in this period.</p> : (
              <div className="pf-heat mono" role="table" aria-label="Bookings by day of week and hour">
                <div className="row" role="row" style={{ ["--cols" as string]: r.hours.length }}>
                  <span />
                  {r.hours.map((h) => <span key={h} className="hh" role="columnheader">{hourLabel(h)}</span>)}
                </div>
                {DOW.map((dn, dow) => (
                  <div key={dn} className="row" role="row" style={{ ["--cols" as string]: r.hours.length }}>
                    <span role="rowheader">{dn}</span>
                    {r.hours.map((h) => {
                      const v = r.heat[dow][h];
                      return (
                        <span key={h} className="cell" role="cell" title={`${dn} ${hourLabel(h)}: ${v} booking${v === 1 ? "" : "s"}`}>
                          {v > 0 && <i style={{ opacity: 0.18 + 0.82 * (v / maxHeat) }} />}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        <aside style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <section className="pf-panel">
            <h2>By source</h2>
            <div className="pf-body">
              <HBars rows={r.bySource.map((s) => ({ label: SOURCE[s.source] ?? s.source, value: s.bookings, display: `${s.bookings} · ${pct(share(s.bookings, r.total.bookings))}` }))} empty="No bookings in this period." />
            </div>
          </section>
          <section className="pf-panel">
            <h2>By party size</h2>
            <div className="pf-body">
              <HBars rows={r.byParty.map((s) => ({ label: s.size === "1" ? "1 guest" : `${s.size} guests`, value: s.bookings, display: count(s.bookings) }))} empty="No bookings in this period." />
            </div>
          </section>
          <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>See each night on the <Link href={`/r/${org}/host`}>host stand</Link>.</p>
        </aside>
      </div>
    </>
  );
}

export async function OrdersTab({ org, tenant, p, compare }: TabProps) {
  const r = await ordersReport(db()!, tenant, p);
  const avg = (t: { orders: number; salesCents: number }) => (t.orders ? Math.round(t.salesCents / t.orders) : null);
  const paidTotal = r.byPayment.paidOnlineCents + r.byPayment.atPickupCents;
  return (
    <>
      <section className="pf-panel pf-rgroup">
        <div className="pf-kpis">
          <Kpi label="Online sales" unit="money" cur={r.total.salesCents} prev={r.prevTotal.salesCents} days={p.days} compare={compare}
            definition="Totals (with tax and tip) of pickup and catering orders placed in this period, not cancelled." />
          <Kpi label="Orders" unit="count" cur={r.total.orders} prev={r.prevTotal.orders} days={p.days} compare={compare}
            definition="Pickup and catering orders placed in this period, not cancelled." />
          <Kpi label="Average order" unit="money" cur={avg(r.total)} prev={avg(r.prevTotal)} days={p.days} compare={compare}
            definition="Online sales divided by orders." />
        </div>
        <div className="pf-body">
          <DayBars days={r.days.map((d) => ({ day: d.day, value: d.salesCents }))} prev={compare ? r.prevDays.map((d) => ({ day: d.day, value: d.salesCents })) : null}
            unit="money" noun="in orders" label={`Online sales per day over the last ${p.days} days`} />
        </div>
      </section>

      <div className="pf-layout">
        <section className="pf-panel pf-scroll">
          <h2>Top items <span className="pf-h2-note">by quantity</span></h2>
          {r.topItems.length === 0 ? <p className="pf-empty">No orders in this period.</p> : (
            <table className="pf-table">
              <thead><tr><th>Item</th><th>Sold</th><th>Sales</th></tr></thead>
              <tbody>
                {r.topItems.map((i) => (
                  <tr key={i.name}><td>{i.name}</td><td className="num">{count(i.qty)}</td><td className="num">{money(i.salesCents)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <aside style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <section className="pf-panel">
            <h2>Pickup and catering</h2>
            <div className="pf-body">
              <HBars rows={r.byKind.map((k) => ({ label: k.kind === "pickup" ? "Pickup" : "Catering", value: k.salesCents, display: `${money(k.salesCents)} · ${k.orders}` }))} empty="No orders in this period." />
            </div>
          </section>
          <section className="pf-panel">
            <h2>How it was paid</h2>
            <div className="pf-body">
              {paidTotal === 0 ? <p className="pf-sub" style={{ margin: 0 }}>No orders in this period.</p> : (
                <>
                  <div className="pf-split" role="img" aria-label={`${pct(share(r.byPayment.paidOnlineCents, paidTotal))} paid online`}>
                    <span className="a" style={{ width: `${(r.byPayment.paidOnlineCents / paidTotal) * 100}%` }} />
                    <span className="b" style={{ width: `${(r.byPayment.atPickupCents / paidTotal) * 100}%` }} />
                  </div>
                  <p className="pf-legend mono"><span className="sw today" /> paid online {money(r.byPayment.paidOnlineCents)} <span className="sw then" /> at pickup {money(r.byPayment.atPickupCents)}</p>
                  <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>Pay-at-pickup money is taken at your counter, not through The Pass. <Link href={`/r/${org}/financials`}>See financials</Link></p>
                </>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

export async function GuestsTab({ org, tenant, p, compare }: TabProps) {
  const r = await guestsReport(db()!, tenant, p);
  const visitors = r.firstTime + r.returning;
  const prevVisitors = r.prevFirstTime + r.prevReturning;
  return (
    <>
      <section className="pf-panel pf-rgroup">
        <div className="pf-kpis">
          <Kpi label="New guests" unit="count" cur={r.newGuests} prev={r.prevNewGuests} days={p.days} compare={compare}
            definition="Guests added to your list for the first time: by booking, ordering or import." />
          <Kpi label="First-time visitors" unit="count" cur={r.firstTime} prev={r.prevFirstTime} days={p.days} compare={compare}
            definition="Guests who were seated or paid a check in this period, with no visit before it." />
          <Kpi label="Returning visitors" unit="count" cur={r.returning} prev={r.prevReturning} days={p.days} compare={compare}
            definition="Guests who visited in this period and had visited before." />
          <Kpi label="Repeat guests" unit="pct" cur={share(r.returning, visitors)} prev={share(r.prevReturning, prevVisitors)} days={p.days} compare={compare}
            definition="Returning visitors as a share of everyone who visited." />
        </div>
        <div className="pf-body">
          {visitors === 0 ? <p className="pf-sub" style={{ margin: 0 }}>No visits recorded in this period.</p> : (
            <>
              <div className="pf-split" role="img" aria-label={`${r.returning} returning and ${r.firstTime} first-time visitors`}>
                <span className="a" style={{ width: `${(r.returning / visitors) * 100}%` }} />
                <span className="b" style={{ width: `${(r.firstTime / visitors) * 100}%` }} />
              </div>
              <p className="pf-legend mono"><span className="sw today" /> returning {r.returning} <span className="sw then" /> first time {r.firstTime}</p>
            </>
          )}
        </div>
      </section>

      <div className="pf-layout">
        <section className="pf-panel pf-scroll">
          <h2>Top guests <span className="pf-h2-note">by visits, all time</span></h2>
          {r.top.length === 0 ? <p className="pf-empty">No visits recorded yet.</p> : (
            <table className="pf-table">
              <thead><tr><th>Guest</th><th>Visits</th><th>Spend</th><th>Last visit</th></tr></thead>
              <tbody>
                {r.top.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <Link href={`/r/${org}/guests/${g.id}`} style={{ fontWeight: 600 }}>{g.name}</Link>
                      {g.noShows > 0 && <span className="pf-pill warn" style={{ marginLeft: 8 }}>{g.noShows} no-show</span>}
                    </td>
                    <td className="num">{g.visits}</td>
                    <td className="num">{money(g.spendCents)}</td>
                    <td className="num">{formatIn(g.lastVisitAt, p.tz, "date")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <aside style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <section className="pf-panel">
            <h2>How often guests come <span className="pf-h2-note">all time</span></h2>
            <div className="pf-body">
              <HBars rows={r.frequency.map((f) => ({ label: f.label, value: f.guests, display: count(f.guests) }))} empty="No visits recorded yet." />
              <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>{count(r.neverVisited)} more on your list haven&rsquo;t visited yet (booked ahead, ordered online, or imported).</p>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
