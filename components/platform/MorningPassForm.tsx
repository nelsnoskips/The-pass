"use client";

import { useState, useTransition } from "react";
import { saveMorningPassAction } from "@/lib/brief/actions";

interface Member { email: string; role: string; phone: string | null }

/**
 * The Morning pass settings form. Controlled, so a refused save keeps
 * every value; the error sits on the field it's about.
 */
export function MorningPassForm({ org, initial, members, tzLabel }: {
  org: string;
  initial: { enabled: boolean; sendAt: string; channel: "email" | "sms"; recipients: string[] };
  members: Member[];
  tzLabel: string;
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [sendAt, setSendAt] = useState(initial.sendAt);
  const [channel, setChannel] = useState<"email" | "sms">(initial.channel);
  const [picked, setPicked] = useState<Set<string>>(new Set(initial.recipients.map((e) => e.toLowerCase())));
  const [phones, setPhones] = useState<Record<string, string>>(Object.fromEntries(members.map((m) => [m.email.toLowerCase(), m.phone ?? ""])));
  const [result, setResult] = useState<{ ok: boolean; text: string; field?: string } | null>(null);
  const [pending, start] = useTransition();

  const touch = () => setResult(null);
  const bad = (f: string) => (result && !result.ok && result.field === f ? { "aria-invalid": true as const, "aria-describedby": "mp-err" } : {});
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const recipients = [...picked];
      const r = await saveMorningPassAction(org, {
        enabled, sendAt, channel, recipients,
        phones: Object.fromEntries(recipients.map((e) => [e, phones[e] ?? ""])),
      });
      setResult(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error, field: r.field });
    });
  };

  return (
    <form onSubmit={save} className="pf-body pf-mp-form" noValidate>
      <label className="pf-mp-toggle">
        <input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); touch(); }} />
        <span><b>Send the morning pass every day</b><span className="pf-sub" style={{ display: "block", margin: "2px 0 0" }}>It&rsquo;s always on Home. Turn this on to get it by email or text too.</span></span>
      </label>

      <div className="pf-field">
        <label htmlFor="mp-time">Send at ({tzLabel})</label>
        <input id="mp-time" type="time" value={sendAt} step={900} onChange={(e) => { setSendAt(e.target.value); touch(); }} {...bad("sendAt")} />
      </div>

      <fieldset className="pf-field pf-mp-fieldset">
        <legend>Send by</legend>
        <div className="pf-mp-radios" {...bad("channel")}>
          <label><input type="radio" name="mp-channel" value="email" checked={channel === "email"} onChange={() => { setChannel("email"); touch(); }} /> Email</label>
          <label><input type="radio" name="mp-channel" value="sms" checked={channel === "sms"} onChange={() => { setChannel("sms"); touch(); }} /> Text message</label>
        </div>
      </fieldset>

      <fieldset className="pf-field pf-mp-fieldset">
        <legend>Send to (people on your team)</legend>
        {members.length === 0 && <p className="pf-sub" style={{ margin: 0 }}>Nobody on the team yet. Add people in Team first.</p>}
        <ul className="pf-mp-people" {...bad("recipients")}>
          {members.map((m) => {
            const key = m.email.toLowerCase();
            const on = picked.has(key);
            return (
              <li key={key}>
                <label className="pf-mp-person">
                  <input type="checkbox" checked={on} onChange={(e) => {
                    const next = new Set(picked);
                    if (e.target.checked) next.add(key); else next.delete(key);
                    setPicked(next); touch();
                  }} />
                  <span>{m.email} <span className="pf-pill">{m.role}</span></span>
                </label>
                {on && channel === "sms" && (
                  <div className="pf-field pf-mp-phone">
                    <label htmlFor={`mp-ph-${key}`}>Mobile for {m.email}</label>
                    <input id={`mp-ph-${key}`} type="tel" inputMode="tel" autoComplete="tel" placeholder="(305) 555-0100"
                      value={phones[key] ?? ""} onChange={(e) => { setPhones({ ...phones, [key]: e.target.value }); touch(); }} {...bad(`phone:${key}`)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      {result && <p id="mp-err" className={`pf-msg ${result.ok ? "ok" : "err"}`} role={result.ok ? "status" : "alert"} style={{ margin: 0 }}>{result.text}</p>}
      <div><button className="pf-btn primary" disabled={pending}>{pending ? "Saving…" : "Save morning pass"}</button></div>
    </form>
  );
}
