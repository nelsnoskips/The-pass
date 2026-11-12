import { SettingsNav } from "@/components/platform/SettingsNav";
import { actorLabel } from "@/lib/agent-runtime/catalog";
import { requestPlanAction, setPlanAction } from "@/lib/billing/actions";
import { FEATURE_INFO, foundingApplies, includes, planFor, type Feature } from "@/lib/billing/entitlements";
import {
  ADDITIONAL_LOCATION_DISCOUNT_PCT, AI_CENTS_PER_MTOK, dollars, FEATURES, FEE_PROMISES, PLAN_IDS, PLANS,
  SMS_COST_CENTS_PER_1000, STATIONS, smsCostCents, textsIncluded, unitPriceCents,
} from "@/lib/billing/plans";
import { aiCostCents, emailCostCents, invoicePreview, overage, projectTexts, usageFor } from "@/lib/billing/usage";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";
import { formatIn, venueTz } from "@/lib/platform/when";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plan & billing · The Pass" };

/** In every plan; listed so "what's included" never reads as a short list. */
const EVERY_PLAN = [
  "Reservations on your own website, with no per-cover fee",
  "The host stand: tonight's book, seating, walk-ins, the waitlist",
  "Deposits for the tables that matter, refunded by your policy",
  "Your guest list and guest profiles, with import and one-click export",
  "Your website, built and edited here",
  "Ask The Pass, and the morning pass every day",
];

const n = (x: number) => x.toLocaleString("en-US");
const tok = (x: number) => (x >= 1_000_000 ? `${(x / 1_000_000).toFixed(1)}M` : x >= 1000 ? `${Math.round(x / 1000)}k` : String(x));

/**
 * Settings → Plan & billing: the plan and its price, what The Pass runs
 * on it, this month's texts and emails, and what the bill would be. An
 * owner or manager can see it and ask for a change; only The Pass's own
 * staff can change the plan. Billing isn't switched on yet.
 */
