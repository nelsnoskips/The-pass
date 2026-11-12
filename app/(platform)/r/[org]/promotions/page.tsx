import { planLock } from "@/components/platform/NotInPlan";
import { FormButton } from "@/components/platform/FormButton";
import { db } from "@/lib/db";
import { menuNames } from "@/lib/levers";
import { createPromotionAction, togglePromotionAction } from "@/lib/marketing/actions";
import { describePromotion, listPromotions, type PromotionStats } from "@/lib/marketing/promotions";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/**
 * Promo codes and automatic discounts for online ordering. The order
 * page prices them on the server; this page shows what each one has
 * been used for.
 */
export default async function Promotions({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant, venues } = await requireTenant(org);
  const locked = await planLock(org, tenant, "promotions", { back: `/r/${org}/promotions` });
  if (locked) return locked;
  const sql = db()!;
  const now = new Date();
  const [promos, names] = await Promise.all([listPromotions(sql, tenant, now), menuNames(sql, tenant)]);
  const manage = can(tenant, "manage_venue");
  const tz = venues[0]?.timezone ?? "America/New_York";
  const day = (d: Date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: tz }).format(d);
  const state = (p: PromotionStats) =>
    !p.active ? { text: "Paused", tone: "" }
    : p.endsAt && p.endsAt <= now ? { text: "Ended", tone: "" }
    : p.startsAt && p.startsAt > now ? { text: "Starts later", tone: "info" }
    : p.maxUses !== null && p.uses >= p.maxUses ? { text: "Used up", tone: "warn" }
    : { text: "Live", tone: "go" };
  const totals = promos.reduce((t, p) => ({ orders: t.orders + p.orders, revenue: t.revenue + p.revenueCents, discount: t.discount + p.discountCents }), { orders: 0, revenue: 0, discount: 0 });

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Promotions</h1>
          <p className="pf-sub">Promo codes and automatic discounts for online orders. One per order: the code a guest enters, or the best automatic one. A discount never takes an order below $0, and tax is charged on the discounted price.</p>
        </div>
      </div>
      {q.ok && <p className="pf-msg ok" role="status" style={{ marginBottom: 14 }}>{q.ok}</p>}
      {q.err && <p className="pf-msg err" role="alert" style={{ marginBottom: 14 }}>{q.err}</p>}
      <div className="pf-stats">
        <div className="pf-stat"><b>{promos.filter((p) => state(p).text === "Live").length}</b><span>live now</span></div>
        <div className="pf-stat"><b>{totals.orders || "—"}</b><span>orders with a promotion</span></div>
        <div className="pf-stat"><b>{totals.orders ? money(totals.revenue) : "—"}</b><span>sales from those orders</span></div>
        <div className="pf-stat"><b>{totals.orders ? money(totals.discount) : "—"}</b><span>given in discounts</span></div>
      </div>
      <div className="pf-layout">
        <section className="pf-panel pf-scroll">
          <h2>All promotions</h2>
          {promos.length === 0 ? <p className="pf-empty">No promotions yet.</p> : (
            <table className="pf-table">
              <thead><tr><th>Promotion</th><th>Limits</th><th>Uses</th><th>Sales</th><th>Status</th>{manage && <th />}</tr></thead>
              <tbody>
                {promos.map((p) => {
                  const s = state(p);
                  const limits = [
                    p.startsAt || p.endsAt ? `${p.startsAt ? day(p.startsAt) : "now"} – ${p.endsAt ? day(new Date(p.endsAt.getTime() - 1)) : "no end"}` : null,
                    p.maxUses !== null ? `${p.maxUses} uses in all` : null,
                    p.maxUsesPerPhone !== null ? `${p.maxUsesPerPhone} per guest` : null,
                  ].filter(Boolean);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ margin: "4px 0" }}>{p.code ? <span className="pf-pill mono">{p.code}</span> : <span className="pf-pill info">Automatic</span>}</div>
                        <div className="pf-sub" style={{ margin: 0 }}>{describePromotion(p, p.itemId ? names.get(p.itemId) : undefined)}</div>
                      </td>
                      <td className="pf-sub" style={{ fontSize: 12.5 }}>{limits.length ? limits.join(" · ") : "None"}</td>
                      <td className="num">{p.uses}{p.maxUses !== null ? ` / ${p.maxUses}` : ""}</td>
                      <td className="num">
                        {p.orders ? money(p.revenueCents) : "—"}
                        {p.orders > 0 && <div className="pf-sub" style={{ margin: 0, fontSize: 11.5 }}>{p.orders} order{p.orders === 1 ? "" : "s"} · {money(p.discountCents)} off</div>}
                      </td>
                      <td><span className={`pf-pill dot ${s.tone}`}>{s.text}</span></td>
                      {manage && (
                        <td style={{ textAlign: "right" }}>
                          <FormButton action={togglePromotionAction} fields={{ org, id: p.id, active: p.active ? "0" : "1" }} className={p.active ? "pf-btn small quiet" : "pf-btn small"}>
                            {p.active ? "Pause" : "Resume"}
                          </FormButton>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
        {manage && (
          <aside className="pf-sticky">
            <section className="pf-panel">
              <h2>New promotion</h2>
              <form action={createPromotionAction} className="pf-body">
                <input type="hidden" name="org" value={org} />
                <div className="pf-field"><label htmlFor="pr-name">Name</label><input id="pr-name" name="name" maxLength={80} required placeholder="Weeknight pickup" /></div>
                <fieldset className="pf-field" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="pf-sub" style={{ marginBottom: 6 }}>How guests get it</legend>
                  <label className="pf-choice"><input type="radio" name="how" value="code" defaultChecked /> With a code</label>
                  <label className="pf-choice"><input type="radio" name="how" value="automatic" /> Automatically, no code</label>
                </fieldset>
                <div className="pf-field"><label htmlFor="pr-code">Code</label><input id="pr-code" name="code" maxLength={24} placeholder="WELCOME10" className="mono" style={{ textTransform: "uppercase" }} /></div>
                <fieldset className="pf-field" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="pf-sub" style={{ marginBottom: 6 }}>What it takes off</legend>
                  <label className="pf-choice"><input type="radio" name="kind" value="percent_order" defaultChecked /> A percent of the order</label>
                  <label className="pf-choice"><input type="radio" name="kind" value="amount_order" /> A dollar amount off the order</label>
                  <label className="pf-choice"><input type="radio" name="kind" value="amount_item" /> A dollar amount off each of one dish</label>
                </fieldset>
                <div className="pf-row2">
                  <div className="pf-field"><label htmlFor="pr-pct">Percent off</label><input id="pr-pct" name="percent" type="number" min={1} max={100} inputMode="numeric" placeholder="10" /></div>
                  <div className="pf-field"><label htmlFor="pr-amt">Or amount off $</label><input id="pr-amt" name="amount" inputMode="decimal" placeholder="5" /></div>
                </div>
                <div className="pf-field">
                  <label htmlFor="pr-item">Dish (for amount off a dish)</label>
                  <select id="pr-item" name="item" defaultValue="">
                    <option value="">—</option>
                    {[...names.entries()].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                </div>
                <div className="pf-field"><label htmlFor="pr-min">Minimum order $ (optional)</label><input id="pr-min" name="min" inputMode="decimal" /></div>
                <div className="pf-row2">
                  <div className="pf-field"><label htmlFor="pr-start">Starts (optional)</label><input id="pr-start" name="starts" type="date" /></div>
                  <div className="pf-field"><label htmlFor="pr-end">Ends after (optional)</label><input id="pr-end" name="ends" type="date" /></div>
                </div>
                <div className="pf-row2">
                  <div className="pf-field"><label htmlFor="pr-max">Uses in all</label><input id="pr-max" name="maxUses" type="number" min={1} inputMode="numeric" placeholder="No limit" /></div>
                  <div className="pf-field"><label htmlFor="pr-per">Uses per guest</label><input id="pr-per" name="maxPer" type="number" min={1} inputMode="numeric" placeholder="No limit" /></div>
                </div>
                <p className="pf-sub" style={{ margin: 0 }}>Guests are told apart by mobile number. Cancelled orders give their use back.</p>
                <button className="pf-btn primary">Create promotion</button>
              </form>
            </section>
          </aside>
        )}
      </div>
    </>
  );
}
