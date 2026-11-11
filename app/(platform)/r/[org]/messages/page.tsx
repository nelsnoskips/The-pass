import { db } from "@/lib/db";
import { smsConfigured } from "@/lib/messaging/sms";
import { requireTenant } from "@/lib/platform/context";
import { audienceIds } from "@/lib/platform/audiences";
import { sendCampaign } from "@/lib/platform/message-actions";
import { can } from "@/lib/platform/tenant";
import { formatPhone } from "@/lib/sites/format";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { text: string; tone: string }> = {
  sent: { text: "Sent", tone: "go" },
  dry_run: { text: "Recorded", tone: "" },
  failed: { text: "Failed", tone: "stop" },
};

export default async function Messages({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { org } = await params;
  const q = await searchParams;
  const { tenant } = await requireTenant(org);
  const sql = db()!;
  const [log, counts, lapsed, regulars, everyone] = await Promise.all([
    sql<{ id: string; kind: string; channel: string; status: string; body: string; sent_by: string; created_at: Date; name: string; phone: string }[]>`
      select m.id, m.kind, m.channel, m.status, m.body, m.sent_by, m.created_at, g.name, g.phone
      from guest_messages m join guests g on g.id = m.guest_id
      where m.org_id = ${tenant.orgId} order by m.created_at desc limit 100`,
    sql<{ kind: string; n: number }[]>`
      select kind, count(*)::int as n from guest_messages where org_id = ${tenant.orgId} and created_at > now() - interval '30 days' group by kind`,
    audienceIds(tenant.orgId, "lapsed"), audienceIds(tenant.orgId, "regulars"), audienceIds(tenant.orgId, "everyone"),
  ]);
  const emailList = await audienceIds(tenant.orgId, "everyone", "email");
  const by = new Map(counts.map((c) => [c.kind, c.n]));
  const when = (d: Date) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
  const live = smsConfigured();

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
        <div className="pf-stat"><b>{by.get("marketing") ?? 0}</b><span>campaign texts, 30 days</span></div>
        <div className="pf-stat"><b>{everyone.length}</b><span>guests opted in</span></div>
      </div>
      <div className="pf-layout">
        <section className="pf-panel pf-scroll">
          <h2>Log</h2>
          {log.length === 0 ? <p className="pf-empty">No messages yet.</p> : (
            <table className="pf-table">
              <thead><tr><th>When</th><th>Guest</th><th>Message</th><th>Status</th></tr></thead>
              <tbody>
                {log.map((m) => (
                  <tr key={m.id}>
                    <td className="num" style={{ whiteSpace: "nowrap" }}>{when(m.created_at)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{m.name}<div className="pf-sub" style={{ margin: 0 }}>{m.phone.startsWith("+") ? formatPhone(m.phone) : ""}</div></td>
                    <td>
                      <span className={`pf-pill ${m.kind === "marketing" ? "info" : ""}`} style={{ marginRight: 8 }}>{m.channel === "email" ? "Email" : m.kind === "marketing" ? "Campaign" : "Booking"}</span>
                      <span style={{ color: "var(--muted)" }}>{m.body}</span>
                      <div className="pf-sub mono" style={{ margin: "4px 0 0", fontSize: 11 }}>{m.sent_by === "system" ? "automatic" : m.sent_by}</div>
                    </td>
                    <td><span className={`pf-pill dot ${STATUS[m.status]?.tone ?? ""}`}>{STATUS[m.status]?.text ?? m.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        {can(tenant, "message_guests") && (
          <aside className="pf-sticky">
            <section className="pf-panel">
              <h2>New campaign</h2>
              <form action={sendCampaign} className="pf-body">
                <input type="hidden" name="org" value={org} />
                <fieldset className="pf-field" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="pf-sub" style={{ marginBottom: 6 }}>How</legend>
                  <div style={{ display: "flex", gap: 14, fontSize: 13.5 }}>
                    <label style={{ display: "flex", gap: 6 }}><input type="radio" name="channel" value="sms" defaultChecked /> Text</label>
                    <label style={{ display: "flex", gap: 6 }}><input type="radio" name="channel" value="email" /> Email <span className="pf-sub mono">· {emailList.length} opted in</span></label>
                  </div>
                </fieldset>
                <fieldset className="pf-field" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="pf-sub" style={{ marginBottom: 6 }}>Who</legend>
                  {([["lapsed", "Regulars we haven't seen in 45 days", lapsed.length], ["regulars", "Regulars (3+ visits)", regulars.length], ["everyone", "Everyone opted in", everyone.length]] as const).map(([v, label, n]) => (
                    <label key={v} style={{ display: "flex", gap: 8, fontSize: 13.5, marginBottom: 6 }}>
                      <input type="radio" name="audience" value={v} defaultChecked={v === "lapsed"} />
                      <span>{label} <span className="pf-sub mono">· {n}</span></span>
                    </label>
                  ))}
                </fieldset>
                <div className="pf-field">
                  <label htmlFor="cm-subj">Subject (email only)</label>
                  <input id="cm-subj" name="subject" maxLength={120} placeholder="The terrace is open" />
                </div>
                <div className="pf-field">
                  <label htmlFor="cm-msg">Message</label>
                  <textarea id="cm-msg" name="message" rows={4} maxLength={5000} required placeholder="Thursday at Santorini: the terrace is open and the lamb kleftiko is back on. Book at…" />
                </div>
                <p className="pf-sub" style={{ margin: 0 }}>
                  Only guests who said yes to that channel, at most one campaign a week each. Texts go out 10 am to 8 pm, under 300 characters, with &ldquo;Reply STOP&rdquo; added. Emails get a greeting and a one-click unsubscribe.
                </p>
                <button className="pf-btn primary">Send</button>
              </form>
            </section>
          </aside>
        )}
      </div>
    </>
  );
}
