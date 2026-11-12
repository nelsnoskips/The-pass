"use client";

import { useState } from "react";

type Channel = "sms" | "email";
type Audience = "lapsed" | "regulars" | "everyone";

const AUDIENCES: [Audience, string][] = [
  ["lapsed", "Regulars we haven't seen in 45 days"],
  ["regulars", "Regulars (3+ visits)"],
  ["everyone", "Everyone opted in"],
];

/**
 * The Messages page's quick campaign: channel and audience as real
 * choice rows, each with the exact number it would reach right now, and
 * a confirm naming that number before anything is sent.
 */
export function CampaignForm({ org, action, counts }: {
  org: string;
  action: (form: FormData) => void | Promise<void>;
  /** Guests each choice reaches now: consent, not opted out, not already sent a campaign this week. */
  counts: Record<Channel, Record<Audience, number>>;
}) {
  const [channel, setChannel] = useState<Channel>("sms");
  const [audience, setAudience] = useState<Audience>("lapsed");
  const n = counts[channel][audience];

  return (
    <form
      action={action}
      className="pf-body"
      onSubmit={(e) => {
        if (n === 0) { e.preventDefault(); window.alert("Nobody in that group can get this right now."); return; }
        const what = channel === "sms" ? "text" : "email";
        if (!window.confirm(`Sends now to ${n} guest${n === 1 ? "" : "s"} (${what}) — Send?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="org" value={org} />
      <fieldset className="pf-choices">
        <legend>How</legend>
        <label className="pf-choice">
          <input type="radio" name="channel" value="sms" checked={channel === "sms"} onChange={() => setChannel("sms")} />
          <span>Text</span>
        </label>
        <label className="pf-choice">
          <input type="radio" name="channel" value="email" checked={channel === "email"} onChange={() => setChannel("email")} />
          <span>Email</span>
        </label>
      </fieldset>
      <fieldset className="pf-choices">
        <legend>Who</legend>
        {AUDIENCES.map(([v, label]) => (
          <label key={v} className="pf-choice">
            <input type="radio" name="audience" value={v} checked={audience === v} onChange={() => setAudience(v)} />
            <span>{label}</span>
            <span className="n mono">{counts[channel][v]}</span>
          </label>
        ))}
      </fieldset>
      {channel === "email" && (
        <div className="pf-field">
          <label htmlFor="cm-subj">Subject</label>
          <input id="cm-subj" name="subject" maxLength={120} required placeholder="The terrace is open" />
        </div>
      )}
      <div className="pf-field">
        <label htmlFor="cm-msg">Message</label>
        <textarea id="cm-msg" name="message" rows={4} maxLength={channel === "sms" ? 300 : 5000} required
          placeholder="Thursday at Santorini: the terrace is open and the lamb kleftiko is back on. Book at…" />
      </div>
      <p className="pf-sub" style={{ margin: 0 }}>
        Only guests who said yes to that channel, at most one campaign a week each. Texts go out 10 am to 8 pm, under 300 characters, with &ldquo;Reply STOP&rdquo; added. Emails get a greeting and a one-click unsubscribe.
      </p>
      <button className="pf-btn primary" disabled={n === 0}>Review &amp; send to {n} guest{n === 1 ? "" : "s"}</button>
    </form>
  );
}
