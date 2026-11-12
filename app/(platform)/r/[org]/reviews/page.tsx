import { planLock } from "@/components/platform/NotInPlan";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { postReply, syncGoogle } from "@/lib/platform/review-actions";
import { listOrgIntegrations } from "@/lib/platform/settings";
import { can } from "@/lib/platform/tenant";
import { formatIn, venueTz } from "@/lib/platform/when";

export const dynamic = "force-dynamic";

export default async function Reviews({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant, venues } = await requireTenant(org);
  const locked = await planLock(org, tenant, "reviews", { back: `/r/${org}/reviews` });
  if (locked) return locked;
  const tz = venueTz(venues);
  const sql = db()!;
  const google = (await listOrgIntegrations(sql, tenant)).find((i) => i.provider === "google_business");
  const connected = google?.status === "connected";
  const reviews = await sql<{ id: string; author: string | null; rating: number | null; body: string | null; reviewed_at: Date | null; reply: string | null }[]>`
    select id, author, rating, body, reviewed_at, reply from reviews where org_id = ${tenant.orgId}
    order by (reply is null) desc, reviewed_at desc nulls last limit 100`;
  const avg = reviews.filter((r) => r.rating).reduce((s, r, _, a) => s + (r.rating ?? 0) / a.length, 0);
  const waiting = reviews.filter((r) => !r.reply).length;
  const edit = can(tenant, "manage_venue");
  const when = (d: Date | null) => (d ? formatIn(d, tz, "date") : "");

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Reviews</h1>
          <p className="pf-sub">{connected ? `From Google · ${google?.accountLabel ?? ""}` : "Connect Google Business Profile to bring your reviews here."}</p>
        </div>
        {connected && edit && (
          <form action={syncGoogle}><input type="hidden" name="org" value={org} /><button className="pf-btn">Sync with Google</button></form>
        )}
        {!connected && <Link className="pf-btn primary" href={`/r/${org}/settings`}>Connect Google</Link>}
      </div>
      {q.ok && <p className="pf-msg ok" role="status" style={{ marginBottom: 14 }}>{q.ok}</p>}
      {q.err && <p className="pf-msg err" role="alert" style={{ marginBottom: 14 }}>{q.err}</p>}
      <div className="pf-stats">
        <div className="pf-stat"><b>{reviews.length ? avg.toFixed(1) : "—"}</b><span>average rating</span></div>
        {/* Without Google there's nothing to count: "—", not a false zero. */}
        <div className="pf-stat"><b>{reviews.length || connected ? reviews.length : "—"}</b><span>{reviews.length || connected ? "reviews" : "reviews · Google not connected"}</span></div>
        <div className={`pf-stat${waiting ? " live" : ""}`}><b>{reviews.length || connected ? waiting : "—"}</b><span>waiting for a reply</span></div>
      </div>
      <section className="pf-panel">
        {reviews.length === 0 ? <p className="pf-empty">{connected ? "No reviews yet." : "Not connected. Connect Google Business Profile in Settings and your reviews arrive here, ready to answer."}</p> : reviews.map((r) => (
          <article key={r.id} style={{ padding: 16, borderTop: "1px solid var(--rule)", display: "grid", gap: 8 }}>
            <div className="pf-res-meta" style={{ marginTop: 0 }}>
              <span style={{ color: "var(--warn)", letterSpacing: 2 }} aria-label={`${r.rating ?? 0} stars`}>{"★".repeat(r.rating ?? 0)}<span style={{ color: "var(--faint)" }}>{"★".repeat(5 - (r.rating ?? 0))}</span></span>
              <span style={{ color: "var(--ink)" }}>{r.author ?? "A guest"}</span>
              <span className="mono">{when(r.reviewed_at)}</span>
            </div>
            {r.body && <p style={{ margin: 0 }}>{r.body}</p>}
            {r.reply ? (
              <p className="pf-sub" style={{ margin: 0, borderLeft: "2px solid var(--brand)", paddingLeft: 10 }}>Your reply: {r.reply}</p>
            ) : edit && connected ? (
              <form action={postReply} style={{ display: "grid", gap: 8 }}>
                <input type="hidden" name="org" value={org} /><input type="hidden" name="review" value={r.id} />
                <textarea className="pf-input" name="reply" rows={2} placeholder="Thank them by name, mention what they enjoyed, invite them back." />
                <button className="pf-btn small" style={{ justifySelf: "start" }}>Post reply</button>
              </form>
            ) : null}
          </article>
        ))}
      </section>
    </>
  );
}
