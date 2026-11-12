import { CampaignForm } from "@/components/platform/CampaignForm";
import { textable } from "@/lib/agent-runtime/agents/reservations";
import { db } from "@/lib/db";
import { emailable } from "@/lib/messaging/email";
import { smsConfigured } from "@/lib/messaging/sms";
import { maskManageLinks } from "@/lib/platform/approvals";
import { audienceIds, type Audience } from "@/lib/platform/audiences";
import { requireTenant } from "@/lib/platform/context";
import { sendCampaign } from "@/lib/platform/message-actions";
import { can } from "@/lib/platform/tenant";
import { formatIn, venueTz } from "@/lib/platform/when";
import { formatPhone } from "@/lib/sites/format";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { text: string; tone: string }> = {
  sent: { text: "Sent", tone: "go" },
  dry_run: { text: "Recorded", tone: "" },
  failed: { text: "Failed", tone: "stop" },
};
const AUDIENCES: Audience[] = ["lapsed", "regulars", "everyone"];

export default async function Messages({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant, venues } = await requireTenant(org);
  const tz = venueTz(venues);
  const sql = db()!;
  const now = new Date();
  const [log, counts, smsLists, emailLists] = await Promise.all([
    sql<{ id: string; kind: string; channel: string; status: string; body: string; sent_by: string; created_at: Date; name: string; phone: string }[]>`
      select m.id, m.kind, m.channel, m.status, m.body, m.sent_by, m.created_at, g.name, g.phone
      from guest_messages m join guests g on g.id = m.guest_id
      where m.org_id = ${tenant.orgId} order by m.created_at desc limit 100`,
    sql<{ kind: string; n: number }[]>`
      select kind, count(*)::int as n from guest_messages where org_id = ${tenant.orgId} and created_at > now() - interval '30 days' group by kind`,
    Promise.all(AUDIENCES.map((a) => audienceIds(tenant.orgId, a, "sms"))),
    Promise.all(AUDIENCES.map((a) => audienceIds(tenant.orgId, a, "email"))),
  ]);
  const sender = can(tenant, "message_guests");
  // The exact number each choice reaches if sent now: the same checks the
  // send runs (consent, opt-out, nothing promotional this week).
  const reach = sender ? {
    sms: Object.fromEntries(await Promise.all(AUDIENCES.map(async (a, i) =>
      [a, (await textable({ sql, tenant, agentId: "person", runId: null, now }, smsLists[i])).length] as const))) as Record<Audience, number>,
    email: Object.fromEntries(await Promise.all(AUDIENCES.map(async (a, i) =>
      [a, (await emailable(sql, tenant.orgId, emailLists[i], now)).length] as const))) as Record<Audience, number>,
  } : null;
  const by = new Map(counts.map((c) => [c.kind, c.n]));
  const when = (d: Date) => formatIn(d, tz, "datetime");
  const live = smsConfigured();
  // A booking or order link in a text lets whoever holds it change or
  // cancel; only people who manage the venue see them whole.
  const showLinks = can(tenant, "manage_venue");

  return (
    <>
      <div className="pf-head">
        <div>
          <h1>Messages</h1>
          <p className="pf-sub">Every text to a guest, and why. {live ? "" : "Texting isn't switched on yet: messages are recorded, not sent."}</p>
        </div>
      </div>
      {q.ok && <p className="pf-msg ok" role="status" style={{ marginBottom: 14 }}>{q.ok}</p>}
      {q.err && <p className="pf-msg err" role="alert" style={{ marginBottom: 14 }}>{q.err}</p>}
      <div className="pf-stats">
        <div className="pf-stat"><b>{by.get("transactional") ?? 0}</b><span>booking texts, 30 days</span></div>
        <div className="pf-stat"><b>{by.get("marketing") ?? 0}</b><span>campaign messages, 30 days</span></div>
        <div className="pf-stat"><b>{smsLists[2].length}</b><span>guests opted in to texts</span></div>
      </div>
      <div className="pf-layout">
        <section className="pf-panel">
          <h2>Log</h2>
          {log.length === 0 ? <p className="pf-empty">No messages yet.</p> : (
            <div className="pf-scroll">
              <table className="pf-table pf-log">
                <thead><tr><th>When</th><th>Guest</th><th>Message</th><th>Status</th></tr></thead>
                <tbody>
                  {log.map((m) => (
                    <tr key={m.id}>
                      <td className="num" style={{ whiteSpace: "nowrap" }}>{when(m.created_at)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{m.name}<div className="pf-sub" style={{ margin: 0 }}>{m.phone.startsWith("+") ? formatPhone(m.phone) : ""}</div></td>
                      <td style={{ minWidth: 260 }}>
                        <span className={`pf-pill ${m.kind === "marketing" ? "info" : ""}`} style={{ marginRight: 8 }}>{m.channel === "email" ? "Email" : m.kind === "marketing" ? "Campaign" : "Booking"}</span>
                        <span style={{ color: "var(--muted)", overflowWrap: "anywhere" }}>{showLinks ? m.body : maskManageLinks(m.body)}</span>
                        <div className="pf-sub mono" style={{ margin: "4px 0 0", fontSize: 11.5 }}>{m.sent_by === "system" ? "automatic" : m.sent_by}</div>
                      </td>
                      <td><span className={`pf-pill dot ${STATUS[m.status]?.tone ?? ""}`}>{STATUS[m.status]?.text ?? m.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {reach && (
          <aside className="pf-sticky">
            <section className="pf-panel">
              <h2>New campaign</h2>
              <CampaignForm org={org} action={sendCampaign} counts={reach} />
            </section>
          </aside>
        )}
      </div>
    </>
  );
}
