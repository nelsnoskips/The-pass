import Link from "next/link";
import { HostControls } from "./HostControlsBridge";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";
import { dayBook, type Reservation } from "@/lib/reservations/repo";
import { localDate, localTime } from "@/lib/reservations/time";
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

  const today = localDate(new Date(), venue.timezone);
  const date = q.date && /^\d{4}-\d{2}-\d{2}$/.test(q.date) ? q.date : today;
  const book = await dayBook(sql, tenant, venue.id, date);
  const live = book.filter((r) => r.status !== "cancelled");
  const expected = live.filter((r) => r.status === "booked" || r.status === "confirmed");
  const canAct = can(tenant, "book", venue.id);

  const byTime = new Map<string, Reservation[]>();
  for (const r of book) {
    const t = localTime(r.startsAt, venue.timezone);
    byTime.set(t, [...(byTime.get(t) ?? []), r]);
  }
  const href = (d: string) => `/r/${org.slug}/host?date=${d}${venues.length > 1 ? `&venue=${venue.id}` : ""}`;
  const label = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`));

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>{date === today ? "Today" : label}</h1>
          <p className="pf-sub">{date === today ? label : ""}{venues.length > 1 ? ` · ${venue.name}` : ""}</p>
        </div>
        <div className="pf-daynav">
          <Link className="pf-btn" href={href(shift(date, -1))} aria-label="Previous day">←</Link>
          {date !== today && <Link className="pf-btn primary" href={href(today)}>Today</Link>}
          <Link className="pf-btn" href={href(shift(date, 1))} aria-label="Next day">→</Link>
        </div>
      </div>

      <div className="pf-stats">
        <div className="pf-stat"><b>{live.length}</b><span>bookings</span></div>
        <div className="pf-stat"><b>{live.reduce((s, r) => s + r.partySize, 0)}</b><span>covers</span></div>
        <div className="pf-stat"><b>{expected.length}</b><span>still to arrive</span></div>
        <div className={`pf-stat${date === today && book.some((r) => r.status === "seated") ? " live" : ""}`}><b>{book.filter((r) => r.status === "seated").length}</b><span>seated now</span></div>
        <div className="pf-stat"><b>{book.filter((r) => r.status === "no_show").length}</b><span>no-shows</span></div>
      </div>

      <div className="pf-layout">
        <section className="pf-panel" aria-label="Bookings">
          {book.length === 0 ? (
            <p className="pf-empty">No bookings yet for this day.</p>
          ) : (
            [...byTime.entries()].map(([time, rows]) => (
              <div key={time} className="pf-slot">
                <div className="pf-slot-time">{formatClock(time)}</div>
                <div>
                  {rows.map((r) => {
                    const pill = PILL[r.status];
                    const done = ["completed", "cancelled", "no_show"].includes(r.status);
                    return (
                      <div key={r.id} className={`pf-res${done ? " done" : ""}`}>
                        <div>
                          <div className="pf-res-name">
                            {r.guestName}<span className="party">×{r.partySize}</span>
                          </div>
                          <div className="pf-res-meta">
                            <span className={`pf-pill dot ${pill.tone}`}>{pill.label}</span>
                            {r.tableLabels.length > 0 && <span className="mono">{r.tableLabels.join(", ")}</span>}
                            <span>{SOURCE[r.source] ?? r.source}</span>
                            {r.guestPhone.startsWith("+") && <a href={`tel:${r.guestPhone}`}>{formatPhone(r.guestPhone)}</a>}
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
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {canAct && r.depositCents > 0 && r.depositStatus === "pending" && !done && <HostControls.MarkPaid org={org.slug} id={r.id} />}
                          <HostControls.Status org={org.slug} id={r.id} status={r.status} canAct={canAct} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>

        {canAct && (
          <aside className="pf-sticky">
            {date === today && (
              <section className="pf-panel">
                <h2>Walk-in</h2>
                <HostControls.WalkIn org={org.slug} venueId={venue.id} />
              </section>
            )}
            <section className="pf-panel">
              <h2>Phone booking · {date === today ? "today" : label}</h2>
              <HostControls.Phone org={org.slug} venueId={venue.id} date={date} />
            </section>
          </aside>
        )}
      </div>
    </>
  );
}
