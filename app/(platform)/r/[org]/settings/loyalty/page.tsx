import { PillarLevers } from "@/components/platform/PillarLevers";
import { SettingsNav } from "@/components/platform/SettingsNav";
import { db } from "@/lib/db";
import { getProgram } from "@/lib/guests/loyalty";
import { requireTenant } from "@/lib/platform/context";
import { saveLoyaltyAction } from "@/lib/platform/settings-actions";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

export default async function Loyalty({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant } = await requireTenant(org);
  const sql = db()!;
  const p = await getProgram(sql, tenant);
  const [stats] = await sql<{ earned: number; redeemed: number; members: number }[]>`
    select count(*)::int as earned, count(redeemed_at)::int as redeemed,
           (select count(*)::int from guests where org_id = ${tenant.orgId} and visit_count > 0) as members
    from loyalty_rewards where org_id = ${tenant.orgId}`;
  const edit = can(tenant, "manage_venue");
  return (
    <>
      <div className="pf-head"><div><h1>Settings</h1><p className="pf-sub">Reward the regulars. Every visit counts automatically, from a booking marked done or a matched check from your point of sale.</p></div></div>
      <SettingsNav org={org} ok={q.ok} err={q.err} />
      <PillarLevers pillar="loyalty" org={org} tenant={tenant} />
      <div className="pf-stats">
        <div className="pf-stat"><b>{stats.members}</b><span>guests with a visit</span></div>
        <div className="pf-stat"><b>{stats.earned}</b><span>rewards earned</span></div>
        <div className="pf-stat"><b>{stats.redeemed}</b><span>rewards redeemed</span></div>
      </div>
      <section className="pf-panel" style={{ maxWidth: 640 }}>
        <h2>Visit rewards</h2>
        <form action={saveLoyaltyAction} className="pf-body">
          <input type="hidden" name="org" value={org} />
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 14 }}>
            <input type="checkbox" name="active" defaultChecked={p.active} disabled={!edit} /> Loyalty is on
          </label>
          <div className="pf-row2" style={{ gridTemplateColumns: "140px 1fr" }}>
            <div className="pf-field"><label htmlFor="ly-v">Every … visits</label><input id="ly-v" name="visits" type="number" min={2} max={50} defaultValue={p.visitsRequired} disabled={!edit} /></div>
            <div className="pf-field"><label htmlFor="ly-r">The reward</label><input id="ly-r" name="reward" defaultValue={p.reward} maxLength={120} disabled={!edit} /></div>
          </div>
          <p className="pf-sub" style={{ margin: 0 }}>The host stand shows the reward next to the guest&rsquo;s name once they&rsquo;ve earned it. One tap marks it given.</p>
          {edit && <button className="pf-btn primary" style={{ justifySelf: "start" }}>Save</button>}
        </form>
      </section>
    </>
  );
}
