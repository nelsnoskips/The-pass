"use client";

import { useMemo, useRef, useState } from "react";

export interface EditableTable { id?: string; label: string; area: string; minCovers: number; maxCovers: number; online: boolean; active: boolean }
type Row = EditableTable & { key: string };

const blank = (n: number): Row => ({ key: `new-${n}`, label: "", area: "", minCovers: 1, maxCovers: 2, online: true, active: true });
const same = (a: EditableTable, b: EditableTable) =>
  a.label === b.label && a.area === b.area && a.minCovers === b.minCovers && a.maxCovers === b.maxCovers && a.online === b.online && a.active === b.active;

/**
 * Every table in one real table: aligned headers, a label on every
 * input, and one "Save changes" for whatever was edited or added — with
 * a bar saying how many changes are waiting.
 */
export function TablesEditor({ org, venue, tables, edit, action }: {
  org: string; venue: string; tables: (EditableTable & { id: string })[]; edit: boolean;
  action: (form: FormData) => void | Promise<void>;
}) {
  const original = useMemo(() => new Map(tables.map((t) => [t.id, t])), [tables]);
  const [rows, setRows] = useState<Row[]>(() => [...tables.map((t) => ({ ...t, area: t.area ?? "", key: t.id })), blank(0)]);
  const counter = useRef(1);

  const changed = rows.filter((r) => (r.id ? !same(r, original.get(r.id)!) : r.label.trim() !== ""));
  const dirty = changed.length > 0;
  const set = (key: string, patch: Partial<Row>) => setRows((rs) => {
    const next = rs.map((r) => (r.key === key ? { ...r, ...patch } : r));
    // Typing in the last empty row opens another one under it.
    const last = next[next.length - 1];
    if (!last.id && last.label.trim()) next.push(blank(counter.current++));
    return next;
  });
  const reset = () => setRows([...tables.map((t) => ({ ...t, area: t.area ?? "", key: t.id })), blank(counter.current++)]);
  const name = (r: Row) => (r.id ? `table ${original.get(r.id)?.label ?? r.label}` : "new table");

  return (
    <form action={action} onSubmit={(e) => { if (!dirty) e.preventDefault(); }}>
      <input type="hidden" name="org" value={org} />
      <input type="hidden" name="venue" value={venue} />
      <input type="hidden" name="tables" value={JSON.stringify(changed.map(({ key: _key, ...r }) => r))} />
      <div className="pf-scroll">
        <table className="pf-table pf-floor">
          <thead>
            <tr>
              <th scope="col">Table</th>
              <th scope="col">Area</th>
              <th scope="col">Seats (min – max)</th>
              <th scope="col"><abbr title="Guests can book it on your website">Online</abbr></th>
              <th scope="col"><abbr title="Off takes it out of service">In use</abbr></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isDirty = r.id ? !same(r, original.get(r.id)!) : r.label.trim() !== "";
              return (
                <tr key={r.key} className={isDirty ? "dirty" : undefined}>
                  <td><input className="pf-input" value={r.label} placeholder={r.id ? "" : "Add a table"} aria-label={r.id ? `Label for ${name(r)}` : "New table label"} disabled={!edit} maxLength={20} onChange={(e) => set(r.key, { label: e.target.value })} /></td>
                  <td><input className="pf-input" value={r.area} placeholder="Area" aria-label={`Area for ${name(r)}`} disabled={!edit} onChange={(e) => set(r.key, { area: e.target.value })} /></td>
                  <td>
                    <span className="pf-seats">
                      <input className="pf-input mono" type="number" min={1} max={40} value={r.minCovers} aria-label={`Fewest guests for ${name(r)}`} disabled={!edit} onChange={(e) => set(r.key, { minCovers: Number(e.target.value) })} />
                      <span aria-hidden>–</span>
                      <input className="pf-input mono" type="number" min={1} max={40} value={r.maxCovers} aria-label={`Most guests for ${name(r)}`} disabled={!edit} onChange={(e) => set(r.key, { maxCovers: Number(e.target.value) })} />
                    </span>
                  </td>
                  <td><input type="checkbox" checked={r.online} aria-label={`Bookable online: ${name(r)}`} disabled={!edit} onChange={(e) => set(r.key, { online: e.target.checked })} /></td>
                  <td><input type="checkbox" checked={r.active} aria-label={`In use: ${name(r)}`} disabled={!edit} onChange={(e) => set(r.key, { active: e.target.checked })} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="pf-sub" style={{ padding: "8px 16px 14px", margin: 0 }}>Online off keeps a table for walk-ins and the phone (the bar). In use off takes it out of service. Type in the last row to add a table.</p>
      {edit && (
        <div className={`pf-savebar${dirty ? " on" : ""}`} role="status" aria-live="polite">
          <span>{dirty ? `${changed.length} unsaved change${changed.length === 1 ? "" : "s"}` : "All tables saved"}</span>
          <span style={{ display: "flex", gap: 8 }}>
            {dirty && <button type="button" className="pf-btn small quiet" onClick={reset}>Discard</button>}
            <button className="pf-btn small primary" disabled={!dirty}>Save changes</button>
          </span>
        </div>
      )}
    </form>
  );
}
