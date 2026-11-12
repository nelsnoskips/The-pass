"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  connectToastAction, disconnectToastAction, importToastMenuAction, syncToastAction, type ToastActionResult,
} from "@/lib/integrations/toast-actions";

type Field = "clientId" | "clientSecret" | "restaurantGuid";

/**
 * Settings → Toast. Not connected: the three fields from Toast Web, kept
 * as typed when Toast says no. Connected: what it's reading, when it
 * last did, and the three things an owner can do with it.
 */
export function ToastConnection({ org, connected, restaurantName, lastSync, problem, available }: {
  org: string;
  connected: boolean;
  restaurantName: string | null;
  /** Already worded in the restaurant's time, e.g. "Today 6:05 PM · 12 checks, 3 matched". */
  lastSync: string | null;
  problem: string | null;
  available: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [values, setValues] = useState<Record<Field, string>>({ clientId: "", clientSecret: "", restaurantGuid: "" });
  const [result, setResult] = useState<ToastActionResult | null>(null);

  const run = (what: string, fn: () => Promise<ToastActionResult>) => {
    setBusy(what);
    start(async () => {
      const r = await fn();
      setResult(r);
      setBusy(null);
      if (!r.error && what === "connect") setValues({ clientId: "", clientSecret: "", restaurantGuid: "" });
      router.refresh();
    });
  };
  const edit = (f: Field) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((v) => ({ ...v, [f]: e.target.value }));
    if (result?.error) setResult(null);
  };
  const inv = (f: Field) => result?.error && result.field === f ? { "aria-invalid": true as const, "aria-describedby": "toast-err" } : {};
  const msg = result && (
    result.error
      ? <p id="toast-err" className="pf-msg err" role="alert">{result.error}</p>
      : result.message
        ? <p className="pf-msg ok" role="status">{result.message}{result.versionId && <> <Link href={`/r/${org}/website`}>Open the Website page</Link></>}</p>
        : null
  );

  if (!available) {
    return <p className="pf-sub" style={{ margin: 0 }}>Connecting Toast isn&rsquo;t switched on yet. The Pass team needs to finish setting up encryption first.</p>;
  }

  if (connected) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <p className="pf-sub" style={{ margin: 0 }}>
          Reading <strong>{restaurantName ?? "your Toast location"}</strong> every hour.{" "}
          {lastSync ? `Last sync: ${lastSync}.` : "Not synced yet."}
        </p>
        {problem && <p className="pf-msg err" role="alert" style={{ margin: 0 }}>{problem}</p>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="pf-btn small primary" disabled={pending} onClick={() => run("sync", () => syncToastAction(org))}>
            {busy === "sync" ? "Syncing…" : "Sync now"}
          </button>
          <button type="button" className="pf-btn small" disabled={pending} onClick={() => run("menu", () => importToastMenuAction(org))}>
            {busy === "menu" ? "Importing…" : "Import menu as a website draft"}
          </button>
          <button type="button" className="pf-btn small quiet" disabled={pending}
            onClick={() => {
              if (!window.confirm("Disconnect Toast? Checks stop matching to guests and 86'd dishes stop mirroring. The credentials are deleted from The Pass; you'd paste them again to reconnect.")) return;
              run("disconnect", () => disconnectToastAction(org));
            }}>
            {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
        {msg}
      </div>
    );
  }

  return (
    <form
      style={{ display: "grid", gap: 10, maxWidth: 560 }}
      onSubmit={(e) => { e.preventDefault(); run("connect", () => connectToastAction(org, values)); }}
    >
      <p className="pf-sub" style={{ margin: 0 }}>
        In Toast Web, go to Integrations → Manage credentials, create credentials for this location, and paste them here.
        They&rsquo;re read-only: The Pass can&rsquo;t change anything in Toast.
      </p>
      <div className="pf-field">
        <label htmlFor="toast-id">Client ID</label>
        <input id="toast-id" className="pf-input" autoComplete="off" spellCheck={false} required value={values.clientId} onChange={edit("clientId")} {...inv("clientId")} />
      </div>
      <div className="pf-field">
        <label htmlFor="toast-secret">Client secret</label>
        <input id="toast-secret" className="pf-input" type="password" autoComplete="off" spellCheck={false} required value={values.clientSecret} onChange={edit("clientSecret")} {...inv("clientSecret")} />
      </div>
      <div className="pf-field">
        <label htmlFor="toast-guid">Location GUID</label>
        <input id="toast-guid" className="pf-input mono" autoComplete="off" spellCheck={false} required placeholder="e.g. 1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
          value={values.restaurantGuid} onChange={edit("restaurantGuid")} {...inv("restaurantGuid")} />
      </div>
      <div><button className="pf-btn small primary" disabled={pending}>{busy === "connect" ? "Checking with Toast…" : "Connect Toast"}</button></div>
      {msg}
    </form>
  );
}
