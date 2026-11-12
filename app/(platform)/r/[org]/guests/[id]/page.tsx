import { actorLabel } from "@/lib/agent-runtime/catalog";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateGuestAction } from "@/lib/guests/profile-actions";
import { guestProfile, type ProfileBooking } from "@/lib/guests/profile";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";
import { money } from "@/lib/reports/format";
import { formatPhone } from "@/lib/sites/format";
import { formatIn, venueTz } from "@/lib/platform/when";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; tone: string }> = {
  booked: { label: "Booked", tone: "info" }, confirmed: { label: "Confirmed", tone: "go" }, seated: { label: "Seated", tone: "go" },
  completed: { label: "Visited", tone: "go" }, cancelled: { label: "Cancelled", tone: "" }, no_show: { label: "No-show", tone: "stop" },
};
const SOURCE: Record<string, string> = { website: "Website", phone: "Phone", walk_in: "Walk-in", google: "Google", instagram: "Instagram", import: "Imported", agent: "The Pass", host: "Host stand" };

/**
 * One guest: who they are, what they've agreed to hear from you, and
 * everything they've done with the restaurant, newest first.
 */
export default async function GuestProfilePage({ params, searchParams }: {
  params: Promise<{ org: string; id: string }>; searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { org, id } = await params;
  const q = await searchParams;
  const { tenant, venues } = await requireTenant(org);
  const tz = venueTz(venues);
  const p = await guestProfile(db()!, tenant, id);
  if (!p) notFound();
  const g = p.guest;
  const manage = can(tenant, "manage_venue");
  const day = (d: Date) => formatIn(d, tz, "date");
  const at = (b: ProfileBooking) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: b.timezone }).format(b.startsAt);
  const ymd = (b: ProfileBooking) => new Intl.DateTimeFormat("en-CA", { timeZone: b.timezone }).format(b.startsAt);
  const openRewards = p.rewards.filter((r) => !r.redeemedAt);
  const contact = [g.phone.startsWith("+") ? formatPhone(g.phone) : null, g.email].filter(Boolean).join(" · ") || "No contact details";

  return (
    <>
      <div className="pf-head">
        <div>
          <p className="pf-sub" style={{ margin: "0 0 4px" }}><Link href={`/r/${org}/guests`}>Guests</Link> /</p>
          <h1>{g.name}</h1>
          <p className="pf-sub">{contact} · on your list since {day(g.createdAt)}</p>
        </div>
        {g.tags.length > 0 && <div className="pf-tags">{g.tags.map((t) => <span key={t} className="pf-pill">{t}</span>)}</div>}
      </div>
      {q.ok && <p className="pf-msg ok" role="status" style={{ marginBottom: 14 }}>{q.ok}</p>}
      {q.err && <p className="pf-msg err" role="alert" style={{ marginBottom: 14 }}>{q.err}</p>}

      <div className="pf-stats">
        <div className="pf-stat"><b>{g.visitCount}</b><span>visits</span></div>
        <div className="pf-stat"><b>{g.noShowCount}</b><span>no-shows</span></div>
        <div className="pf-stat"><b>{money(g.totalSpendCents || null)}</b><span>spend from checks</span></div>
        <div className="pf-stat"><b>{g.lastVisitAt ? day(g.lastVisitAt) : "—"}</b><span>last visit</span></div>
        <div className="pf-stat"><b>{p.upcoming[0] ? day(p.upcoming[0].startsAt) : "—"}</b><span>next booking</span></div>
      </div>

      <div className="pf-layout">
        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <section className="pf-panel pf-scroll">
            <h2>Bookings <span className="pf-h2-note">{p.upcoming.length} upcoming · {p.past.length} past</span></h2>
            {p.upcoming.length + p.past.length === 0 ? <p className="pf-empty">No bookings yet.</p> : (
              <table className="pf-table">
                <thead><tr><th>When</th><th>Party</th><th>Where</th><th>From</th><th>Status</th></tr></thead>
                <tbody>
                  {[...p.upcoming, ...p.past].map((b) => (
                    <tr key={b.id}>
                      <td className="num"><Link href={`/r/${org}/host?date=${ymd(b)}`}>{at(b)}</Link></td>
                      <td className="num">{b.partySize}</td>
                      <td>{b.venue}</td>
                      <td>{SOURCE[b.source] ?? b.source}</td>
                      <td>
                        <span className={`pf-pill dot ${STATUS[b.status]?.tone ?? ""}`}>{STATUS[b.status]?.label ?? b.status}</span>
                        {b.depositCents > 0 && <div className="pf-sub" style={{ margin: "4px 0 0", fontSize: 11.5 }}>{money(b.depositCents)} deposit · {b.depositStatus}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="pf-panel pf-scroll">
            <h2>Online orders</h2>
            {p.orders.length === 0 ? <p className="pf-empty">No online orders.</p> : (
              <table className="pf-table">
                <thead><tr><th>Order</th><th>Placed</th><th>Type</th><th>Paid</th><th>Status</th><th>Total</th></tr></thead>
                <tbody>
                  {p.orders.map((o) => (
                    <tr key={o.id}>
                      <td className="num">#{o.number}</td>
                      <td className="num">{day(o.createdAt)}</td>
                      <td>{o.kind === "catering" ? "Catering" : "Pickup"}</td>
                      <td>{o.payment === "paid" ? "Online" : o.payment === "at_pickup" ? "At pickup" : o.payment}</td>
                      <td><span className="pf-pill">{o.status.replace("_", " ")}</span></td>
                      <td className="num">{money(o.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="pf-panel pf-scroll">
            <h2>Messages sent <span className="pf-h2-note">texts and emails to this guest</span></h2>
            {p.messages.length === 0 ? <p className="pf-empty">Nothing sent yet.</p> : (
              <table className="pf-table">
                <thead><tr><th>When</th><th>Message</th><th>Kind</th><th>Status</th></tr></thead>
                <tbody>
                  {p.messages.map((m) => (
                    <tr key={m.id}>
                      <td className="num">{day(m.createdAt)}</td>
                      <td><div style={{ maxWidth: 420, overflowWrap: "anywhere" }}>{m.body}</div><div className="pf-sub" style={{ margin: "2px 0 0", fontSize: 11.5 }}>{m.channel === "email" ? "Email" : "Text"} · by {actorLabel(m.sentBy)}</div></td>
                      <td>{m.kind === "marketing" ? "Marketing" : "Booking / order"}</td>
                      <td><span className={`pf-pill dot ${m.status === "sent" ? "go" : m.status === "failed" ? "stop" : ""}`}>{m.status === "dry_run" ? "not sent" : m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="pf-panel">
            <h2>Timeline <span className="pf-h2-note">everything, newest first</span></h2>
            <div className="pf-body">
              <ol className="pf-tl">
                {p.timeline.slice(0, 150).map((e, i) => (
                  <li key={i}>
                    <span className="w mono">{day(e.at)}</span>
                    <span className={`k ${e.kind}`} aria-hidden />
                    <span className="t">{e.title}</span>
                    {e.detail && <span className="s">{e.detail}</span>}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>

        <aside className="pf-sticky">
          <section className="pf-panel">
            <h2>Marketing consent</h2>
            <div className="pf-body">
              <Consent label="Texts" at={g.smsConsentAt} source={g.smsConsentSource} out={g.smsOptedOutAt} day={day} reachable={g.phone.startsWith("+")} />
              <Consent label="Email" at={g.emailConsentAt} source={g.emailConsentSource} out={g.emailOptedOutAt} day={day} reachable={Boolean(g.email)} />
              <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>Booking confirmations and reminders don&rsquo;t need consent. Promotions do.</p>
            </div>
          </section>

          <section className="pf-panel">
            <h2>Loyalty</h2>
            <div className="pf-body">
              {!p.loyalty || !p.loyalty.active ? (
                <p className="pf-sub" style={{ margin: 0 }}>No loyalty program running. <Link href={`/r/${org}/settings/loyalty`}>Set one up</Link></p>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                    <span>{p.loyalty.towardNext} of {p.loyalty.visitsRequired} visits to the next reward</span>
                  </div>
                  <div className="pf-progress" role="progressbar" aria-valuemin={0} aria-valuemax={p.loyalty.visitsRequired} aria-valuenow={p.loyalty.towardNext ?? 0}>
                    <span style={{ width: `${((p.loyalty.towardNext ?? 0) / p.loyalty.visitsRequired) * 100}%` }} />
                  </div>
                  <span className="pf-sub" style={{ margin: 0, fontSize: 12 }}>Reward: {p.loyalty.reward}</span>
                </>
              )}
              {openRewards.length > 0 && (
                <div style={{ display: "grid", gap: 6 }}>
                  {openRewards.map((r) => <span key={r.id} className="pf-pill go dot">Open: {r.reward} (visit {r.earnedAtVisit})</span>)}
                  <span className="pf-sub" style={{ margin: 0, fontSize: 12 }}>Hand it over from the host stand.</span>
                </div>
              )}
              {p.rewards.length > openRewards.length && <span className="pf-sub" style={{ margin: 0, fontSize: 12 }}>{p.rewards.length - openRewards.length} reward{p.rewards.length - openRewards.length === 1 ? "" : "s"} redeemed before.</span>}
            </div>
          </section>

          <section className="pf-panel">
            <h2>Gift cards</h2>
            <div className="pf-body">
              {p.giftCards.length === 0 ? <p className="pf-sub" style={{ margin: 0 }}>{g.email ? "None bought with their email." : "Add an email to match gift cards they bought."}</p> :
                p.giftCards.map((c) => (
                  <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13.5 }}>
                    <span><Link className="mono" href={`/r/${org}/gift-cards?code=${encodeURIComponent(c.code)}`}>{c.code}</Link> <span className="pf-sub">{c.role === "bought" ? (c.recipientName ? `for ${c.recipientName}` : "bought") : "received"}</span></span>
                    <span className="mono">{money(c.balanceCents)} / {money(c.initialCents)}</span>
                  </div>
                ))}
            </div>
          </section>

          <section className="pf-panel">
            <h2>{manage ? "Edit guest" : "Notes"}</h2>
            {manage ? (
              <form action={updateGuestAction} className="pf-body">
                <input type="hidden" name="org" value={org} />
                <input type="hidden" name="id" value={g.id} />
                <div className="pf-field"><label htmlFor="g-name">Name</label><input id="g-name" name="name" defaultValue={g.name} required maxLength={120} /></div>
                <div className="pf-field"><label htmlFor="g-email">Email</label><input id="g-email" name="email" type="email" defaultValue={g.email ?? ""} /></div>
                <div className="pf-field"><label htmlFor="g-tags">Tags, separated by commas</label><input id="g-tags" name="tags" defaultValue={g.tags.join(", ")} placeholder="regular, VIP, shellfish allergy" /></div>
                <div className="pf-field"><label htmlFor="g-notes">Notes</label><textarea id="g-notes" name="notes" defaultValue={g.notes ?? ""} rows={4} maxLength={2000} /></div>
                <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>The phone number is how this guest is matched, so it isn&rsquo;t changed here. Edits are recorded with your name.</p>
                <button className="pf-btn primary" type="submit">Save</button>
              </form>
            ) : (
              <div className="pf-body">
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{g.notes || <span className="pf-sub">No notes.</span>}</p>
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

function Consent({ label, at, source, out, day, reachable }: { label: string; at: Date | null; source: string | null; out: Date | null; day: (d: Date) => string; reachable: boolean }) {
  const state = out ? { pill: "stop", text: "Opted out", detail: `Stopped ${day(out)}${at ? ` · had agreed ${day(at)}` : ""}` }
    : at ? { pill: "go", text: "Opted in", detail: `Agreed ${day(at)}${source ? ` via ${source}` : ""}` }
    : { pill: "", text: reachable ? "Not asked" : "No contact", detail: reachable ? "Booking and order messages only" : `No ${label === "Texts" ? "mobile number" : "email address"} on file` };
  return (
    <div style={{ display: "grid", gap: 4, paddingBottom: 10, borderBottom: "1px solid var(--rule)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <b style={{ fontWeight: 600 }}>{label}</b>
        <span className={`pf-pill dot ${state.pill}`}>{state.text}</span>
      </div>
      <span className="pf-sub" style={{ margin: 0, fontSize: 12 }}>{state.detail}</span>
    </div>
  );
}