export default async function Billing({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant, venues } = await requireTenant(org);
  const staff = tenant.role === "staff";
  if (!can(tenant, "manage_venue")) {
    return (
      <>
        <div className="pf-head"><div><h1>Settings</h1><p className="pf-sub">Plan &amp; billing</p></div></div>
        <SettingsNav org={org} ok={q.ok} err={q.err} />
        <section className="pf-panel"><p className="pf-empty">An owner or manager can see the plan and billing.</p></section>
      </>
    );
  }
  const sql = db()!;
  const tz = venueTz(venues);
  const now = new Date();
  const [plan, usage, history, requests] = await Promise.all([
    planFor(sql, tenant.orgId),
    usageFor(sql, tenant.orgId, now),
    sql<{ actor: string; detail: Record<string, { before: unknown; after: unknown }>; created_at: Date }[]>`
      select actor, detail, created_at from change_log where org_id = ${tenant.orgId} and action = 'plan.changed' order by created_at desc limit 8`,
    sql<{ requested_by: string; plan: string; feature: string | null; note: string; created_at: Date }[]>`
      select requested_by, plan, feature, note, created_at from plan_requests where org_id = ${tenant.orgId} and status = 'open' order by created_at desc limit 5`,
  ]);
  const p = PLANS[plan.plan];
  const founding = foundingApplies(plan, usage.month.firstDay);
  const unit = unitPriceCents(plan.plan, founding);
  const extra = Math.round((unit * (100 - ADDITIONAL_LOCATION_DISCOUNT_PCT)) / 100);
  const included = textsIncluded(plan.plan, plan.locations);
  const used = usage.texts.sent;
  const projected = projectTexts(used, usage.month);
  const projectedOver = overage(projected, included);
  const invoice = invoicePreview(plan, used, usage.month);
  const fill = Math.min(100, included ? Math.round((used / included) * 100) : 0);
  const lockDate = plan.foundingLockedUntil ? formatIn(`${plan.foundingLockedUntil}T12:00:00Z`, "UTC", "date") : null;
  const otherPlans = PLAN_IDS.filter((x) => x !== plan.plan);
  const words = (v: unknown) => (v === true ? "yes" : v === false ? "no" : v === null || v === undefined ? "—" : String(v).replace(/^(host|the_pass|group)\b/, (m) => PLANS[m as keyof typeof PLANS].name));

  return (
    <>
      <div className="pf-head"><div><h1>Settings</h1><p className="pf-sub">Your plan, what The Pass runs on it, and this month&rsquo;s usage.</p></div></div>
      <SettingsNav org={org} ok={q.ok} err={q.err} />
      <p className="pf-msg pf-bill-off" role="note">Billing isn&rsquo;t switched on yet — you won&rsquo;t be charged until it is. Everything below is what the bill would say.</p>

      <div className="pf-layout">
        <div style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <section className="pf-panel" aria-labelledby="bill-plan-h">
            <h2 id="bill-plan-h">Your plan</h2>
            <div className="pf-body">
              <div className="pf-bill-plan">
                <div>
                  <p className="pf-bill-name">{p.name}{plan.founding && <span className="pf-pill info">Founding</span>}</p>
                  <p className="pf-sub" style={{ margin: 0 }}>{p.tagline}</p>
                </div>
                <p className="pf-bill-price"><b className="mono">{dollars(unit)}</b><span>a location a month</span></p>
              </div>
              {plan.founding && (
                <p className="pf-sub" style={{ margin: 0 }}>
                  Founding price {dollars(p.foundingCents)} instead of {dollars(p.listCents)}{lockDate ? `, locked until ${lockDate}` : ""}.
                  {!founding && " The lock has ended, so the list price applies."}
                </p>
              )}
              <p style={{ margin: 0 }}>
                {plan.locations === 1
                  ? <>1 location: <b className="mono">{dollars(unit)}</b> a month.</>
                  : <>{plan.locations} locations: {dollars(unit)} for the first, {dollars(extra)} for each of the other {plan.locations - 1} ({ADDITIONAL_LOCATION_DISCOUNT_PCT}% off) = <b className="mono">{dollars(unit + extra * (plan.locations - 1))}</b> a month.</>}
              </p>
              <p className="pf-sub" style={{ margin: 0 }}>
                {n(p.textsIncluded)} texts a location a month are included ({n(included)} in all). Beyond that, texts are billed at cost (about {dollars(SMS_COST_CENTS_PER_1000)} per 1,000 — an estimate). Month to month.
              </p>
              {plan.isDefault && <p className="pf-sub" style={{ margin: 0 }}>Restaurants that started before plans existed are on The Pass, with everything on.</p>}
            </div>
          </section>

          <section className="pf-panel" aria-labelledby="bill-inc-h">
            <h2 id="bill-inc-h">What The Pass runs for you</h2>
            <div className="pf-body">
              <ul className="pf-bill-inc">
                {STATIONS.map((s) => {
                  const f = `station:${s}` as Feature;
                  const on = includes(plan, f);
                  return (
                    <li key={s} className={on ? "on" : "off"}>
                      <b>{FEATURE_INFO[f].label}</b>
                      <span>{FEATURE_INFO[f].does}</span>
                      <em>{on ? "Running on your plan" : "In The Pass plan"}</em>
                    </li>
                  );
                })}
              </ul>
              <h3 className="pf-bill-h3">On every plan</h3>
              <ul className="pf-bill-every">{EVERY_PLAN.map((x) => <li key={x}>{x}</li>)}</ul>
              <h3 className="pf-bill-h3">{FEATURES.every((f) => includes(plan, f)) ? "Also on your plan" : "With The Pass plan"}</h3>
              <ul className="pf-bill-inc compact">
                {FEATURES.map((f) => {
                  const on = includes(plan, f);
                  return (
                    <li key={f} className={on ? "on" : "off"}>
                      <b>{FEATURE_INFO[f].label}</b>
                      <em>{on ? "Included" : "In The Pass plan"}</em>
                    </li>
                  );
                })}
              </ul>
              <p className="pf-sub" style={{ margin: 0 }}>Changing plan never deletes anything. What a plan doesn&rsquo;t include is hidden and stopped, and comes back as it was.</p>
            </div>
          </section>

          <section className="pf-panel" aria-labelledby="bill-use-h">
            <h2 id="bill-use-h">{usage.month.label} so far</h2>
            <div className="pf-body">
              <div className="pf-meter" role="group" aria-label="Texts this month">
                <div className="pf-meter-top"><b>Texts</b><span className="mono">{n(used)} of {n(included)} included</span></div>
                <div className="pf-meter-bar" role="progressbar" aria-valuemin={0} aria-valuemax={included} aria-valuenow={Math.min(used, included)} aria-label={`${n(used)} of ${n(included)} texts used`}>
                  <i style={{ width: `${fill}%` }} className={used > included ? "over" : ""} />
                </div>
                <p className="pf-sub" style={{ margin: 0 }}>
                  {n(usage.texts.transactional)} about guests&rsquo; own bookings and orders · {n(usage.texts.marketing)} marketing
                  {usage.texts.failed ? ` · ${n(usage.texts.failed)} failed (not counted)` : ""}
                </p>
                {usage.texts.dryRun > 0 && <p className="pf-sub" style={{ margin: 0 }}>{n(usage.texts.dryRun)} not sent (texting not connected). They don&rsquo;t count.</p>}
                <p className="pf-sub" style={{ margin: 0 }}>
                  {used === 0
                    ? "No texts sent yet this month."
                    : projectedOver.over > 0
                      ? <>At this pace, about {n(projected)} by the end of the month: ~{n(projectedOver.over)} over, about <b>{dollars(projectedOver.cents)}</b> at cost.</>
                      : <>At this pace, about {n(projected)} by the end of the month — inside your allowance.</>}
                </p>
                <p className="pf-sub" style={{ margin: 0 }}>Confirmations, reminders, cancellations, ready texts and the waitlist always go out, whatever the count. Campaigns warn you before going over.</p>
              </div>
              <div className="pf-meter">
                <div className="pf-meter-top"><b>Emails</b><span className="mono">{n(usage.emails.sent)} sent</span></div>
                {usage.emails.dryRun > 0 && <p className="pf-sub" style={{ margin: 0 }}>{n(usage.emails.dryRun)} not sent (email not connected).</p>}
                <p className="pf-sub" style={{ margin: 0 }}>Emails are included on every plan.</p>
              </div>
            </div>
          </section>

          {staff && (
            <section className="pf-panel pf-bill-staff" aria-labelledby="bill-ai-h">
              <h2 id="bill-ai-h">The Pass staff only · cost to serve</h2>
              <div className="pf-body">
                <p className="pf-sub" style={{ margin: 0 }}>Not shown to the restaurant. Prices are unverified estimates from lib/billing/plans.ts.</p>
                <table className="pf-table">
                  <thead><tr><th>This month</th><th>Usage</th><th>Est. cost</th></tr></thead>
                  <tbody>
                    <tr><td>AI · stations</td><td className="num">{n(usage.ai.runs)} runs · {tok(usage.ai.stations.input)} in / {tok(usage.ai.stations.output)} out / {tok(usage.ai.stations.cacheRead)} cached</td><td className="num">{dollars(aiCostCents(usage.ai.stations))}</td></tr>
                    <tr><td>AI · Ask The Pass</td><td className="num">{n(usage.ai.replies)} replies · {tok(usage.ai.chat.input)} in / {tok(usage.ai.chat.output)} out / {tok(usage.ai.chat.cacheRead)} cached</td><td className="num">{dollars(aiCostCents(usage.ai.chat))}</td></tr>
                    <tr><td>Texts sent</td><td className="num">{n(used)}</td><td className="num">{dollars(smsCostCents(used))}</td></tr>
                    <tr><td>Emails sent</td><td className="num">{n(usage.emails.sent)}</td><td className="num">{dollars(emailCostCents(usage.emails.sent))}</td></tr>
                  </tbody>
                </table>
                <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>
                  Per million tokens: {dollars(AI_CENTS_PER_MTOK.input)} in, {dollars(AI_CENTS_PER_MTOK.output)} out, {dollars(AI_CENTS_PER_MTOK.cacheRead)} cached (unverified). Chat usage is recorded from this release on.
                </p>
              </div>
            </section>
          )}
        </div>

        <aside className="pf-sticky">
          <section className="pf-panel" aria-labelledby="bill-inv-h">
            <h2 id="bill-inv-h">Invoice preview · {invoice.month}</h2>
            <div className="pf-body">
              <table className="pf-table pf-invoice">
                <tbody>
                  {invoice.lines.map((l) => (
                    <tr key={l.label}>
                      <td>{l.label}{l.detail && <span className="pf-sub">{l.detail}</span>}</td>
                      <td className="num">{l.cents === null ? "—" : dollars(l.cents)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td>Total so far</td><td className="num">{dollars(invoice.totalCents)}</td></tr></tfoot>
              </table>
              <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>Texts as of today. Not a bill: billing isn&rsquo;t switched on yet.</p>
            </div>
          </section>

          <section className="pf-panel" aria-labelledby="bill-fee-h">
            <h2 id="bill-fee-h">Our fee promises</h2>
            <ul className="pf-bill-promises">
              {FEE_PROMISES.map((f) => <li key={f.t}><b>{f.t}</b><span>{f.d}</span></li>)}
            </ul>
          </section>

          <section className="pf-panel" aria-labelledby="bill-ask-h">
            <h2 id="bill-ask-h">Change your plan</h2>
            <form action={requestPlanAction} className="pf-body">
              <input type="hidden" name="org" value={org} />
              <input type="hidden" name="back" value={`/r/${org}/settings/billing`} />
              <div className="pf-field">
                <label htmlFor="bill-ask-plan">Move to</label>
                <select id="bill-ask-plan" name="plan" defaultValue={plan.plan === "host" ? "the_pass" : otherPlans[0]}>
                  {otherPlans.map((x) => <option key={x} value={x}>{PLANS[x].name} — {dollars(PLANS[x].listCents)} a location</option>)}
                </select>
              </div>
              <div className="pf-field">
                <label htmlFor="bill-ask-note">Anything we should know (optional)</label>
                <textarea id="bill-ask-note" name="note" rows={2} maxLength={500} />
              </div>
              <button type="submit" className="pf-btn">Ask about changing plan</button>
              <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>Someone from The Pass gets in touch. Nothing changes and nothing is charged until you agree.</p>
              {requests.length > 0 && (
                <ul className="pf-bill-requests">
                  {requests.map((r) => <li key={r.created_at.toISOString()}>{actorLabel(r.requested_by)} asked about {PLANS[r.plan as keyof typeof PLANS]?.name ?? r.plan}{r.feature && r.feature in FEATURE_INFO ? ` (${FEATURE_INFO[r.feature as Feature].label.toLowerCase()})` : ""}, {formatIn(r.created_at, tz, "date")}.</li>)}
                </ul>
              )}
            </form>
          </section>

          {staff && (
            <section className="pf-panel pf-bill-staff" aria-labelledby="bill-set-h">
              <h2 id="bill-set-h">The Pass staff only · set the plan</h2>
              <form action={setPlanAction} className="pf-body">
                <input type="hidden" name="org" value={org} />
                <div className="pf-field">
                  <label htmlFor="bill-plan">Plan</label>
                  <select id="bill-plan" name="plan" defaultValue={plan.plan}>
                    {PLAN_IDS.map((x) => <option key={x} value={x}>{PLANS[x].name}{PLANS[x].minLocations > 1 ? ` (${PLANS[x].minLocations}+ locations)` : ""}</option>)}
                  </select>
                </div>
                <div className="pf-row2">
                  <div className="pf-field"><label htmlFor="bill-loc">Locations</label><input id="bill-loc" name="locations" type="number" min={1} max={500} defaultValue={plan.locations} required /></div>
                  <div className="pf-field"><label htmlFor="bill-lock">Founding locked until</label><input id="bill-lock" name="lock" type="date" defaultValue={plan.foundingLockedUntil ?? ""} /></div>
                </div>
                <label className="pf-check"><input type="checkbox" name="founding" defaultChecked={plan.founding} /> <span>Founding restaurant (empty date: 24 months from today)</span></label>
                <button type="submit" className="pf-btn primary">Save plan</button>
                <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>Logged in the change log. Moving down hides and stops what the plan leaves out; nothing is deleted. Scheduled campaigns go back to drafts.</p>
              </form>
              {history.length > 0 && (
                <ul className="pf-bill-requests" style={{ padding: "0 16px 16px" }}>
                  {history.map((h) => (
                    <li key={h.created_at.toISOString()}>
                      {formatIn(h.created_at, tz, "datetime")} · {actorLabel(h.actor)}: {Object.entries(h.detail).map(([k, v]) => `${k} ${words(v.before)} → ${words(v.after)}`).join(", ")}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
