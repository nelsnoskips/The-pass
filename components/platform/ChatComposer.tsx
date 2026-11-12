"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { sendMessage } from "@/lib/assistant/actions";

/**
 * The box you talk to The Pass through. Sends, waits while it works,
 * then shows the conversation with any changes it made.
 */
export function ChatComposer({ org, thread, suggestions = [], autoFocus = false, big = false }: {
  org: string; thread: string | null; suggestions?: string[]; autoFocus?: boolean; big?: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const box = useRef<HTMLTextAreaElement>(null);

  const send = (msg: string) => {
    const body = msg.trim();
    if (!body || pending) return;
    setError(null);
    setSent(body);
    setText("");
    start(async () => {
      const r = await sendMessage(org, thread, body);
      if (r.error) { setError(r.error); setText(body); }
      setSent(null);
      if (r.threadId) router.push(`/r/${org}/chat?t=${r.threadId}`);
      router.refresh();
    });
  };

  return (
    <div className={`pf-compose${big ? " big" : ""}`}>
      {sent && (
        <div className="pf-thinking" aria-live="polite">
          <div className="pf-bubble you">{sent}</div>
          <p className="pf-working"><span className="dots" aria-hidden><i /><i /><i /></span> Working on it — reading your data{/(change|set|pause|turn|make|update|raise|lower|mark|add)/i.test(sent) ? " and making the change" : ""}…</p>
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="pf-compose-box">
        <textarea
          ref={box} value={text} autoFocus={autoFocus} rows={big ? 3 : 2} maxLength={2000}
          placeholder="Ask The Pass anything, or tell it what to change…" aria-label="Ask The Pass"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
        />
        <button className="pf-send" disabled={pending || !text.trim()} aria-label="Send">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </button>
      </form>
      {error && <p className="pf-msg err" role="alert" style={{ margin: 0 }}>{error}</p>}
      {suggestions.length > 0 && !pending && (
        <div className="pf-chips">
          {suggestions.map((s) => <button key={s} type="button" className="pf-chip" onClick={() => send(s)}>{s}</button>)}
        </div>
      )}
    </div>
  );
}
