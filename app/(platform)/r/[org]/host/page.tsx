import Link from "next/link";
import { HostControls } from "./HostControlsBridge";
import { LiveRefresh } from "@/components/platform/LiveRefresh";
import { db } from "@/lib/db";
import { openRewards } from "@/lib/guests/loyalty";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";
import { formatLate, HOLD_GRACE_MINUTES, isLate, LATE_AFTER_MINUTES, lateFirst, minutesLate, UNDO_MINUTES } from "@/lib/reservations/floor";
import { dayBook, floorNow, type Reservation } from "@/lib/reservations/repo";
import { localDate, localTime } from "@/lib/reservations/time";
import { todaysRequests, waitingList } from "@/lib/reservations/waitlist";
import { formatClock, formatPhone } from "@/lib/sites/format";

export const dynamic = "force-dynamic";

const PILL: Record<string, { label: string; tone: string }> = {
  booked: { label: "Booked", tone: "info" },
  confirmed: { label: "Confirmed", tone: "info" },
  seated: { label: "Seated", tone: "go" },
  completed: { label: "Done", tone: "" },
  cancelled: { label: "Cancelled", tone: "" },
  no_show: { label: "No-show", tone: "stop" },
};
const SOURCE: Record<string, string> = { website: "Website", phone: "Phone", walk_in: "Walk-in", google: "Google", instagram: "Instagram", import: "Imported", agent: "Agent" };
const UNDO_LABEL: Record<string, string> = { seated: "Seat", completed: "Done", no_show: "No-show" };

/** The guest's record, not counting this booking if it is itself the no-show. */
function priorNoShows(r: Reservation) {
  return r.guestNoShows - (r.status === "no_show" ? 1 : 0);
}

