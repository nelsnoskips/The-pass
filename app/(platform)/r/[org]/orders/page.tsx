import { PillarLevers } from "@/components/platform/PillarLevers";
import Link from "next/link";
import { EightySix, PauseControls, SettingsDrawer, TicketActions } from "@/components/platform/KitchenControls";
import { LiveRefresh } from "@/components/platform/LiveRefresh";
import { db } from "@/lib/db";
import { CANCEL_REASONS, getOrderingSettings, orderableItems, ordersBoard, type OrderRow } from "@/lib/ordering";
import { orderingSettingsAction } from "@/lib/ordering/actions";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";
import { orderLate, placedAgo } from "@/lib/reservations/floor";
import { getVersion, siteForOrg } from "@/lib/sites/repo";

export const dynamic = "force-dynamic";

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const NEXT: Record<string, { to: string; label: string; tone: string } | undefined> = {
  placed: { to: "accepted", label: "Accept", tone: "primary" },
  accepted: { to: "ready", label: "Ready · text guest", tone: "go" },
  ready: { to: "completed", label: "Picked up", tone: "" },
};

/**
 * The kitchen's board for online orders: new, being made, ready — first
 * on the page, with pause and 86 in a bar that stays on screen. Settings
 * are folded away below. Paid orders arrive only once the payment has
 * gone through. The board refreshes itself and chimes on a new order.
 */
export default async function Orders({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant, venues } = await requireTenant(org);
  const sql = db()!;
  const now = new Date();
  const [orders, settings, site] = await Promise.all([ordersBoard(sql, tenant, now), getOrderingSettings(sql, tenant.orgId), siteForOrg(sql, tenant)]);
  const content = site?.publishedVersionId ? await getVersion(sql, tenant, site.publishedVersionId) : null;
  const menu = content ? [...orderableItems(content).values()].map((i) => ({ id: i.id, name: i.name })) : [];
  const tz = venues[0]?.timezone ?? "America/New_York";
  const time = (d: Date) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(d);
  const day = (d: Date) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: tz }).format(d);
  const today = day(now);
  const paused = Boolean(settings.pausedUntil && settings.pausedUntil > now);
  const manage = can(tenant, "manage_venue");
  const floor = can(tenant, "book");
  const open = (s: string) => orders.filter((o) => o.status === s);
  const done = orders.filter((o) => o.status === "completed" || o.status === "cancelled");
  const live = settings.pickupEnabled || settings.cateringEnabled;
  const fresh = open("placed").map((o) => o.id);

  const card = (o: OrderRow) => {
    const late = orderLate(o.status, o.readyAt, now);
    return (
      <article key={o.id} className={`pf-ticket${late ? " late" : ""}`}>
        <div className="pf-ticket-head">
          <span className="pf-res-name">#{o.number} · {o.name}</span>
          <span className="mono" style={{ fontWeight: 600 }}>{day(o.readyAt) === today ? time(o.readyAt) : `${day(o.readyAt)} ${time(o.readyAt)}`}</span>
        </div>
        <div className="pf-res-meta" style={{ marginTop: 0 }}>
          {late && <span className="pf-pill stop dot">Late</span>}
          <span>{placedAgo(o.createdAt, now)}</span>
          <span className={`pf-pill ${o.kind === "catering" ? "info" : ""}`}>{o.kind === "catering" ? `Catering${o.headcount ? ` · ${o.headcount} people` : ""}` : "Pickup"}</span>
          <span className={`pf-pill ${o.payment === "paid" ? "go" : "warn"}`}>{o.payment === "paid" ? `Paid ${money(o.totalCents)}` : `Collect ${money(o.totalCents)}`}</span>
        </div>
        <ul className="pf-ticket-items">
          {o.items.map((l, i) => <li key={i}><b>{l.qty}×</b> {l.name}{l.note && <span style={{ color: "var(--muted)" }}> — {l.note}</span>}</li>)}
        </ul>
        {o.notes && <p className="pf-res-note" style={{ margin: 0 }}>“{o.notes}”</p>}
        {floor && (
          <TicketActions org={org} id={o.id} number={o.number} name={o.name} next={NEXT[o.status] ?? null}
            cancellable={o.status === "placed" || o.status === "accepted"} reasons={CANCEL_REASONS} />
        )}
      </article>
    );
  };

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Orders</h1>
          <p className="pf-sub">
            {!live ? "Online ordering is off. Turn it on in Settings below." : paused ? `Paused until ${time(settings.pausedUntil!)} — new pickups start after that.` : "Taking orders from your website. No commission."}
            {site && live && <> · <Link href={`/s/${site.slug}/order`} target="_blank">Your order page ↗</Link></>}
          </p>
        </div>
        <div className="pf-daynav">
          <LiveRefresh watch={fresh} noun="order" storageKey="pass:chime-muted:orders" />
        </div>
      </div>
      {q.ok && <p className="pf-msg ok" role="status" style={{ marginBottom: 14 }}>{q.ok}</p>}
      {q.err && <p className="pf-msg err" role="alert" style={{ marginBottom: 14 }}>{q.err}</p>}

      {(floor || menu.length > 0) && (
        <div className="pf-kbar" role="region" aria-label="Pause and 86">
          {floor && live && <PauseControls org={org} paused={paused} until={paused ? time(settings.pausedUntil!) : null} />}
          {menu.length === 0
            ? <span className="pf-kbar-label">Publish a menu with prices on your website to take orders.</span>
            : <EightySix org={org} menu={menu} soldOut={settings.soldOut} canEdit={floor} />}
        </div>
      )}

      <div className="pf-board">
        {[["placed", "New"], ["accepted", "Being made"], ["ready", "Ready for pickup"]].map(([s, label]) => (
          <section key={s} className="pf-panel" aria-label={label}>
            <h2>{label} · {open(s).length}</h2>
            {open(s).length === 0 ? <p className="pf-empty" style={{ padding: "20px 16px" }}>Nothing here.</p> : open(s).map(card)}
          </section>
        ))}
      </div>

      {done.length > 0 && (
        <section className="pf-panel" style={{ marginTop: 18 }}>
          <h2>Done today · {done.length}</h2>
          <table className="pf-table">
            <tbody>
              {done.map((o) => (
                <tr key={o.id}><td>#{o.number}</td><td>{o.name}</td><td>{o.status === "cancelled" ? "Cancelled" : "Picked up"}</td><td className="num">{money(o.totalCents)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <SettingsDrawer summary={<>Online ordering settings <span className="pf-sub">pickup, catering, tax, prep time</span></>}>
        <PillarLevers pillar="ordering" org={org} tenant={tenant} />
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
      </SettingsDrawer>
    </>
  );
}
