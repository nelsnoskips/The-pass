"use client";

import { useState, useTransition } from "react";
import { runImport } from "@/lib/platform/import-actions";
import type { ImportReport } from "@/lib/platform/importer";

/**
 * Upload, see exactly what will happen, then confirm. The file is read in
 * the browser and checked by the server twice: once as a dry run, once
 * for real.
 */
export function Importer({ org }: { org: string }) {
  const [kind, setKind] = useState<"guests" | "bookings">("guests");
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const go = (dryRun: boolean) => file && start(async () => {
    const r = await runImport(org, kind, file.text, file.name, dryRun);
    setError(r.error);
    setReport(r.report ?? null);
  });

  return (
    <div className="pf-body">
      <div style={{ display: "flex", gap: 6 }}>
        {(["guests", "bookings"] as const).map((k) => (
          <button key={k} type="button" className={`pf-btn small${kind === k ? " primary" : ""}`} onClick={() => { setKind(k); setReport(null); }}>
            {k === "guests" ? "Guest list" : "Upcoming bookings"}
          </button>
        ))}
      </div>
      <p className="pf-sub" style={{ margin: 0 }}>
        {kind === "guests"
          ? "Needs columns for name (or first/last) and phone. Email, visits, last visit, notes and an SMS opt-in column are used if present. Nobody is opted in to texts unless the file says yes for them."
          : "Needs name, date, time and party size. Each booking is placed on a free table; any that can't be are listed for you to seat by hand."}
      </p>
      <input type="file" accept=".csv,text/csv" className="pf-input"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          setReport(null); setError(null);
          setFile(f ? { name: f.name, text: await f.text() } : null);
        }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="pf-btn" disabled={!file || pending} onClick={() => go(true)}>{pending ? "Checking…" : "Check the file"}</button>
        {report?.dryRun && report.missingColumns.length === 0 && (
          <button type="button" className="pf-btn primary" disabled={pending} onClick={() => go(false)}>
            Import {report.created + report.updated} {kind === "guests" ? "guests" : "bookings"}
          </button>
        )}
      </div>
      {error && <p className="pf-msg err" role="alert">{error}</p>}
      {report && (
        <div className={`pf-msg ${report.missingColumns.length ? "err" : "ok"}`} role="status" style={{ display: "grid", gap: 6 }}>
          {report.missingColumns.length ? (
            <span>Couldn&rsquo;t find a column for: {report.missingColumns.join(", ")}.</span>
          ) : (
            <span>
              {report.dryRun ? "Ready to import: " : "Imported: "}
              {report.created} new{kind === "guests" ? `, ${report.updated} already here (merged)` : ""}
              {kind === "guests" ? `, ${report.optedIn} opted in to texts by the file` : ""}
              {report.skipped.length ? `, ${report.skipped.length} skipped` : ""}.
            </span>
          )}
          {report.skipped.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)" }}>
              {report.skipped.slice(0, 12).map((s) => <li key={s.line}>Line {s.line}: {s.reason}</li>)}
              {report.skipped.length > 12 && <li>…and {report.skipped.length - 12} more</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
