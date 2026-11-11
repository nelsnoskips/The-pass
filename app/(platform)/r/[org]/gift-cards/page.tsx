import { db } from "@/lib/db";
import { cardStatusAction, issueCardAction, redeemAction } from "@/lib/giftcards/actions";
import { lookupCard } from "@/lib/giftcards";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: c % 100 ? 2 : 0 })}`;
const TONE: Record<string, string> = { active: "go", pending: "warn", void: "" };

export default async function GiftCardsAdmin({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string; code?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant } = await requireTenant(org);
  const sql = db()!;
  const [cards, [totals]] = await Promise.all([
    sql<{ id: string; code: string; status: string; initial_cents: number; balance_cents: number; purchaser_name: string; recipient_name: string | null; created_at: Date }[]>`
      select id, code, status, initial_cents, balance_cents, purchaser_name, recipient_name, created_at
      from gift_cards where org_id = ${tenant.orgId} order by created_at desc limit 100`,
    sql<{ sold: number; outstanding: number }[]>`
      select coalesce(sum(initial_cents) filter (where status <> 'void'), 0)::int as sold,
             coalesce(sum(balance_cents) filter (where status = 'active'), 0)::int as outstanding
      from gift_cards where org_id = ${tenant.orgId}`,
  ]);
  const found = q.code ? await lookupCard(sql, tenant, q.code) : null;
  const manage = can(tenant, "manage_venue");
  const when = (d: Date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);

  return (
    <>
      <div className="pf-head"><div><h1>Gift cards</h1><p className="pf-sub">Sold online at /s/…/gift-cards, or issued here when sold at the counter.</p></div></div>
      {q.ok && <p className="pf-msg ok" role="status" style={{ marginBottom: 14 }}>{q.ok}</p>}
      {q.err && <p className="pf-msg err" role="alert" style={{ marginBottom: 14 }}>{q.err}</p>}
      <div className="pf-stats">
        <div className="pf-stat"><b>{money(totals.sold)}</b><span>sold</span></div>
        <div className="pf-stat"><b>{money(totals.outstanding)}</b><span>still to be spent</span></div>
        <div className="pf-stat"><b>{cards.filter((c) => c.status === "active").length}</b><span>active cards</span></div>
      </div>
      <div className="pf-layout">
        <section className="pf-panel pf-scroll">
          <h2>Cards</h2>
          {cards.length === 0 ? <p className="pf-empty">No gift cards yet.</p> : (
            <table className="pf-table">
              <thead><tr><th>Code</th><th>Balance</th><th>For</th><th>Sold</th><th>Status</th>{manage && <th />}</tr></thead>
              <tbody>
                {cards.map((c) => (
                  <tr key={c.id}>
                    <td className="num">{c.code}</td>
                    <td className="num">{money(c.balance_cents)} <span className="pf-sub">/ {money(c.initial_cents)}</span></td>
                    <td>{c.recipient_name ?? c.purchaser_name}</td>
                    <td className="num">{when(c.created_at)}</td>
                    <td><span className={`pf-pill dot ${TONE[c.status]}`}>{c.status}</span></td>
                    {manage && (
                      <td style={{ textAlign: "right" }}>
                        <form action={cardStatusAction} style={{ display: "inline-flex", gap: 6 }}>
                          <input type="hidden" name="org" value={org} /><input type="hidden" name="id" value={c.id} />
                          {c.status === "pending" && <button className="pf-btn small" name="status" value="active">Mark paid</button>}
                          {c.status !== "void" && <button className="pf-btn small quiet" name="status" value="void">Void</button>}
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <aside className="pf-sticky">
          <section className="pf-panel">
            <h2>Take payment by gift card</h2>
            <form action={redeemAction} className="pf-body">
              <input type="hidden" name="org" value={org} />
              <div className="pf-field"><label htmlFor="gc-code">Code</label><input id="gc-code" name="code" defaultValue={q.code ?? ""} placeholder="ABCD-EFGH-JKMN" className="mono" required /></div>
              {found && <p className="pf-sub" style={{ margin: 0 }}>{found.code}: <b className="mono" style={{ color: "var(--ink)" }}>{money(found.balance_cents)}</b> left · {found.status}</p>}
              <div className="pf-field"><label htmlFor="gc-amt">Amount $</label><input id="gc-amt" name="amount" inputMode="decimal" required /></div>
              <button className="pf-btn primary">Take it off the card</button>
            </form>
          </section>
          {manage && (
            <section className="pf-panel">
              <h2>Sold at the counter</h2>
              <form action={issueCardAction} className="pf-body">
                <input type="hidden" name="org" value={org} />
                <div className="pf-row2">
                  <div className="pf-field"><label>Amount $</label><input name="amount" type="number" min={10} max={500} required /></div>
                  <div className="pf-field"><label>Buyer&rsquo;s name</label><input name="name" required /></div>
                </div>
                <div className="pf-field"><label>Buyer&rsquo;s email</label><input name="email" type="email" required /></div>
                <div className="pf-row2">
                  <div className="pf-field"><label>For (optional)</label><input name="toName" /></div>
                  <div className="pf-field"><label>Their email</label><input name="toEmail" type="email" /></div>
                </div>
                <button className="pf-btn">Issue and email the code</button>
              </form>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
