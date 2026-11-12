import { MorningPassForm } from "@/components/platform/MorningPassForm";
import { SettingsNav } from "@/components/platform/SettingsNav";
import { actorLabel } from "@/lib/agent-runtime/catalog";
import { buildMorningPass, renderMorningPassText } from "@/lib/brief";
import { readBriefSettings } from "@/lib/brief/settings";
import { db } from "@/lib/db";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";
import { formatIn, venueTz } from "@/lib/platform/when";

export const dynamic = "force-dynamic";
export const metadata = { title: "Morning pass · The Pass" };

const STATUS: Record<string, { text: string; tone: string }> = {
  sent: { text: "Sent", tone: "go" },
  dry_run: { text: "Recorded, not sent", tone: "" },
  partial: { text: "Partly sent", tone: "warn" },
  failed: { text: "Failed", tone: "stop" },
  sending: { text: "Sending", tone: "warn" },
};

/**
 * Settings → Morning pass: whether the daily brief is sent, when, how
 * and to whom on the team, what it says today, and every send so far.
 */
export default async function MorningPassSettings({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const { tenant, venues } = await requireTenant(org);
  const sql = db()!;
  const tz = venueTz(venues);
  const manage = can(tenant, "manage_venue");
  const [settings, members, sends, brief] = await Promise.all([
    readBriefSettings(sql, tenant),
    sql<{ email: string; role: string; phone: string | null }[]>`
      select email, role, phone from org_members where org_id = ${tenant.orgId} order by role, email`,
    sql<{ local_date: string; channel: string; status: string; recipients: { member: string; status: string }[]; created_at: Date }[]>`
      select to_char(local_date, 'YYYY-MM-DD') as local_date, channel, status, recipients, created_at from brief_sends
      where org_id = ${tenant.orgId} order by local_date desc limit 7`,
    buildMorningPass(sql, tenant),
  ]);
  const tzLabel = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? tz;
  const preview = brief ? renderMorningPassText(brief, `/r/${org}`) : null;
  const clock = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  };

  return (
    <>
      <div className="pf-head"><div><h1>Settings</h1><p className="pf-sub">The morning pass: last night, today and what needs a decision, from The Pass, every morning.</p></div></div>
      <SettingsNav org={org} />
      <div className="pf-layout">
        <section className="pf-panel" aria-labelledby="mp-set-h">
          <h2 id="mp-set-h">Morning pass</h2>
          {manage ? (
            <MorningPassForm org={org} tzLabel={`${tzLabel}, the restaurant's time`} members={members}
              initial={{ enabled: settings.enabled, sendAt: settings.sendAt, channel: settings.channel, recipients: settings.recipients }} />
          ) : (
            <div className="pf-body">
              <p style={{ margin: 0 }}>
                {settings.enabled
                  ? `Sent every day at ${clock(settings.sendAt)} (${tzLabel}) by ${settings.channel === "sms" ? "text" : "email"} to ${settings.recipients.join(", ") || "nobody yet"}.`
                  : "Not sent by email or text. It's always on Home."}
              </p>
              <p className="pf-sub" style={{ margin: 0 }}>An owner or manager can change this.</p>
            </div>
          )}
          {settings.updatedBy && settings.updatedAt && (
            <p className="pf-sub" style={{ margin: 0, padding: "0 16px 16px", fontSize: 12 }}>Last changed by {actorLabel(settings.updatedBy)}, {formatIn(settings.updatedAt, tz, "datetime")}.</p>
          )}
        </section>

        <aside className="pf-sticky" style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <section className="pf-panel">
            <h2>What it says today</h2>
            {preview ? <pre className="pf-mp-preview">{preview}</pre> : <p className="pf-empty">Once your floor and hours are set up, today&rsquo;s brief shows here.</p>}
          </section>
          <section className="pf-panel">
            <h2>Sent</h2>
            {sends.length === 0 ? <p className="pf-empty" style={{ padding: "18px 16px" }}>Nothing sent yet.</p> : (
              <div className="pf-scroll">
                <table className="pf-table">
                  <thead><tr><th>Day</th><th>By</th><th>Result</th></tr></thead>
                  <tbody>
                    {sends.map((s) => (
                      <tr key={s.local_date}>
                        <td className="num">{formatIn(`${s.local_date}T12:00:00Z`, "UTC", "date")}<div className="pf-sub" style={{ margin: 0, fontSize: 11.5 }}>{formatIn(s.created_at, tz, "time")}</div></td>
                        <td>{s.channel === "sms" ? "Text" : "Email"}<div className="pf-sub" style={{ margin: 0, fontSize: 11.5 }}>{s.recipients.length} {s.recipients.length === 1 ? "person" : "people"}</div></td>
                        <td><span className={`pf-pill dot ${STATUS[s.status]?.tone ?? ""}`}>{STATUS[s.status]?.text ?? s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
