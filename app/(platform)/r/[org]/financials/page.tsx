import Link from "next/link";
import { Kpi, PeriodNav, TabNav, hrefWith } from "@/components/platform/ReportBits";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { assertCan, can, type Tenant } from "@/lib/platform/tenant";
import {
  KIND_LABEL, PAYMENT_KINDS, TX_KINDS, TX_STATUSES, financialSummary, parseTxKind, parseTxStatus, transactions, type TxKind, type TxStatus,
} from "@/lib/reports/financials";
import { count, dayLabel, money } from "@/lib/reports/format";
import { parseDays, periodsForOrg, type Periods } from "@/lib/reports/period";

export const dynamic = "force-dynamic";

const TONE: Record<TxStatus, string> = { captured: "go", redeemed: "info", held: "info", pending: "warn", refunded: "", failed: "stop", canceled: "" };
const STATUS_LABEL: Record<TxStatus, string> = { pending: "Pending", held: "Held", captured: "Paid", refunded: "Refunded", failed: "Failed", canceled: "Canceled", redeemed: "Redeemed" };

/**
 * The money that moved through The Pass: deposits, no-show fees, gift
 * card sales and online order payments, and what's still owed on gift
 * cards. Read only. Payouts to the bank are Stripe's to report.
 */
export default async function Financials({ params, searchParams }: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ days?: string; tab?: string; kind?: string; status?: string; page?: string }>;
}) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant } = await requireTenant(org);
  assertCan(tenant, "view");
  const sql = db()!;
  const tab = q.tab === "transactions" ? "transactions" : "summary";
  const days = parseDays(q.days);
  const p = await periodsForOrg(sql, tenant.orgId, days);
  const kind = parseTxKind(q.kind);
  const status = parseTxStatus(q.status);
  const base = `/r/${org}/financials`;

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Financials</h1>
          <p className="pf-sub">{dayLabel(p.cur.since)} – {dayLabel(p.cur.until)} · money that moved through The Pass</p>
        </div>
        <PeriodNav base={base} days={days} params={{ tab: tab === "summary" ? null : tab, kind: kind ?? null, status: status ?? null }} />
      </div>

      <TabNav label="Financials" active={tab} tabs={[
        { key: "summary", label: "Summary", href: hrefWith(base, { days }) },
        { key: "transactions", label: "Transactions", href: hrefWith(base, { tab: "transactions", days }) },
      ]} />

      {tab === "summary"
        ? <Summary org={org} tenant={tenant} p={p} />
        : <Transactions org={org} tenant={tenant} p={p} kind={kind} status={status} page={Number(q.page) || 1} />}
    </>
  );
}

