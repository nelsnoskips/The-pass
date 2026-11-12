import { planLock } from "@/components/platform/NotInPlan";
import { actorLabel } from "@/lib/agent-runtime/catalog";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormButton } from "@/components/platform/FormButton";
import { db } from "@/lib/db";
import { deleteSegmentAction } from "@/lib/marketing/actions";
import { describeRules, getSegment, segmentCounts, segmentMembers } from "@/lib/marketing/segments";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";
import { formatPhone } from "@/lib/sites/format";
import { formatIn, venueTz } from "@/lib/platform/when";

export const dynamic = "force-dynamic";

const PAGE = 50;

export default async function SegmentPage({ params, searchParams }: {
  params: Promise<{ org: string; id: string }>;
  searchParams: Promise<{ page?: string; ok?: string; err?: string }>;
}) {
  const { org, id } = await params;
  const q = await searchParams;
  const { tenant, venues } = await requireTenant(org);
  const locked = await planLock(org, tenant, "segments", { back: `/r/${org}/segments` });
  if (locked) return locked;
  const tz = venueTz(venues);
  const sql = db()!;
  const seg = await getSegment(sql, tenant, id);
  if (!seg) notFound();
  const now = new Date();
  const counts = await segmentCounts(sql, tenant, seg.rules, now);
  const pages = Math.max(1, Math.ceil(counts.members / PAGE));
  const page = Math.min(Math.max(1, Math.floor(Number(q.page) || 1)), pages);
  const members = await segmentMembers(sql, tenant, seg.rules, { page, pageSize: PAGE }, now);
  const date = (d: Date | null) => formatIn(d, tz, "date");
  const money = (c: number) => (c ? `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—");
  const href = (p: number) => `/r/${org}/segments/${id}${p > 1 ? `?page=${p}` : ""}`;

  return (
    <>
      <div className="pf-head">
        <div>
          <p className="pf-sub" style={{ margin: "0 0 6px" }}><Link href={`/r/${org}/segments`}>Segments</Link></p>
          <h1>{seg.name}</h1>
          <p className="pf-sub">{describeRules(seg.rules)}{seg.createdBy ? ` Saved by ${actorLabel(seg.createdBy)}.` : ""}</p>
        </div>
        <div className="pf-daynav" style={{ flexWrap: "wrap" }}>
          {can(tenant, "manage_venue") && <a className="pf-btn" href={`/r/${org}/segments/${id}/members.csv`} download>Export CSV</a>}
          {can(tenant, "message_guests") && <Link className="pf-btn primary" href={`/r/${org}/campaigns/new?segment=${id}`}>New campaign to this segment</Link>}
          {!seg.builtin && can(tenant, "message_guests") && (
            <FormButton action={deleteSegmentAction} fields={{ org, id }} className="pf-btn quiet">Delete</FormButton>
          )}
        </div>
      </div>
      {q.ok && <p className="pf-msg ok" role="status" style={{ marginBottom: 14 }}>{q.ok}</p>}
      {q.err && <p className="pf-msg err" role="alert" style={{ marginBottom: 14 }}>{q.err}</p>}
      <div className="pf-stats">
        <div className="pf-stat"><b>{counts.members.toLocaleString("en-US")}</b><span>guests right now</span></div>
        <div className="pf-stat"><b>{counts.sms.toLocaleString("en-US")}</b><span>said yes to texts</span></div>
        <div className="pf-stat"><b>{counts.email.toLocaleString("en-US")}</b><span>said yes to emails</span></div>
      </div>
      <section className="pf-panel pf-scroll">
        <h2>Members <span className="pf-h2-note">page {page} of {pages}</span></h2>
        {members.length === 0 ? <p className="pf-empty">Nobody matches this segment yet.</p> : (
          <table className="pf-table">
            <thead><tr><th>Guest</th><th>Visits</th><th>Last visit</th><th>Online spend</th><th>First seen</th><th>Consent</th></tr></thead>
            <tbody>
              {members.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{g.name}</div>
                    <div className="pf-sub" style={{ marginTop: 0 }}>{[g.phone.startsWith("+") ? formatPhone(g.phone) : null, g.email].filter(Boolean).join(" · ") || "No contact"}</div>
                  </td>
                  <td className="num">
                    {g.visit_count}
                    {g.no_show_count > 0 && <span className="pf-pill warn" style={{ marginLeft: 8 }}>{g.no_show_count} no-show</span>}
                  </td>
                  <td className="num">{date(g.last_visit_at)}</td>
                  <td className="num">{money(g.online_cents)}</td>
                  <td className="num">{date(g.created_at)}</td>
                  <td>
                    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                      {g.sms_ok && <span className="pf-pill dot go">Texts</span>}
                      {g.email_ok && <span className="pf-pill dot go">Email</span>}
                      {!g.sms_ok && !g.email_ok && <span className="pf-pill">None</span>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pages > 1 && (
          <div className="pf-daynav" style={{ padding: 16, justifyContent: "flex-end" }}>
            {page > 1 ? <Link className="pf-btn small" href={href(page - 1)}>Previous</Link> : <span className="pf-btn small" aria-disabled style={{ opacity: .45 }}>Previous</span>}
            {page < pages ? <Link className="pf-btn small" href={href(page + 1)}>Next</Link> : <span className="pf-btn small" aria-disabled style={{ opacity: .45 }}>Next</span>}
          </div>
        )}
      </section>
    </>
  );
}
