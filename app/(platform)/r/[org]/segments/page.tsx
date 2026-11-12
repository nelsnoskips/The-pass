import { planLock } from "@/components/platform/NotInPlan";
import Link from "next/link";
import { db } from "@/lib/db";
import { createSegmentAction } from "@/lib/marketing/actions";
import { describeRules, listSegments, segmentCounts } from "@/lib/marketing/segments";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

/**
 * Segments: saved groups of guests, counted live. The built-in ones
 * cover what most restaurants ask for; anyone who can message guests
 * can save their own from the same rules.
 */
export default async function Segments({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant } = await requireTenant(org);
  const locked = await planLock(org, tenant, "segments", { back: `/r/${org}/segments` });
  if (locked) return locked;
  const sql = db()!;
  const now = new Date();
  const segments = await listSegments(sql, tenant);
  const counts = await Promise.all(segments.map((s) => segmentCounts(sql, tenant, s.rules, now)));
  const [{ total }] = await sql<{ total: number }[]>`select count(*)::int as total from guests where org_id = ${tenant.orgId}`;
  const mayCreate = can(tenant, "message_guests");

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Segments</h1>
          <p className="pf-sub">Saved groups of guests, counted live from your guest list of {total.toLocaleString("en-US")}. Use one as the audience for a campaign.</p>
        </div>
      </div>
      {q.ok && <p className="pf-msg ok" role="status" style={{ marginBottom: 14 }}>{q.ok}</p>}
      {q.err && <p className="pf-msg err" role="alert" style={{ marginBottom: 14 }}>{q.err}</p>}
      <div className="pf-layout">
        <section className="pf-panel pf-scroll">
          <h2>All segments</h2>
          <table className="pf-table">
            <thead><tr><th>Segment</th><th>Guests</th><th>Can text</th><th>Can email</th></tr></thead>
            <tbody>
              {segments.map((s, i) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/r/${org}/segments/${s.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>{s.name}</Link>
                    {s.builtin && <span className="pf-pill" style={{ marginLeft: 8 }}>Built in</span>}
                    <div className="pf-sub" style={{ margin: "2px 0 0" }}>{describeRules(s.rules)}</div>
                  </td>
                  <td className="num">{counts[i].members.toLocaleString("en-US")}</td>
                  <td className="num">{counts[i].sms.toLocaleString("en-US")}</td>
                  <td className="num">{counts[i].email.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {mayCreate && (
          <aside className="pf-sticky">
            <section className="pf-panel">
              <h2>Create segment</h2>
              <form action={createSegmentAction} className="pf-body">
                <input type="hidden" name="org" value={org} />
                <div className="pf-field"><label htmlFor="sg-name">Name</label><input id="sg-name" name="name" maxLength={80} required placeholder="Weekend regulars" /></div>
                <p className="pf-sub" style={{ margin: 0 }}>Fill in only the rules you want. A guest has to match all of them.</p>
                <div className="pf-row2">
                  <div className="pf-field"><label htmlFor="sg-v">Visits at least</label><input id="sg-v" name="minVisits" type="number" min={1} inputMode="numeric" /></div>
                  <div className="pf-field"><label htmlFor="sg-ns">No-shows at least</label><input id="sg-ns" name="minNoShows" type="number" min={1} inputMode="numeric" /></div>
                </div>
                <div className="pf-row2">
                  <div className="pf-field"><label htmlFor="sg-l">No visit in (days)</label><input id="sg-l" name="lapsedDays" type="number" min={1} inputMode="numeric" /></div>
                  <div className="pf-field"><label htmlFor="sg-w">Visited within (days)</label><input id="sg-w" name="visitedWithinDays" type="number" min={1} inputMode="numeric" /></div>
                </div>
                <div className="pf-row2">
                  <div className="pf-field"><label htmlFor="sg-j">First seen within (days)</label><input id="sg-j" name="joinedWithinDays" type="number" min={1} inputMode="numeric" /></div>
                  <div className="pf-field"><label htmlFor="sg-s">Spent online at least $</label><input id="sg-s" name="minOnlineSpend" inputMode="decimal" /></div>
                </div>
                <fieldset className="pf-field" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="pf-sub" style={{ marginBottom: 6 }}>Only guests who</legend>
                  {([
                    ["neverVisited", "have never visited"],
                    ["neverBooked", "have never made a reservation"],
                    ["orderedOnline", "have ordered online at least once"],
                    ["openReward", "have a loyalty reward waiting"],
                    ["smsConsent", "said yes to texts"],
                    ["emailConsent", "said yes to emails"],
                  ] as const).map(([k, label]) => (
                    <label key={k} className="pf-choice">
                      <input type="checkbox" name={k} /> {label}
                    </label>
                  ))}
                </fieldset>
                <p className="pf-sub" style={{ margin: 0 }}>Birthdays aren&rsquo;t stored, so there&rsquo;s no birthday rule.</p>
                <button className="pf-btn primary">Save segment</button>
              </form>
            </section>
          </aside>
        )}
      </div>
    </>
  );
}
