import Link from "next/link";
import { requestPlanAction } from "@/lib/billing/actions";
import { comes, FEATURE_INFO, includes, planFor, planIncluding, type Feature, type OrgPlan } from "@/lib/billing/entitlements";
import { dollars, FEATURES, PLANS } from "@/lib/billing/plans";
import { db } from "@/lib/db";
import { can, type Tenant } from "@/lib/platform/tenant";

/**
 * What a page shows when the restaurant's plan doesn't include it: what
 * it does, what it costs, and a way to ask — never a 404. Use it at the
 * top of a page:
 *
 *   const locked = await planLock(org, tenant, "ordering");
 *   if (locked) return locked;
 */
export async function planLock(org: string, tenant: Tenant, feature: Feature, opts: { back?: string; inline?: boolean } = {}) {
  const sql = db()!;
  const plan = await planFor(sql, tenant.orgId);
  if (includes(plan, feature)) return null;
  const [open] = await sql<{ created_at: Date }[]>`
    select created_at from plan_requests where org_id = ${tenant.orgId} and status = 'open' and plan <> ${plan.plan} order by created_at desc limit 1`;
  return <NotInPlan org={org} tenant={tenant} plan={plan} feature={feature} asked={Boolean(open)} back={opts.back ?? `/r/${org}`} inline={opts.inline} />;
}

export function NotInPlan({ org, tenant, plan, feature, asked, back, inline }: {
  org: string; tenant: Tenant; plan: OrgPlan; feature: Feature; asked: boolean; back: string; inline?: boolean;
}) {
  const info = FEATURE_INFO[feature];
  const target = PLANS[planIncluding(feature)];
  const current = PLANS[plan.plan];
  const more = FEATURES.filter((f) => f !== feature && !includes(plan, f)).map((f) => FEATURE_INFO[f].label);
  const askable = can(tenant, "manage_venue");
  return (
    <>
      {!inline && <div className="pf-head"><div><h1>{info.label}</h1><p className="pf-sub">Included in {target.name} plan</p></div></div>}
      <section className="pf-panel pf-plan-lock" aria-labelledby="pf-lock-h">
        <div className="pf-body">
          <span className="pf-pill info">Included in {target.name} plan</span>
          <h2 id="pf-lock-h" className="pf-plan-lock-h">{info.label} {comes(feature)} with {target.name}.</h2>
          <p className="pf-plan-lock-does">{info.does}</p>
          <p className="pf-sub" style={{ margin: 0 }}>
            You&rsquo;re on <b>{current.name}</b> ({dollars(current.listCents)} a location a month).{" "}
            {target.name} is {dollars(target.listCents)} a location a month — the same flat price whatever you sell, with no per-order, per-cover or guest fees.
          </p>
          {more.length > 0 && <p className="pf-sub" style={{ margin: 0 }}>{target.name} also adds: {more.join(", ").toLowerCase()}.</p>}
          <p className="pf-sub" style={{ margin: 0 }}>If you used this before, everything you set up is still here. It comes back as it was when you upgrade.</p>
          <div className="pf-plan-lock-cta">
            {asked ? (
              <p className="pf-msg ok" role="status" style={{ margin: 0 }}>You&rsquo;ve asked about upgrading. Someone from The Pass will be in touch — nothing changes until then.</p>
            ) : askable ? (
              <form action={requestPlanAction}>
                <input type="hidden" name="org" value={org} />
                <input type="hidden" name="plan" value={target.id} />
                <input type="hidden" name="feature" value={feature} />
                <input type="hidden" name="back" value={back} />
                <button type="submit" className="pf-btn primary">Talk to us about upgrading</button>
              </form>
            ) : (
              <p className="pf-sub" style={{ margin: 0 }}>An owner or manager can ask about upgrading.</p>
            )}
            <Link href={`/r/${org}/settings/billing`} className="pf-btn">See your plan</Link>
          </div>
          <p className="pf-sub" style={{ margin: 0, fontSize: 12 }}>Asking doesn&rsquo;t charge you or change anything. Billing isn&rsquo;t switched on yet.</p>
        </div>
      </section>
    </>
  );
}
