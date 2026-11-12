"use client";

import { useState } from "react";
import { smsParts } from "@/lib/marketing/sms-count";

export interface ComposerSegment {
  id: string;
  name: string;
  description: string;
  members: number;
  /** Per channel: said yes, and of those, who would get it now (not
   *  already sent a campaign this week). */
  sms: { consented: number; recipients: number };
  email: { consented: number; recipients: number };
}

/**
 * Write a campaign: channel, segment, message. The counts are the same
 * consent and once-a-week rules the send uses; saving never sends.
 */
export function CampaignComposer({
  org, action, segments, initial,
}: {
  org: string;
  action: (form: FormData) => void | Promise<void>;
  segments: ComposerSegment[];
  initial: { id?: string; name: string; channel: "sms" | "email"; segment: string; subject: string; body: string };
}) {
  const [channel, setChannel] = useState<"sms" | "email">(initial.channel);
  const [segment, setSegment] = useState(initial.segment || segments[0]?.id || "");
  const [body, setBody] = useState(initial.body);
  const seg = segments.find((s) => s.id === segment);
  const reach = seg ? seg[channel] : null;
  const sms = smsParts(body);
  const n = (x: number) => x.toLocaleString("en-US");

  return (
    <form action={action} className="pf-body">
      <input type="hidden" name="org" value={org} />
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="pf-field"><label htmlFor="cp-name">Name (only your team sees it)</label><input id="cp-name" name="name" defaultValue={initial.name} maxLength={100} required placeholder="Terrace reopening" /></div>

      <fieldset className="pf-field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="pf-sub" style={{ marginBottom: 6 }}>Send as</legend>
        <div style={{ display: "flex", gap: 14, fontSize: 13.5 }}>
          <label className="pf-choice"><input type="radio" name="channel" value="sms" checked={channel === "sms"} onChange={() => setChannel("sms")} /> Text</label>
          <label className="pf-choice"><input type="radio" name="channel" value="email" checked={channel === "email"} onChange={() => setChannel("email")} /> Email</label>
        </div>
      </fieldset>

      <div className="pf-field">
        <label htmlFor="cp-seg">Segment</label>
        <select id="cp-seg" name="segment" value={segment} onChange={(e) => setSegment(e.target.value)} required>
          {segments.map((s) => <option key={s.id} value={s.id}>{s.name} · {n(s.members)} guests</option>)}
        </select>
        {seg && <p className="pf-sub" style={{ margin: 0 }}>{seg.description}</p>}
      </div>

      {seg && reach && (
        <div className="pf-mk-reach" aria-live="polite">
          <b className="mono">{n(reach.recipients)}</b>
          <span>
            would get this {channel === "sms" ? "text" : "email"} now. Of {n(seg.members)} in the segment, {n(reach.consented)} said yes to {channel === "sms" ? "texts" : "emails"}
            {reach.consented > reach.recipients ? `, and ${n(reach.consented - reach.recipients)} already got a campaign this week` : ""}. Counted again when it sends.
          </span>
        </div>
      )}

      {channel === "email" && (
        <div className="pf-field"><label htmlFor="cp-subj">Subject</label><input id="cp-subj" name="subject" defaultValue={initial.subject} maxLength={120} required placeholder="The terrace is open" /></div>
      )}
      <div className="pf-field">
        <label htmlFor="cp-body">Message</label>
        <textarea id="cp-body" name="body" rows={channel === "sms" ? 4 : 10} value={body} onChange={(e) => setBody(e.target.value)}
          maxLength={channel === "sms" ? 300 : 5000} required
          placeholder={channel === "sms" ? "Thursday at Santorini: the terrace is open and the lamb kleftiko is back. Book at…" : "The terrace opens Thursday…"} />
        {channel === "sms" ? (
          <p className={`pf-sub mono ${body.length > 300 ? "pf-mk-over" : ""}`} style={{ margin: 0, fontSize: 12 }}>
            {body.length}/300 characters · with &ldquo;Reply STOP to opt out.&rdquo; added: {sms.chars} characters, {sms.parts} text{sms.parts === 1 ? "" : "s"} each{sms.unicode ? " (emoji or special characters make texts shorter)" : ""}
          </p>
        ) : (
          <p className="pf-sub" style={{ margin: 0 }}>Each email starts &ldquo;Hi &lt;first name&gt;,&rdquo; and ends with your restaurant&rsquo;s name and a one-click unsubscribe.</p>
        )}
      </div>
      <p className="pf-sub" style={{ margin: 0 }}>Saving doesn&rsquo;t send anything. You&rsquo;ll see exactly how many guests it goes to and confirm before it sends.</p>
      <button className="pf-btn primary">Save draft</button>
    </form>
  );
}