async function Summary({ org, tenant, p }: { org: string; tenant: Tenant; p: Periods }) {
  const base = `/r/${org}/financials`;
  const days = p.days;
    const s = await financialSummary(db()!, tenant, p);
    return (
      <>
        <section className="pf-panel pf-rgroup">
          <h2>Through The Pass <span className="pf-h2-note">vs the previous {days} days</span></h2>
          <div className="pf-kpis">
            <Kpi label="Collected" unit="money" cur={s.collectedCents} prev={s.prevCollectedCents} days={days}
              definition="Deposits, no-show fees, gift card sales and online order payments taken in this period." />
            <Kpi label="Refunded" unit="money" cur={s.refundedCents} prev={s.prevRefundedCents} days={days} upIsGood={false}
              definition="Money given back in this period, whenever it was first taken." />
            <Kpi label="Net" unit="money" cur={s.netCents} prev={s.prevNetCents} days={days}
              definition="Collected less refunded." />
            <div className="pf-kpi">
              <span className="l">Paid out to your bank</span>
              <b className="mono">—</b>
              <span className="pf-kpi-def">Payouts come from Stripe and will appear here once Stripe is connected.</span>
            </div>
          </div>
          {!s.hasPayments && (
            <div className="pf-body" style={{ paddingTop: 12 }}>
              <p className="pf-sub" style={{ margin: 0 }}>No payments have gone through The Pass yet. Deposits, gift cards and online order payments will show here as they come in.</p>
            </div>
          )}
        </section>

        <div className="pf-layout">
          <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
            <section className="pf-panel pf-scroll">
              <h2>By type</h2>
              <table className="pf-table">
                <thead><tr><th>Type</th><th>Payments</th><th>Collected</th><th>Refunded</th><th>Net</th></tr></thead>
                <tbody>
                  {PAYMENT_KINDS.map((k) => {
                    const r = s.byKind.find((x) => x.kind === k)!;
                    return (
                      <tr key={k}>
                        <td><Link href={hrefWith(base, { tab: "transactions", days, kind: k })}>{KIND_LABEL[k]}</Link></td>
                        <td className="num">{s.hasPayments ? count(r.count) : "—"}</td>
                        <td className="num">{s.hasPayments ? money(r.collectedCents) : "—"}</td>
                        <td className="num">{s.hasPayments ? money(r.refundedCents) : "—"}</td>
                        <td className="num">{s.hasPayments ? money(r.netCents) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
            <p className="pf-note">
              Payouts to your bank come from Stripe, after Stripe&rsquo;s fees. They&rsquo;ll appear here once Stripe is connected;
              until then this page shows what was charged, not what reached your account.
            </p>
          </div>

          <aside style={{ display: "grid", gap: 18, alignContent: "start" }}>
            <section className="pf-panel">
              <h2>Held and waiting</h2>
              <div className="pf-body">
                <Row label="Deposits held now" value={money(s.depositsHeldCents)} note={s.depositsHeldCount ? `${s.depositsHeldCount} deposit${s.depositsHeldCount === 1 ? "" : "s"} marked paid, not yet returned or kept` : undefined} />
                <Row label="Checkouts not paid yet" value={money(s.pendingCents)} note={s.pendingCount ? `${s.pendingCount} started in this period` : undefined} href={hrefWith(base, { tab: "transactions", days, status: "pending" })} />
                <Row label="Failed payments" value={s.hasPayments ? count(s.failedCount) : "—"} href={hrefWith(base, { tab: "transactions", days, status: "failed" })} />
              </div>
            </section>
            <section className="pf-panel">
              <h2>Gift cards</h2>
              <div className="pf-body">
                <Row label="Owed on cards (liability)" value={money(s.giftLiabilityCents)} note={s.giftLiabilityCents !== null ? `${s.giftCardsOutstanding} card${s.giftCardsOutstanding === 1 ? "" : "s"} with a balance` : undefined} />
                <Row label="Sold in this period" value={money(s.giftSoldCents)} />
                <Row label="Redeemed in this period" value={money(s.giftRedeemedCents)} note="Spends down what you owe; no money moves." />
                <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>What&rsquo;s owed is the unspent balance on every active card. <Link href={`/r/${org}/gift-cards`}>Gift cards</Link></p>
              </div>
            </section>
            <section className="pf-panel">
              <h2>Not through The Pass</h2>
              <div className="pf-body">
                <Row label="Pay-at-pickup orders" value={money(s.payAtPickupCents)} note={s.payAtPickupCents !== null ? `${s.payAtPickupCount} order${s.payAtPickupCount === 1 ? "" : "s"}, paid at your counter` : undefined} />
                <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>Left out of collected and net above: your register took this money, not The Pass.</p>
              </div>
            </section>
          </aside>
        </div>
      </>
    );
}

async function Transactions({ org, tenant, p, kind, status, page }: { org: string; tenant: Tenant; p: Periods; kind: TxKind | null; status: TxStatus | null; page: number }) {
  const base = `/r/${org}/financials`;
  const days = p.days;
  const canExport = can(tenant, "manage_venue");
  const when = (d: Date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: p.tz }).format(d);
    const t = await transactions(db()!, tenant, { range: p.cur, tz: p.tz, kind, status, page });
    const filters = { tab: "transactions", days, kind, status };
    return (
      <section className="pf-panel pf-scroll">
        <form className="pf-filters" role="search">
          <input type="hidden" name="tab" value="transactions" />
          <input type="hidden" name="days" value={days} />
          <label className="pf-sub" style={{ margin: 0 }} htmlFor="tx-kind">Type</label>
          <select id="tx-kind" name="kind" defaultValue={kind ?? ""} className="pf-input">
            <option value="">All types</option>
            {TX_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
          <label className="pf-sub" style={{ margin: 0 }} htmlFor="tx-status">Status</label>
          <select id="tx-status" name="status" defaultValue={status ?? ""} className="pf-input">
            <option value="">Any status</option>
            {TX_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <button className="pf-btn small" type="submit">Filter</button>
          {(kind || status) && <Link className="pf-btn small quiet" href={hrefWith(base, { tab: "transactions", days })}>Clear</Link>}
          <span style={{ flex: 1 }} />
          {canExport && <a className="pf-btn small" href={hrefWith(`${base}/export`, { days, kind, status })} download>Export CSV</a>}
        </form>
        {t.rows.length === 0 ? <p className="pf-empty">{kind || status ? "Nothing matches those filters in this period." : "No money moved through The Pass in this period."}</p> : (
          <table className="pf-table">
            <thead><tr><th>When</th><th>Type</th><th>For</th><th>Who</th><th>Status</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
            <tbody>
              {t.rows.map((r) => (
                <tr key={`${r.kind}:${r.id}`}>
                  <td className="num">{when(r.createdAt)}</td>
                  <td>{KIND_LABEL[r.kind]}</td>
                  <td>{r.ref ?? "—"}</td>
                  <td>{r.guestId ? <Link href={`/r/${org}/guests/${r.guestId}`}>{r.who}</Link> : (r.who ?? "—")}</td>
                  <td>
                    <span className={`pf-pill dot ${TONE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    {r.status === "refunded" && <div className="pf-sub" style={{ margin: "4px 0 0", fontSize: 11.5 }}>refunded {when(r.updatedAt)}</div>}
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>{r.kind === "redemption" ? `${money(r.amountCents)} off a card` : money(r.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="pf-pager">
          <span>{t.total === 0 ? "No transactions" : `${(t.page - 1) * t.pageSize + 1}–${(t.page - 1) * t.pageSize + t.rows.length} of ${t.total}`}</span>
          <span className="pf-daynav">
            {t.page > 1 && <Link className="pf-btn small" href={hrefWith(base, { ...filters, page: t.page - 1 })}>Newer</Link>}
            {t.page < t.pages && <Link className="pf-btn small" href={hrefWith(base, { ...filters, page: t.page + 1 })}>Older</Link>}
          </span>
        </div>
      </section>
    );
}

function Row({ label, value, note, href }: { label: string; value: string; note?: string; href?: string }) {
  return (
    <div style={{ display: "grid", gap: 2, paddingBottom: 10, borderBottom: "1px solid var(--rule)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13.5 }}>
        <span>{href ? <Link href={href}>{label}</Link> : label}</span>
        <b className="mono" style={{ fontWeight: 500 }}>{value}</b>
      </div>
      {note && <span className="pf-sub" style={{ margin: 0, fontSize: 12 }}>{note}</span>}
    </div>
  );
}
