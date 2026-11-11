import { PillarLevers } from "@/components/platform/PillarLevers";
import { SettingsNav } from "@/components/platform/SettingsNav";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { getVenueRules, listPeriods, listTables } from "@/lib/platform/settings";
import { deletePeriodAction, savePeriodAction, saveRulesAction, saveTableAction } from "@/lib/platform/settings-actions";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const box = { display: "flex", gap: 6, alignItems: "center", fontSize: 13 } as const;

export default async function Floor({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string; venue?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant, venues } = await requireTenant(org);
  const venue = venues.find((v) => v.id === q.venue) ?? venues[0];
  if (!venue) return <p className="pf-empty">No venues yet.</p>;
  const sql = db()!;
  const [tables, periods, rules] = await Promise.all([listTables(sql, tenant, venue.id), listPeriods(sql, tenant, venue.id), getVenueRules(sql, tenant, venue.id)]);
  const edit = can(tenant, "manage_venue", venue.id);
  const seats = tables.filter((t) => t.active).reduce((s, t) => s + t.maxCovers, 0);
  const hidden = (<><input type="hidden" name="org" value={org} /><input type="hidden" name="venue" value={venue.id} /></>);

  return (
    <>
      <div className="pf-head"><div><h1>Settings</h1><p className="pf-sub">{venue.name} · {tables.length} tables · {seats} seats</p></div></div>
      <SettingsNav org={org} ok={q.ok} err={q.err} />
      <PillarLevers pillar="reservations" org={org} tenant={tenant} />

      <section className="pf-panel" style={{ marginBottom: 14 }}>
        <h2>Service hours</h2>
        <div className="pf-body">
          <p className="pf-sub" style={{ margin: 0 }}>When guests can book. Pacing caps how many guests can start in one slot; a deposit holds the table and is refunded if they cancel in time.</p>
          {[...periods, null].map((p) => (
            <form key={p?.id ?? "new"} action={savePeriodAction} style={{ display: "grid", gap: 10, padding: 12, border: "1px solid var(--rule)", borderRadius: 12 }}>
              {hidden}
              {p && <input type="hidden" name="id" value={p.id} />}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
                <div className="pf-field"><label>Service</label><input name="name" defaultValue={p?.name ?? ""} placeholder={p ? "" : "New service, e.g. Lunch"} disabled={!edit} /></div>
                <div className="pf-field"><label>First seating</label><input name="first" type="time" defaultValue={p?.firstSeating ?? "17:00"} disabled={!edit} /></div>
                <div className="pf-field"><label>Last seating</label><input name="last" type="time" defaultValue={p?.lastSeating ?? "21:00"} disabled={!edit} /></div>
                <div className="pf-field"><label>Every</label>
                  <select name="slot" defaultValue={String(p?.slotMinutes ?? 15)} disabled={!edit}>{[10, 15, 20, 30, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
                </div>
                <div className="pf-field"><label>Pacing (guests/slot)</label><input name="pacing" type="number" min={1} defaultValue={p?.maxCoversPerSlot ?? ""} placeholder="No cap" disabled={!edit} /></div>
                <div className="pf-field"><label>Deposit per guest $</label><input name="deposit" type="number" min={0} step="0.01" defaultValue={p ? (p.depositCentsPerCover / 100 || "") : ""} placeholder="None" disabled={!edit} /></div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                {DAYS.map((d, i) => (
                  <label key={d} style={box}><input type="checkbox" name="days" value={i} defaultChecked={p ? p.daysOfWeek.includes(i) : i >= 2} disabled={!edit} />{d}</label>
                ))}
                {edit && <button className={`pf-btn small${p ? "" : " primary"}`} style={{ marginLeft: "auto" }}>{p ? "Save" : "Add service"}</button>}
                {edit && p && <button className="pf-btn small quiet" formAction={deletePeriodAction}>Remove</button>}
              </div>
            </form>
          ))}
        </div>
      </section>

      <div className="pf-layout">
        <section className="pf-panel pf-scroll">
          <h2>Tables</h2>
          <table className="pf-table">
            <thead><tr><th>Table</th><th>Area</th><th>Seats</th><th>Online</th><th>In use</th><th /></tr></thead>
            <tbody>
              {[...tables, null].map((t) => (
                <tr key={t?.id ?? "new"}>
                  <td colSpan={6} style={{ padding: 0 }}>
                    <form action={saveTableAction} style={{ display: "grid", gridTemplateColumns: "90px minmax(0, 1fr) 130px 70px 70px auto", gap: 8, alignItems: "center", padding: "8px 16px" }}>
                      {hidden}
                      {t && <input type="hidden" name="id" value={t.id} />}
                      <input className="pf-input" name="label" defaultValue={t?.label ?? ""} placeholder={t ? "" : "New table"} aria-label={t ? `Table ${t.label}` : "New table"} disabled={!edit} />
                      <input className="pf-input" name="area" defaultValue={t?.area ?? ""} placeholder="Area" aria-label="Area" disabled={!edit} />
                      <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <input className="pf-input mono" name="min" type="number" min={1} defaultValue={t?.minCovers ?? 1} aria-label="Min seats" style={{ padding: "6px" }} disabled={!edit} />
                        –
                        <input className="pf-input mono" name="max" type="number" min={1} defaultValue={t?.maxCovers ?? 2} aria-label="Max seats" style={{ padding: "6px" }} disabled={!edit} />
                      </span>
                      <input type="checkbox" name="online" defaultChecked={t?.online ?? true} aria-label="Bookable online" disabled={!edit} />
                      <input type="checkbox" name="active" defaultChecked={t?.active ?? true} aria-label="In use" disabled={!edit} />
                      {edit && <button className={`pf-btn small${t ? "" : " primary"}`}>{t ? "Save" : "Add"}</button>}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="pf-sub" style={{ padding: "0 16px 14px", margin: 0 }}>Online off keeps a table for walk-ins and the phone (the bar). In use off takes it out of service.</p>
        </section>

        {rules && (
          <aside className="pf-sticky">
            <section className="pf-panel">
              <h2>Booking rules</h2>
              <form action={saveRulesAction} className="pf-body">
                {hidden}
                <div className="pf-row2">
                  <div className="pf-field"><label>Book up to (days)</label><input name="horizon" type="number" defaultValue={rules.bookingHorizonDays} disabled={!edit} /></div>
                  <div className="pf-field"><label>Notice (minutes)</label><input name="notice" type="number" defaultValue={rules.minNoticeMinutes} disabled={!edit} /></div>
                </div>
                <div className="pf-row2">
                  <div className="pf-field"><label>Largest party online</label><input name="maxParty" type="number" defaultValue={rules.maxPartyOnline} disabled={!edit} /></div>
                  <div className="pf-field"><label>Free cancel until (hours before)</label><input name="cutoff" type="number" defaultValue={rules.cancelCutoffHours} disabled={!edit} /></div>
                </div>
                <div className="pf-field"><label>Cancellation policy, shown before booking</label>
                  <textarea name="policy" rows={3} defaultValue={rules.cancellationPolicy} placeholder="Plans change. Cancel up to 24 hours before and your deposit comes straight back." disabled={!edit} />
                </div>
                <div className="pf-field"><label>Phone</label><input name="phone" defaultValue={rules.phone} disabled={!edit} /></div>
                <div className="pf-field"><label>Address</label><input name="address" defaultValue={rules.address} disabled={!edit} /></div>
                <div className="pf-field"><label>Timezone</label><input name="timezone" defaultValue={rules.timezone} disabled={!edit} /></div>
                {edit && <button className="pf-btn primary">Save rules</button>}
              </form>
            </section>
          </aside>
        )}
      </div>
    </>
  );
}
