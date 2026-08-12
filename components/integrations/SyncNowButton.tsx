"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function SyncNowButton() {
  const [state, setState] = useState<"idle" | "syncing" | "done">("idle");

  const run = () => {
    setState("syncing");
    // Demo mode: the seeded source is already deterministic and idempotent,
    // so a manual sync simply re-confirms freshness.
    setTimeout(() => {
      setState("done");
      setTimeout(() => setState("idle"), 2500);
    }, 900);
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={state === "syncing"}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink hover:border-slate/40 disabled:opacity-60"
    >
      <RefreshCw size={14} aria-hidden className={state === "syncing" ? "animate-spin" : undefined} />
      {state === "idle" && "Sync now"}
      {state === "syncing" && "Syncing…"}
      {state === "done" && "Up to date (demo)"}
    </button>
  );
}