function shift(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export default async function HostStand({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ date?: string; venue?: string }> }) {
  const { org: slug } = await params;
  const q = await searchParams;
  const { tenant, venues, org } = await requireTenant(slug);
  const sql = db()!;
  const venue = venues.find((v) => v.id === q.venue) ?? venues[0];
  if (!venue) return <p className="pf-empty">No venues set up yet.</p>;

  const now = new Date();
  const tz = venue.timezone;
  const today = localDate(now, tz);
  const date = q.date && /^\d{4}-\d{2}-\d{2}$/.test(q.date) ? q.date : today;
  const isToday = date === today;
  const [book, tables, waiting, signups] = await Promise.all([
    dayBook(sql, tenant, venue.id, date),
    isToday ? floorNow(sql, tenant, venue.id, now) : Promise.resolve([]),
    isToday ? waitingList(sql, tenant, venue.id, now) : Promise.resolve([]),
    isToday ? todaysRequests(sql, tenant, venue.id, date) : Promise.resolve([]),
  ]);
  const rewards = await openRewards(sql, tenant, [...new Set(book.map((r) => r.guestId))]);
  const live = book.filter((r) => r.status !== "cancelled");
  const expected = live.filter((r) => r.status === "booked" || r.status === "confirmed");
  const canAct = can(tenant, "book", venue.id);
  const clock = (d: Date) => formatClock(localTime(d, tz));
  const shortClock = (d: Date) => clock(d).replace(/\s?[AP]M$/, "");

  // Late parties first, then the day by time.
  const late = isToday ? lateFirst(expected, now).filter((r) => isLate(r.startsAt, now)) : [];
  const byTime = new Map<string, Reservation[]>();
  for (const r of book) {
    if (late.includes(r)) continue;
    const t = localTime(r.startsAt, tz);
    byTime.set(t, [...(byTime.get(t) ?? []), r]);
  }
  const href = (d: string) => `/r/${org.slug}/host?date=${d}${venues.length > 1 ? `&venue=${venue.id}` : ""}`;
  const label = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`));
  const occupied = tables.filter((t) => t.occupant);
  const free = tables.filter((t) => !t.occupant);
  // New online bookings for today (not the ones taken here) chime.
  const watch = isToday
    ? [...book.filter((r) => !["walk_in", "phone"].includes(r.source)).map((r) => r.id), ...signups.map((s) => s.id)]
    : [];

  const row = (r: Reservation) => {
    const pill = PILL[r.status];
    const done = ["completed", "cancelled", "no_show"].includes(r.status);
    const who = `${r.guestName}, party of ${r.partySize} at ${clock(r.startsAt)}`;
    const lateBy = minutesLate(r.startsAt, now);
    const isLateRow = late.includes(r);
    const last = r.lastChange;
    const undoUntil = last && UNDO_LABEL[last.action] && last.action === r.status ? last.at.getTime() + UNDO_MINUTES * 60_000 : null;
    return (
      <div key={r.id} className={`pf-res${done ? " done" : ""}${isLateRow ? " late" : ""}`}>
        <div>
          <div className="pf-res-name">
            {r.guestName}<span className="party">×{r.partySize}</span>
            {isLateRow && <span className="pf-res-time mono">{clock(r.startsAt)}</span>}
          </div>
          <div className="pf-res-meta">
            {isLateRow
              ? <span className="pf-pill stop dot" aria-label={`Late by ${Math.floor(lateBy / 60)} hours ${lateBy % 60} minutes`}>Late {formatLate(lateBy)}</span>
              : <span className={`pf-pill dot ${pill.tone}`}>{pill.label}</span>}
            {r.tableLabels.length > 0 && <span className="mono">{r.tableLabels.join(", ")}</span>}
            {r.tableReleased && <span className="pf-pill warn" title={`Released ${HOLD_GRACE_MINUTES} min after their time`}>Table given away</span>}
            <span>{SOURCE[r.source] ?? r.source}</span>
            {r.guestPhone.startsWith("+") && (
              <a className="pf-tel" href={`tel:${r.guestPhone}`} aria-label={`Call ${r.guestName}, ${formatPhone(r.guestPhone)}`}>{formatPhone(r.guestPhone)}</a>
            )}
            {r.guestVisits > 0 && <span className="pf-pill go">{r.guestVisits} {r.guestVisits === 1 ? "visit" : "visits"}</span>}
            {r.guestVisits === 0 && r.source !== "walk_in" && <span className="pf-pill">First visit</span>}
            {r.depositCents > 0 && (
              <span className={`pf-pill ${r.depositStatus === "held" || r.depositStatus === "captured" ? "go" : r.depositStatus === "refunded" ? "" : "warn"}`}>
                ${(r.depositCents / 100).toFixed(0)} deposit {r.depositStatus === "held" || r.depositStatus === "captured" ? "paid" : r.depositStatus === "refunded" ? "refunded" : "due"}
              </span>
            )}
            {priorNoShows(r) > 0 && <span className="pf-pill warn">{priorNoShows(r)} earlier no-show{priorNoShows(r) > 1 ? "s" : ""}</span>}
          </div>
          {r.notes && <div className="pf-res-note">{r.notes}</div>}
        </div>
        <div className="pf-res-side">
          {canAct && rewards.get(r.guestId) && !["cancelled", "no_show"].includes(r.status) && (
            <HostControls.Redeem org={org.slug} id={rewards.get(r.guestId)!.id} reward={rewards.get(r.guestId)!.reward} who={who} />
          )}
          {canAct && r.depositCents > 0 && r.depositStatus === "pending" && !done && <HostControls.MarkPaid org={org.slug} id={r.id} who={who} />}
          <HostControls.Status org={org.slug} id={r.id} status={r.status} canAct={canAct} who={who} isToday={isToday}
            noShowFrom={r.startsAt.getTime() + LATE_AFTER_MINUTES * 60_000}
            noShowLabel={clock(new Date(r.startsAt.getTime() + LATE_AFTER_MINUTES * 60_000))}
            undoUntil={undoUntil} undoLabel={last ? UNDO_LABEL[last.action] ?? null : null} />
        </div>
      </div>
    );
  };

  return (
    <HostControls.Toasts>
      <div className="pf-head">
        <div>
          <h1>{isToday ? "Today" : label}</h1>
          <p className="pf-sub">{isToday ? label : ""}{venues.length > 1 ? ` · ${venue.name}` : ""}</p>
        </div>
        <div className="pf-daynav">
          {isToday && <LiveRefresh watch={watch} noun="booking" storageKey="pass:chime-muted:host" />}
          <Link className="pf-btn" href={href(shift(date, -1))} aria-label="Previous day">←</Link>
          {!isToday && <Link className="pf-btn primary" href={href(today)}>Today</Link>}
          <Link className="pf-btn" href={href(shift(date, 1))} aria-label="Next day">→</Link>
        </div>
      </div>

      <div className="pf-stats pf-host-stats">
        <div className="pf-stat"><b>{live.length}</b><span>bookings</span></div>
        <div className="pf-stat"><b>{live.reduce((s, r) => s + r.partySize, 0)}</b><span>covers</span></div>
        <div className="pf-stat"><b>{expected.length}</b><span>still to arrive</span></div>
        <div className={`pf-stat${isToday && book.some((r) => r.status === "seated") ? " live" : ""}`}><b>{book.filter((r) => r.status === "seated").length}</b><span>seated now</span></div>
        <div className="pf-stat"><b>{book.filter((r) => r.status === "no_show").length}</b><span>no-shows</span></div>
      </div>

      <div className="pf-layout">
        <section className="pf-panel" aria-label="Bookings">
          {late.length > 0 && (
            <div className="pf-slot pf-slot-late">
              <div className="pf-slot-time">Late</div>
              <div>{late.map(row)}</div>
            </div>
          )}
          {book.length === 0 ? (
            <p className="pf-empty">No bookings yet for this day.</p>
          ) : (
            [...byTime.entries()].map(([time, rows]) => (
              <div key={time} className="pf-slot">
                <div className="pf-slot-time">{formatClock(time)}</div>
                <div>{rows.map(row)}</div>
              </div>
            ))
          )}
        </section>

        <aside className="pf-sticky pf-host-aside">
          {isToday && (
            <section className="pf-panel" aria-label="Tables now">
              <h2>Tables now · {occupied.length} seated, {free.length} free</h2>
              <ul className="pf-floor">
                {occupied.map((t) => (
                  <li key={t.tableId} className="busy">
                    <span className="mono">{t.label}</span> · {t.occupant!.source === "walk_in" && t.occupant!.guestName === "Walk-in" ? "Walk-in" : t.occupant!.guestName}
                    {t.occupant!.source === "walk_in" && t.occupant!.guestName !== "Walk-in" ? " (walk-in)" : ""}, seated {shortClock(t.occupant!.seatedAt)}
                  </li>
                ))}
                {free.length > 0 && (
                  <li className="free">Free: {free.map((t) => <span key={t.tableId} className="mono pf-free-chip">{t.label}<small>{t.minCovers}–{t.maxCovers}</small></span>)}</li>
                )}
              </ul>
            </section>
          )}

          {isToday && (waiting.length > 0 || signups.length > 0 || canAct) && (
            <section className="pf-panel" aria-label="Waitlist">
              <h2>Waitlist · {waiting.length}</h2>
              {waiting.length === 0 && <p className="pf-empty" style={{ padding: "14px 16px" }}>No one waiting. When a walk-in doesn&rsquo;t fit, add them from the Walk-in form.</p>}
              {waiting.map((w) => {
                const mins = Math.max(0, Math.floor((now.getTime() - w.createdAt.getTime()) / 60_000));
                const over = mins > w.quotedMinutes;
                const who = `${w.name}, party of ${w.partySize}`;
                return (
                  <div key={w.id} className="pf-res pf-wait">
                    <div>
                      <div className="pf-res-name">{w.name}<span className="party">×{w.partySize}</span></div>
                      <div className="pf-res-meta">
                        <span className={`pf-pill ${over ? "stop" : "info"}`}>Quoted {w.quotedMinutes} min · waiting {mins}</span>
                        <span>added {shortClock(w.createdAt)}</span>
                        {w.phone && <a className="pf-tel" href={`tel:${w.phone}`} aria-label={`Call ${w.name}`}>{formatPhone(w.phone)}</a>}
                        {w.textedAt && <span className="pf-pill go">Texted {shortClock(w.textedAt)}</span>}
                      </div>
                    </div>
                    {canAct && <HostControls.Waiting org={org.slug} id={w.id} who={who} hasPhone={Boolean(w.phone)} texted={Boolean(w.textedAt)} />}
                  </div>
                );
              })}
              {signups.length > 0 && (
                <>
                  <h2>Text me if a table opens · {signups.length}</h2>
                  {signups.map((s) => (
                    <div key={s.id} className="pf-res pf-wait">
                      <div>
                        <div className="pf-res-name">{s.name}<span className="party">×{s.partySize}</span></div>
                        <div className="pf-res-meta">
                          <span>Online · signed up {shortClock(s.createdAt)}</span>
                          <a className="pf-tel" href={`tel:${s.phone}`} aria-label={`Call ${s.name}`}>{formatPhone(s.phone)}</a>
                          {s.notifiedAt && <span className="pf-pill go">Notified {shortClock(s.notifiedAt)}</span>}
                        </div>
                      </div>
                      {canAct && <HostControls.Notify org={org.slug} id={s.id} who={`${s.name}, party of ${s.partySize}`} notified={s.status === "notified"} />}
                    </div>
                  ))}
                </>
              )}
            </section>
          )}

          {canAct && isToday && (
            <section className="pf-panel">
              <h2>Walk-in</h2>
              <HostControls.WalkIn org={org.slug} venueId={venue.id} />
            </section>
          )}
          {canAct && (
            <section className="pf-panel">
              <h2>Phone booking · {isToday ? "today" : label}</h2>
              <HostControls.Phone org={org.slug} venueId={venue.id} date={date} />
            </section>
          )}
        </aside>
      </div>
    </HostControls.Toasts>
  );
}
