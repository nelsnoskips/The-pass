"use client";

import { useState } from "react";

/** A link with a Copy button; falls back to selecting the text where the clipboard is blocked. */
export function CopyLink({ url }: { url: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <div className="pf-copy">
      <input className="pf-input mono" value={url} readOnly aria-label="App link" onFocus={(e) => e.currentTarget.select()} />
      <button type="button" className="pf-btn small" onClick={async () => {
        try { await navigator.clipboard.writeText(url); setState("copied"); }
        catch { setState("failed"); }
        setTimeout(() => setState("idle"), 2500);
      }}>{state === "copied" ? "Copied" : "Copy link"}</button>
      <span className="pf-sr" aria-live="polite">{state === "copied" ? "Link copied" : state === "failed" ? "Couldn't copy. Select the link and copy it." : ""}</span>
    </div>
  );
}
