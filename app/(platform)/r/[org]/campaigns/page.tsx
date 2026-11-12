import Link from "next/link";
import { db } from "@/lib/db";
import { CAMPAIGN_STATUS, listCampaigns } from "@/lib/marketing/campaigns";
import { smsConfigured } from "@/lib/messaging/sms";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";

export const dynamic = "force-dynamic";

export default async function Campaigns({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant, venues } = await requireTenant(org);
  const timeZone = venues[0]?.timezone ?? "America/New_York";
  const sql = db()!;
  const campaigns = await listCampaigns(sql, tenant);
  const when = (d: Date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone }).format(d);
  const count = (s: string) => campaigns.filter((c) => c.status === s).length;
  const emailLive = Boolean(process.env.RESEND_API_KEY);

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Campaigns</h1>
          <p className="pf-sub">
            Texts and emails to a segment of your guests.{" "}
            {!smsConfigured() || !emailLive ? `No ${!smsConfigured() && !emailLive ? "texting or email" : !smsConfigured() ? "texting" : "email"} service is connected yet, so those sends are recorded as dry runs and nothing leaves.` : ""}
          </p>
        </div>
        {can(tenant, "message_guests") && <Link className="pf-btn primary" href={`/r/${org}/campaigns/new`}>New campaign</Link>}
      </div>
      {q.ok && <p className="pf-msg ok" role="status" style={{ marginBottom: 14 }}>{q.ok}</p>}
      {q.err && <p className="pf-msg err" role="alert" style={{ marginBottom: 14 }}>{q.err}</p>}
      <div className="pf-stats">
        <div className="pf-stat"><b>{count("draft")}</b><span>drafts</span></div>
        <div className="pf-stat"><b>{count("scheduled")}</b><span>scheduled</span></div>
        <div className="pf-stat"><b>{count("sent")}</b><span>sent</span></div>
      </div>
      <section className="pf-panel pf-scroll">
        <h2>All campaigns</h2>
        {campaigns.length === 0 ? (
          <p className="pf-empty">No campaigns yet. Start with a segment, like regulars you haven&rsquo;t seen in a while.</p>
        ) : (
          <table className="pf-table">
            <thead><tr><th>Campaign</th><th>Status</th><th>Channel</th><th>Audience</th><th>Created by</th><th>Sends</th><th>Created</th></tr></thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/r/${org}/campaigns/${c.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>{c.name}</Link></td>
                  <td>
                    <span className={`pf-pill dot ${CAMPAIGN_STATUS[c.status]?.tone ?? ""}`}>{CAMPAIGN_STATUS[c.status]?.text ?? c.status}</span>
                    {c.status === "scheduled" && c.scheduled_for && <div className="pf-sub mono" style={{ margin: "4px 0 0", fontSize: 11 }}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone }).format(c.scheduled_for)}</div>}
                  </td>
                  <td>{c.channel === "sms" ? "Text" : "Email"}</td>
                  <td>{c.segment_name}</td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {c.created_by}
                    {c.requested_by && <div className="pf-sub" style={{ margin: 0, fontSize: 11 }}>for {c.requested_by}</div>}
                  </td>
                  <td className="num">{c.status === "sent" || c.status === "failed" || c.status === "sending" ? c.messages.toLocaleString("en-US") : "—"}</td>
                  <td className="num">{when(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
