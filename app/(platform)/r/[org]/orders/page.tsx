import Link from "next/link";
import { FormButton } from "@/components/platform/FormButton";
import { db } from "@/lib/db";
import { getOrderingSettings, orderableItems, ordersBoard, type OrderRow } from "@/lib/ordering";
import { kitchenAction, orderingSettingsAction, orderStatusAction } from "@/lib/ordering/actions";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";
import { getVersion, siteForOrg } from "@/lib/sites/repo";

export const dynamic = "force-dynamic";

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const NEXT: Record<string, { to: string; label: string; tone: string } | undefined> = {
  placed: { to: "accepted", label: "Accept", tone: "primary" },
  accepted: { to: "ready", label: "Ready · text guest", tone: "go" },
  ready: { to: "completed", label: "Picked up", tone: "" },
};

/**
 * The kitchen's board for online orders: new, being made, ready. Paid
 * orders arrive only once the payment has gone through.
 */
export default async function Orders({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant, venues } = await requireTenant(org);
  const sql = db()!;
  const now = new Date();
  const [orders, settings, site] = await Promise.all([ordersBoard(sql, tenant, now), getOrderingSettings(sql, tenant.orgId), siteForOrg(sql, tenant)]);
  const content = site?.publishedVersionId ? await getVersion(sql, tenant, site.publishedVersionId) : null;
  const menu = content ? [...orderableItems(content).values()] : [];
  const tz = venues[0]?.timezone ?? "America/New_York";
  const time = (d: Date) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(d);
  const day = (d: Date) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: tz }).format(d);
  const today = day(now);
  const paused = settings.pausedUntil && settings.pausedUntil > now;
  const manage = can(tenant, "manage_venue");
  const floor = can(tenant, "book");
  const open = (s: string) => orders.filter((o) => o.status === s);
  const done = orders.filter((o) => o.status === "completed" || o.status === "cancelled");
  const live = settings.pickupEnabled || settings.cateringEnabled;

  const card = (o: OrderRow) => (
    <article key={o.id} style={{ display: "grid", gap: 8, padding: "14px 16px", borderTop: "1px solid var(--rule)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <span className="pf-res-name">#{o.number} · {o.name}</span>
        <span className="mono" style={{ fontWeight: 600 }}>{day(o.readyAt) === today ? time(o.readyAt) : `${day(o.readyAt)} ${time(o.readyAt)}`}</span>
      </div>
      <div className="pf-res-meta" style={{ marginTop: 0 }}>
        <span className={`pf-pill ${o.kind === "catering" ? "info" : ""}`}>{o.kind === "catering" ? `Catering${o.headcount ? ` · ${o.headcount} people` : ""}` : "Pickup"}</span>
        <span className={`pf-pill ${o.payment === "paid" ? "go" : "warn"}`}>{o.payment === "paid" ? `Paid ${money(o.totalCents)}` : `Collect ${money(o.totalCents)}`}</span>
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
        {o.items.map((l, i) => <li key={i}><b>{l.qty}×</b> {l.name}{l.note && <span style={{ color: "var(--muted)" }}> — {l.note}</span>}</li>)}
      </ul>
      {o.notes && <p className="pf-res-note" style={{ margin: 0 }}>“{o.notes}”</p>}
      {floor && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {NEXT[o.status] && <FormButton action={orderStatusAction} fields={{ org, id: o.id, to: NEXT[o.status]!.to }} className={`pf-btn small ${NEXT[o.status]!.tone}`}>{NEXT[o.status]!.label}</FormButton>}
          {(o.status === "placed" || o.status === "accepted") && <FormButton action={orderStatusAction} fields={{ org, id: o.id, to: "cancelled" }} className="pf-btn small quiet">Cancel · text guest</FormButton>}
        </div>
      )}
    </article>
  );

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Orders</h1>
          <p className="pf-sub">
            {!live ? "Online ordering is off. Turn it on below." : paused ? `Paused until ${time(settings.pausedUntil!)} — new pickups start after that.` : "Taking orders from your website. No commission."}
            {site && live && <> · <Link href={`/s/${site.slug}/order`} target="_blank">Your order page ↗</Link></>}
          </p>
        </div>
        {floor && live && (
          <div className="pf-daynav">
            {paused ? <FormButton action={kitchenAction} fields={{ org, pause: "resume" }} className="pf-btn small primary">Resume orders</FormButton> : (
              <>
                <span className="pf-sub" style={{ margin: 0, alignSelf: "center" }}>Slammed? Pause</span>
                {["15", "30", "60"].map((m) => <FormButton key={m} action={kitchenAction} fields={{ org, pause: m }}>{m} min</FormButton>)}
              </>
            )}
          </div>
        )}
      </div>
      {q.ok && <p className="pf-msg ok" role="status" style={{ marginBottom: 14 }}>{q.ok}</p>}
      {q.err && <p className="pf-msg err" role="alert" style={{ marginBottom: 14 }}>{q.err}</p>}

      <div className="pf-stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", alignItems: "start" }}>
        {[["placed", "New"], ["accepted", "Being made"], ["ready", "Ready for pickup"]].map(([s, label]) => (
          <section key={s} className="pf-panel" aria-label={label}>
            <h2>{label} · {open(s).length}</h2>
            {open(s).length === 0 ? <p className="pf-empty" style={{ padding: "20px 16px" }}>Nothing here.</p> : open(s).map(card)}
          </section>
        ))}
      </div>

      <div className="pf-layout" style={{ marginTop: 18 }}>
        <section className="pf-panel">
          <h2>Sold out today</h2>
          <div className="pf-body">
            {menu.length === 0 ? <p className="pf-sub" style={{ margin: 0 }}>Publish a menu with prices on your website to take orders.</p> : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {menu.map((i) => {
                  const out = settings.soldOut.includes(i.id);
                  return (
                    <FormButton key={i.id} action={kitchenAction} fields={{ org, item: i.id }} className={`pf-btn small${out ? " primary" : ""}`}
                      disabled={!floor} pressed={out} title={out ? "Sold out — tap to bring back" : "Tap to mark sold out"}>
                      {out ? "✕ " : ""}{i.name}
                    </FormButton>
                  );
                })}
              </div>
            )}
            <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>Sold-out dishes disappear from your order page until you tap them again.</p>
          </div>
          {done.length > 0 && (
            <>
              <h2>Done today · {done.length}</h2>
              <table className="pf-table">
                <tbody>
                  {done.map((o) => (
                    <tr key={o.id}><td>#{o.number}</td><td>{o.name}</td><td>{o.status === "cancelled" ? "Cancelled" : "Picked up"}</td><td className="num">{money(o.totalCents)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        <aside className="pf-sticky">
          <section className="pf-panel">
            <h2>Ordering settings</h2>
            <form action={orderingSettingsAction} className="pf-body">
              <input type="hidden" name="org" value={org} />
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="pickup" defaultChecked={settings.pickupEnabled} disabled={!manage} /> Take pickup orders</label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="catering" defaultChecked={settings.cateringEnabled} disabled={!manage} /> Take catering orders</label>
              <div className="pf-row2">
                <div className="pf-field"><label htmlFor="tax">Sales tax %</label><input id="tax" name="tax" type="number" step="0.001" min={0} max={25} defaultValue={settings.taxBps / 100} disabled={!manage} /></div>
                <div className="pf-field"><label htmlFor="lead">Pickup prep (min)</label><input id="lead" name="lead" type="number" min={5} max={240} defaultValue={settings.leadMinutes} disabled={!manage} /></div>
              </div>
              <div className="pf-row2">
                <div className="pf-field"><label htmlFor="cl">Catering notice (hrs)</label><input id="cl" name="cateringLead" type="number" min={2} max={720} defaultValue={settings.cateringLeadHours} disabled={!manage} /></div>
                <div className="pf-field"><label htmlFor="cm">Catering minimum $</label><input id="cm" name="cateringMin" type="number" min={0} step={1} defaultValue={settings.cateringMinCents / 100} disabled={!manage} /></div>
              </div>
              <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>
                Pickup times follow your service hours. {process.env.STRIPE_SECRET_KEY?.trim() ? "Guests pay online when they order." : "Payments aren't connected, so guests pay when they pick up."}
              </p>
              {manage && <button className="pf-btn primary" style={{ justifySelf: "start" }}>Save</button>}
            </form>
          </section>
        </aside>
      </div>
    </>
  );
}
