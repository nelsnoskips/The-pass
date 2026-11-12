import { ConfirmButton } from "@/components/platform/ConfirmButton";
import { Onboarding } from "@/components/platform/Onboarding";
import { PillarLevers } from "@/components/platform/PillarLevers";
import { SettingsNav } from "@/components/platform/SettingsNav";
import { TablesEditor } from "@/components/platform/TablesEditor";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { getVenueRules, listPeriods, listTables } from "@/lib/platform/settings";
import { deletePeriodAction, savePeriodAction, saveRulesAction, saveTablesAction } from "@/lib/platform/settings-actions";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function Floor({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string; venue?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant, venues, org: o } = await requireTenant(org);
  const venue = venues.find((v) => v.id === q.venue) ?? venues[0];
  if (!venue) {
    return (
      <>
        <div className="pf-head"><div><h1>Settings</h1></div></div>
        <SettingsNav org={org} ok={q.ok} err={q.err} />
        <Onboarding org={org} name={o.name} />
      </>
    );
  }
  const sql = db()!;
  const [tables, periods, rules] = await Promise.all([listTables(sql, tenant, venue.id), listPeriods(sql, tenant, venue.id), getVenueRules(sql, tenant, venue.id)]);
  const edit = can(tenant, "manage_venue", venue.id);
  const seats = tables.filter((t) => t.active).reduce((s, t) => s + t.maxCovers, 0);
  const hidden = (<><input type="hidden" name="org" value={org} /><input type="hidden" name="venue" value={venue.id} /></>);
  // A new key after every save, so the editor starts again from what was stored.
  const tablesKey = tables.map((t) => `${t.id}:${t.label}:${t.area}:${t.minCovers}:${t.maxCovers}:${t.online}:${t.active}`).join("|");

  return (
    <>
      <div className="pf-head"><div><h1>Settings</h1><p className="pf-sub">{venue.name} · {tables.length} tables · {seats} seats</p></div></div>
      <SettingsNav org={org} ok={q.ok} err={q.err} />
      <PillarLevers pillar="reservations" org={org} tenant={tenant} />

      <section className="pf-panel" style={{ marginBottom: 14 }}>
        <h2>Service hours</h2>
        <div className="pf-body">
          <p className="pf-sub" style={{ margin: 0 }}>When guests can book. Pacing caps how many guests can start in one slot; a deposit holds the table and is refunded if they cancel in time. Each service saves on its own.</p>
          {[...periods, null].map((p) => {
            const k = p?.id ?? "new";
            const id = (f: string) => `sp-${k}-${f}`;
            const what = p ? p.name : "the new service";
            return (
              <form key={k} action={savePeriodAction} className="pf-period" aria-label={p ? `Service: ${p.name}` : "Add a service"}>
                {hidden}
                {p && <input type="hidden" name="id" value={p.id} />}
                <div className="pf-period-grid">
                  <div className="pf-field"><label htmlFor={id("name")}>Service</label><input id={id("name")} name="name" defaultValue={p?.name ?? ""} placeholder={p ? "" : "New service, e.g. Lunch"} disabled={!edit} /></div>
                  <div className="pf-field"><label htmlFor={id("first")}>First seating</label><input id={id("first")} name="first" type="time" defaultValue={p?.firstSeating ?? "17:00"} disabled={!edit} /></div>
                  <div className="pf-field"><label htmlFor={id("last")}>Last seating</label><input id={id("last")} name="last" type="time" defaultValue={p?.lastSeating ?? "21:00"} disabled={!edit} /></div>
                  <div className="pf-field"><label htmlFor={id("slot")}>Every</label>
                    <select id={id("slot")} name="slot" defaultValue={String(p?.slotMinutes ?? 15)} disabled={!edit}>{[10, 15, 20, 30, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select>
                  </div>
                  <div className="pf-field"><label htmlFor={id("pacing")}>Pacing (guests/slot)</label><input id={id("pacing")} name="pacing" type="number" min={1} defaultValue={p?.maxCoversPerSlot ?? ""} placeholder="No cap" disabled={!edit} /></div>
                  <div className="pf-field"><label htmlFor={id("deposit")}>Deposit per guest $</label><input id={id("deposit")} name="deposit" type="number" min={0} step="0.01" defaultValue={p ? (p.depositCentsPerCover / 100 || "") : ""} placeholder="None" disabled={!edit} /></div>
                </div>
                <fieldset className="pf-days">
                  <legend className="pf-sub">Days for {what}</legend>
                  {DAYS.map((d, i) => (
                    <label key={d} className="pf-day"><input type="checkbox" name="days" value={i} defaultChecked={p ? p.daysOfWeek.includes(i) : i >= 2} disabled={!edit} />{d}</label>
                  ))}
                  {edit && <button className={`pf-btn small${p ? "" : " primary"}`} style={{ marginLeft: "auto" }}>{p ? `Save ${p.name}` : "Add service"}</button>}
                  {edit && p && <ConfirmButton className="pf-btn small quiet" formAction={deletePeriodAction} message={`Remove ${p.name}? Guests won't be able to book it.`}>Remove</ConfirmButton>}
                </fieldset>
              </form>
            );
          })}
        </div>
      </section>

      <div className="pf-layout">
        <section className="pf-panel">
          <h2>Tables</h2>
          <TablesEditor key={tablesKey} org={org} venue={venue.id} edit={edit} action={saveTablesAction}
            tables={tables.map((t) => ({ id: t.id, label: t.label, area: t.area ?? "", minCovers: t.minCovers, maxCovers: t.maxCovers, online: t.online, active: t.active }))} />
        </section>

        {rules && (
          <aside className="pf-sticky">
            <section className="pf-panel">
              <h2>Booking rules</h2>
              <form action={saveRulesAction} className="pf-body">
                {hidden}
                <div className="pf-row2">
                  <div className="pf-field"><label htmlFor="br-horizon">Book up to (days)</label><input id="br-horizon" name="horizon" type="number" defaultValue={rules.bookingHorizonDays} disabled={!edit} /></div>
                  <div className="pf-field"><label htmlFor="br-notice">Notice (minutes)</label><input id="br-notice" name="notice" type="number" defaultValue={rules.minNoticeMinutes} disabled={!edit} /></div>
                </div>
                <div className="pf-row2">
                  <div className="pf-field"><label htmlFor="br-party">Largest party online</label><input id="br-party" name="maxParty" type="number" defaultValue={rules.maxPartyOnline} disabled={!edit} /></div>
                  <div className="pf-field"><label htmlFor="br-cutoff">Free cancel until (hours before)</label><input id="br-cutoff" name="cutoff" type="number" defaultValue={rules.cancelCutoffHours} disabled={!edit} /></div>
                </div>
                <div className="pf-field"><label htmlFor="br-policy">Cancellation policy, shown before booking</label>
                  <textarea id="br-policy" name="policy" rows={3} defaultValue={rules.cancellationPolicy} placeholder="Plans change. Cancel up to 24 hours before and your deposit comes straight back." disabled={!edit} />
                </div>
                <div className="pf-field"><label htmlFor="br-phone">Phone</label><input id="br-phone" name="phone" defaultValue={rules.phone} disabled={!edit} /></div>
                <div className="pf-field"><label htmlFor="br-address">Address</label><input id="br-address" name="address" defaultValue={rules.address} disabled={!edit} /></div>
                <div className="pf-field"><label htmlFor="br-tz">Timezone</label><input id="br-tz" name="timezone" defaultValue={rules.timezone} disabled={!edit} /></div>
                {edit && <button className="pf-btn primary">Save rules</button>}
              </form>
            </section>
          </aside>
        )}
      </div>
    </>
  );
}
