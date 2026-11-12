import { actorLabel } from "@/lib/agent-runtime/catalog";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormButton } from "@/components/platform/FormButton";
import { db } from "@/lib/db";
import {
  deleteCampaignAction, scheduleCampaignAction, sendCampaignAction, unscheduleCampaignAction,
} from "@/lib/marketing/actions";
import { CAMPAIGN_STATUS, campaignResults, getCampaign, reach, smsParts } from "@/lib/marketing/campaigns";
import { SEND_WINDOW, withOptOut } from "@/lib/messaging/sms";
import { requireTenant } from "@/lib/platform/context";
import { can } from "@/lib/platform/tenant";
import { localDate, localTime } from "@/lib/reservations/time";

export const dynamic = "force-dynamic";

const n = (x: number) => x.toLocaleString("en-US");
const money = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export default async function CampaignPage({ params, searchParams }: {
  params: Promise<{ org: string; id: string }>;
  searchParams: Promise<{ confirm?: string; ok?: string; err?: string }>;
}) {
  const { org, id } = await params;
  const q = await searchParams;
  const { tenant, venues, org: orgRow } = await requireTenant(org);
  const sql = db()!;
  const c = await getCampaign(sql, tenant, id);
  if (!c) notFound();
  const tz = venues[0]?.timezone ?? "America/New_York";
  const now = new Date();
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: tz }).format(d);
  const open = c.status === "draft" || c.status === "scheduled";
  const mayMessage = can(tenant, "message_guests");
  const audience = open ? await reach(sql, tenant, c.segment, c.channel, now) : null;
  const results = await campaignResults(sql, tenant, c);
  const recipients = audience?.recipients.length ?? 0;
  const confirming = q.confirm === "1" && open && mayMessage;
  const channelWord = c.channel === "sms" ? "texts" : "emails";
  const parts = smsParts(c.body);
  // Tomorrow at noon, the restaurant's time, as the schedule default.
  const tomorrow = localDate(new Date(now.getTime() + 86_400_000), tz);
  const windowClosesAt = results && c.sent_at ? new Date(c.sent_at.getTime() + 7 * 86_400_000) : null;

  return (
    <>
      <div className="pf-head">
        <div>
          <p className="pf-sub" style={{ margin: "0 0 6px" }}><Link href={`/r/${org}/campaigns`}>Campaigns</Link></p>
          <h1>{c.name} <span className={`pf-pill dot ${CAMPAIGN_STATUS[c.status].tone}`} style={{ verticalAlign: "middle", marginLeft: 6 }}>{CAMPAIGN_STATUS[c.status].text}</span></h1>
          <p className="pf-sub">
            {c.channel === "sms" ? "Text" : "Email"} to <Link href={`/r/${org}/segments/${c.segment}`}>{c.segment_name}</Link> · written by <span className="mono">{actorLabel(c.created_by)}</span>
            {c.requested_by ? ` for ${actorLabel(c.requested_by)}` : ""} · {fmt(c.created_at)}
            {c.status === "scheduled" && c.scheduled_for ? ` · sends ${fmt(c.scheduled_for)} (${actorLabel(c.scheduled_by)})` : ""}
            {c.sent_at ? ` · sent ${fmt(c.sent_at)} by ${actorLabel(c.sent_by)}` : ""}
          </p>
        </div>
        {open && mayMessage && !confirming && (
          <div className="pf-daynav" style={{ flexWrap: "wrap" }}>
            {c.status === "draft" && <Link className="pf-btn" href={`/r/${org}/campaigns/new?edit=${c.id}`}>Edit</Link>}
            {c.status === "draft" && <FormButton action={deleteCampaignAction} fields={{ org, id: c.id }} className="pf-btn quiet">Delete</FormButton>}
            {c.status === "scheduled" && <FormButton action={unscheduleCampaignAction} fields={{ org, id: c.id }} className="pf-btn">Unschedule</FormButton>}
            <Link className="pf-btn primary" href={`/r/${org}/campaigns/${c.id}?confirm=1`}>Send now…</Link>
          </div>
        )}
      </div>
      {q.ok && <p className="pf-msg ok" role="status" style={{ marginBottom: 14 }}>{q.ok}</p>}
      {q.err && <p className="pf-msg err" role="alert" style={{ marginBottom: 14 }}>{q.err}</p>}
      {c.status === "failed" && c.last_error && <p className="pf-msg err" role="alert" style={{ marginBottom: 14 }}>It didn&rsquo;t send: {c.last_error}</p>}

      {confirming && audience && (
        <section className="pf-panel pf-mk-confirm" style={{ marginBottom: 18 }}>
          <h2>Confirm the send</h2>
          <div className="pf-body">
            <p className="pf-mk-big">
              {recipients === 0 ? "Nobody in this segment can get it right now." : <>This {c.channel === "sms" ? "text" : "email"} goes to exactly <b className="mono">{n(recipients)}</b> guest{recipients === 1 ? "" : "s"}, now.</>}
            </p>
            <ul className="pf-mk-list">
              <li>{n(audience.members)} guest{audience.members === 1 ? " is" : "s are"} in &ldquo;{c.segment_name}&rdquo;.</li>
              <li>{n(audience.members - audience.consented)} left out: no {c.channel === "sms" ? "text" : "email"} consent on record, or opted out.</li>
              <li>{n(audience.recentlyMessaged)} left out: already got a campaign in the last 7 days.</li>
              {c.channel === "sms" && <li>&ldquo;Reply STOP to opt out.&rdquo; is added. Texts only go out {SEND_WINDOW.startHour} am to {SEND_WINDOW.endHour - 12} pm, your time.</li>}
              {c.channel === "email" && <li>Each email carries a one-click unsubscribe.</li>}
            </ul>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <FormButton action={sendCampaignAction} fields={{ org, id: c.id, expected: String(recipients) }} className="pf-btn primary" disabled={recipients === 0}>
                Send to {n(recipients)} guest{recipients === 1 ? "" : "s"}
              </FormButton>
              <Link className="pf-btn" href={`/r/${org}/campaigns/${c.id}`}>Cancel</Link>
            </div>
          </div>
        </section>
      )}

      {results && (
        <>
          <div className="pf-stats">
            <div className="pf-stat"><b>{n(results.recipients)}</b><span>recipients</span></div>
            <div className="pf-stat"><b>{n(results.sent)}</b><span>sent</span></div>
            <div className="pf-stat"><b>{n(results.dryRun)}</b><span>dry run (recorded, not sent)</span></div>
            <div className="pf-stat"><b>{n(results.failed)}</b><span>failed</span></div>
            <div className="pf-stat"><b>{n(results.optedOutSince)}</b><span>opted out since</span></div>
          </div>
          <section className="pf-panel" style={{ marginBottom: 18 }}>
            <h2>Came back within 7 days</h2>
            <div className="pf-body">
              <div className="pf-stats" style={{ marginBottom: 0 }}>
                <div className="pf-stat"><b>{results.recipients ? n(results.cameBack.guests) : "—"}</b><span>recipients who booked or ordered</span></div>
                <div className="pf-stat"><b>{results.recipients ? n(results.cameBack.bookings) : "—"}</b><span>bookings made</span></div>
                <div className="pf-stat"><b>{results.recipients ? n(results.cameBack.orders) : "—"}</b><span>online orders</span></div>
                <div className="pf-stat"><b>{results.cameBack.orders ? money(results.cameBack.orderCents) : "—"}</b><span>online order sales</span></div>
              </div>
              <p className="pf-sub" style={{ margin: 0 }}>
                Guests who got this and then booked or ordered within 7 days of the send. Some would have come back anyway — it shows who came back, not that the message made them. No tracking pixels or links are used.
                {windowClosesAt && windowClosesAt > now ? ` Still counting until ${fmt(windowClosesAt)}.` : ""}
              </p>
            </div>
          </section>
        </>
      )}

      <div className="pf-layout">
        <section className="pf-panel">
          <h2>Message</h2>
          <div className="pf-body">
            {c.channel === "sms" ? (
              <>
                <div className="pf-mk-preview sms">{withOptOut(c.body)}</div>
                <p className="pf-sub mono" style={{ margin: 0, fontSize: 12 }}>{parts.chars} characters · {parts.parts} text{parts.parts === 1 ? "" : "s"} each</p>
              </>
            ) : (
              <div className="pf-mk-preview">
                <b>{c.subject}</b>
                {`\n\nHi <first name>,\n\n${c.body}\n\n—\n${orgRow.name}\nUnsubscribe: <link>`}
              </div>
            )}
          </div>
        </section>

        {open && audience && (
          <aside className="pf-sticky">
            <section className="pf-panel">
              <h2>Who gets it</h2>
              <div className="pf-body">
                <div className="pf-mk-reach"><b className="mono">{n(recipients)}</b><span>would get it now: {n(audience.members)} in the segment, {n(audience.consented)} said yes to {channelWord}, {n(audience.recentlyMessaged)} already got a campaign this week.</span></div>
              </div>
            </section>
            {mayMessage && (
              <section className="pf-panel">
                <h2>{c.status === "scheduled" ? "Change the time" : "Schedule"}</h2>
                <form action={scheduleCampaignAction} className="pf-body">
                  <input type="hidden" name="org" value={org} />
                  <input type="hidden" name="id" value={c.id} />
                  <div className="pf-field">
                    <label htmlFor="cm-when">Send at (your time)</label>
                    <input id="cm-when" name="when" type="datetime-local" required
                      defaultValue={c.scheduled_for ? `${localDate(c.scheduled_for, tz)}T${localTime(c.scheduled_for, tz).slice(0, 5)}` : `${tomorrow}T12:00`} />
                  </div>
                  <label className="pf-choice">
                    <input type="checkbox" name="confirm" required />
                    <span>Send it then to the guests in &ldquo;{c.segment_name}&rdquo; who can get {channelWord} — {n(recipients)} today, counted again at send time.</span>
                  </label>
                  {c.channel === "sms" && <p className="pf-sub" style={{ margin: 0 }}>Outside {SEND_WINDOW.startHour} am – {SEND_WINDOW.endHour - 12} pm it waits for the next hour inside.</p>}
                  <button className="pf-btn">{c.status === "scheduled" ? "Reschedule" : "Schedule"}</button>
                </form>
              </section>
            )}
          </aside>
        )}
      </div>
    </>
  );
}
