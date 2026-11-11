import Link from "next/link";
import { db } from "@/lib/db";
import { formatLever, leverHistory, menuNames, PILLARS, readLevers, type Pillar } from "@/lib/levers";
import type { Tenant } from "@/lib/platform/tenant";

const withinDay = (d: Date) => Date.now() - d.getTime() < 86_400_000;
const ago = (d: Date) => {
  const m = Math.max(1, Math.round((Date.now() - d.getTime()) / 60_000));
  return m < 60 ? `${m}m ago` : m < 48 * 60 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

/**
 * A part of the business at a glance: the settings it runs on, their
 * current values, and every recent change — who made it, whether through
 * the assistant, and before → after. What the chat changes shows up here.
 */
export async function PillarLevers({ pillar, org, tenant }: { pillar: Pillar; org: string; tenant: Tenant }) {
  const sql = db()!;
  const [levers, history, names] = await Promise.all([readLevers(sql, tenant, pillar), leverHistory(sql, tenant, pillar), menuNames(sql, tenant)]);
  if (!levers.length) return null;
  const last = new Map<string, Date>();
  for (const h of history) if (!last.has(h.key)) last.set(h.key, h.at);
  const recent = (k: string) => { const d = last.get(k); return d && withinDay(d) ? d : null; };
  const byKey = new Map(levers.map((l) => [l.def.key, l.def]));

  return (
    <section className="pf-panel pf-levers" id="levers" style={{ marginBottom: 18 }}>
      <h2>{PILLARS[pillar].label} settings <span className="pf-h2-note">change any of these by asking in <Link href={`/r/${org}/chat`}>Chat</Link></span></h2>
      <div className="pf-lever-grid">
        {levers.map(({ def, value }) => {
          const r = recent(def.key);
          return (
            <div key={def.key} className={`pf-lever${r ? " fresh" : ""}`} title={def.help}>
              <span className="l">{def.label}</span>
              <b>{formatLever(def, value, names)}</b>
              {r ? <span className="c">Changed {ago(r)}</span> : <span className="h">{def.help}</span>}
            </div>
          );
        })}
      </div>
      {history.length > 0 && (
        <details className="pf-lever-log" open={history.some((h) => withinDay(h.at))}>
          <summary>Recent changes · {history.length}</summary>
          <ol>
            {history.map((h, i) => {
              const def = byKey.get(h.key);
              const f = (v: unknown) => (def ? formatLever(def, v as never, names) : String(v));
              return (
                <li key={i}>
                  <span className="t"><b>{h.label}</b> {f(h.before)} <span aria-hidden>→</span> {f(h.after)}</span>
                  <span className="mono s">{h.actor}{h.via.startsWith("assistant") ? ` via the assistant${h.via.includes("undo") ? " (undo)" : ""}` : ""} · {ago(h.at)}</span>
                </li>
              );
            })}
          </ol>
        </details>
      )}
    </section>
  );
}
