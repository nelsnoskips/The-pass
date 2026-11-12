import { FormButton } from "@/components/platform/FormButton";
import { RedeemForm } from "@/components/platform/RedeemForm";
import { db } from "@/lib/db";
import { cardStatusAction, issueCardAction, redeemAction } from "@/lib/giftcards/actions";
import { lookupCard } from "@/lib/giftcards";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";
import { formatIn, venueTz } from "@/lib/platform/when";

export const dynamic = "force-dynamic";

const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: c % 100 ? 2 : 0 })}`;
const TONE: Record<string, string> = { active: "go", pending: "warn", void: "" };
const STATUS: Record<string, string> = { active: "Active", pending: "Unpaid", void: "Void" };

export default async function GiftCardsAdmin({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string; code?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant, venues } = await requireTenant(org);
  const tz = venueTz(venues);
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
  const when = (d: Date) => formatIn(d, tz, "day");

  return (
    <>
      <div className="pf-head"><div><h1>Gift cards</h1><p className="pf-sub">Cards guests buy on your website, and cards you sell at the counter. Take a payment off a card here when a guest pays with one.</p></div></div>
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
                    <td><span className={`pf-pill dot ${TONE[c.status]}`}>{STATUS[c.status] ?? c.status}</span></td>
                    {manage && (
                      <td style={{ textAlign: "right" }}>
                        <span style={{ display: "inline-flex", gap: 6 }}>
                          {c.status === "pending" && <FormButton action={cardStatusAction} fields={{ org, id: c.id, status: "active" }}>Mark paid</FormButton>}
                          {c.status !== "void" && <FormButton action={cardStatusAction} fields={{ org, id: c.id, status: "void" }} className="pf-btn small quiet">Void</FormButton>}
                        </span>
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
            <RedeemForm org={org} action={redeemAction} code={q.code}
              found={found ? { code: found.code, balanceCents: found.balance_cents, status: found.status } : null} />
          </section>
          {manage && (
            <section className="pf-panel">
              <h2>Sold at the counter</h2>
              <form action={issueCardAction} className="pf-body">
                <input type="hidden" name="org" value={org} />
                <div className="pf-row2">
                  <div className="pf-field"><label htmlFor="gi-amt">Amount $</label><input id="gi-amt" name="amount" type="number" min={10} max={500} required /></div>
                  <div className="pf-field"><label htmlFor="gi-name">Buyer&rsquo;s name</label><input id="gi-name" name="name" required /></div>
                </div>
                <div className="pf-field"><label htmlFor="gi-email">Buyer&rsquo;s email</label><input id="gi-email" name="email" type="email" required /></div>
                <div className="pf-row2">
                  <div className="pf-field"><label htmlFor="gi-to">For (optional)</label><input id="gi-to" name="toName" /></div>
                  <div className="pf-field"><label htmlFor="gi-toemail">Their email</label><input id="gi-toemail" name="toEmail" type="email" /></div>
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
