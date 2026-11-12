import Link from "next/link";
import { dollars, longDay, num, usualLine, type MorningPass as Brief } from "@/lib/brief";

const yesterdayLabel = (date: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

/**
 * "Your morning pass" at the top of Home: last night, today, what's
 * waiting, what The Pass did yesterday, and heads-ups. Compact and
 * scannable; every block links to where its detail lives. Unknown
 * numbers read "—".
 */
export function MorningPass({ b, hide = [] }: { b: Brief; hide?: string[] }) {
  const base = `/r/${b.org.slug}`;
  const l = b.lastNight, t = b.today;
  const heads = b.headsUps.filter((h) => !hide.some((x) => h.text.startsWith(x)));
  return (
    <section className="pf-panel pf-mp" aria-labelledby="pf-mp-h">
      <h2 id="pf-mp-h">Your morning pass <span className="pf-h2-note">{longDay(b.date)}</span></h2>
      {heads.length > 0 && (
        <ul className="pf-mp-heads" aria-label="Heads-up">
          {heads.map((h) => <li key={h.text}><Link href={h.href}>{h.text}</Link></li>)}
        </ul>
      )}
      <div className="pf-mp-grid">
        <Link href={`${base}/host?date=${l.date}`} className="pf-mp-block">
          <h3>Last night <span>{yesterdayLabel(l.date)}</span></h3>
          <dl className="pf-mp-nums">
            <div><dt>Covers</dt><dd className="mono">{num(l.covers)}</dd></div>
            <div><dt>No-shows</dt><dd className="mono">{num(l.noShows)}</dd></div>
            <div><dt>Walk-ins</dt><dd className="mono">{num(l.walkIns)}</dd></div>
            <div><dt>Online</dt><dd className="mono">{l.onlineOrders === null ? "—" : `${num(l.onlineOrders)} · ${dollars(l.onlineSalesCents)}`}</dd></div>
          </dl>
        </Link>
        <Link href={`${base}/host`} className="pf-mp-block">
          <h3>Today</h3>
          <p className="pf-mp-lead"><b className="mono">{t.covers}</b> covers in <b className="mono">{t.bookings}</b> booking{t.bookings === 1 ? "" : "s"}</p>
          <p className="pf-mp-line">{t.vsUsual ? usualLine(b) : "Usual for this day: — (not enough history yet)"}</p>
          <p className="pf-mp-line">First booking: {t.firstBooking ?? "—"}</p>
          {(t.largeParties.length > 0 || t.notes.length > 0) && (
            <ul className="pf-mp-list">
              {t.largeParties.map((p) => <li key={`l${p.time}${p.name}`}><span className="mono">{p.time}</span> Party of {p.size} · {p.name}</li>)}
              {t.notes.map((p) => <li key={`n${p.time}${p.name}`}><span className="mono">{p.time}</span> {p.name}: {p.note}</li>)}
            </ul>
          )}
        </Link>
        <div className="pf-mp-block">
          <h3>Waiting for you <span>{b.waiting.count}</span></h3>
          {b.waiting.count === 0 ? <p className="pf-mp-line">Nothing waiting.</p> : (
            <ul className="pf-mp-list">
              {b.waiting.top.map((w) => <li key={w.href}><Link href={w.href}>{w.title}</Link> <span className="pf-mp-from">· {w.from}</span></li>)}
              {b.waiting.count > b.waiting.top.length && <li><Link href={`${base}/agents#queue`}>{b.waiting.count - b.waiting.top.length} more</Link></li>}
            </ul>
          )}
        </div>
        <div className="pf-mp-block">
          <h3>What The Pass did yesterday</h3>
          {b.didYesterday.length === 0 ? <p className="pf-mp-line">Nothing yesterday.</p> : (
            <ul className="pf-mp-list">
              {b.didYesterday.slice(0, 4).map((d, i) => <li key={i}>{d.station && <span className="pf-mp-from">{d.station} ·</span>} {d.text}</li>)}
              {b.didYesterday.length > 4 && <li><Link href={`${base}/agents`}>{b.didYesterday.length - 4} more on Stations</Link></li>}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
