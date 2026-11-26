"use client";

import { useEffect, useRef, useState } from "react";
import { ASSIST, SCRIPT, type Chip, type Field, type Node } from "@/lib/assist";
import { asset } from "@/lib/images";

/**
 * Orravan Assist — the guided service desk.
 *
 * A small launcher bottom-right; a panel that walks a scripted
 * conversation. There is no model behind it. When the visitor reaches
 * the end of a request, what they told us is posted as a Netlify form
 * submission ("assist-request" or "assist-emergency"), and the host's
 * form notifications email it to the right person. The forms are
 * declared in public/__forms.html so the host can see them at deploy.
 *
 * If the submission fails, the desk says so and gives the phone number
 * rather than claiming a request it never delivered.
 */

const FAILED: Node = {
  id: "failed",
  bot: [ASSIST.failed],
  chips: [{ label: "Back to the start", to: "root" }],
};

type Msg =
  | { id: number; from: "bot"; text: string }
  | { id: number; from: "you"; text: string };

let seq = 0;
const next = () => ++seq;

export function Assist() {
  const [open, setOpen] = useState(false);
  const [node, setNode] = useState<Node>(SCRIPT.root);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [still, setStill] = useState(false);

  const log = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const started = useRef(false);
  const timers = useRef<number[]>([]);
  /** What the visitor has told us, filed by field, and the whole exchange. */
  const answers = useRef<Partial<Record<Field, string>>>({});
  const transcript = useRef<string[]>([]);

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setStill(q.matches);
    apply();
    q.addEventListener("change", apply);
    return () => q.removeEventListener("change", apply);
  }, []);

  /* Play a node: its bubbles arrive one at a time behind a typing
     indicator, then its chips or input become available. Under reduced
     motion everything lands at once. */
  const play = (n: Node) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setNode(n);
    setReady(false);
    transcript.current.push(...n.bot.map((t) => `Orravan: ${t}`));

    if (still) {
      setMsgs((m) => [...m, ...n.bot.map((text) => ({ id: next(), from: "bot" as const, text }))]);
      setReady(true);
      return;
    }

    let at = 0;
    n.bot.forEach((text, i) => {
      // Longer bubbles take longer to "type"; the first one comes quick.
      const pause = i === 0 ? 420 : 520 + Math.min(900, text.length * 9);
      at += pause;
      timers.current.push(
        window.setTimeout(() => setTyping(true), at - pause + 120),
        window.setTimeout(() => {
          setTyping(false);
          setMsgs((m) => [...m, { id: next(), from: "bot", text }]);
        }, at),
      );
    });
    timers.current.push(window.setTimeout(() => setReady(true), at + 140));
  };

  useEffect(() => {
    if (open && !started.current) {
      started.current = true;
      play(SCRIPT.root);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Keep the newest message in view, and put the cursor in the field
  // the moment the script asks for something typed.
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: still ? "auto" : "smooth" });
  }, [msgs, typing, still]);
  useEffect(() => {
    if (ready && node.input) field.current?.focus();
  }, [ready, node]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const say = (text: string) => {
    transcript.current.push(`Visitor: ${text}`);
    setMsgs((m) => [...m, { id: next(), from: "you", text }]);
  };

  /** Post what we have to the host's form handler. True only on a 2xx. */
  const deliver = async (kind: "request" | "emergency") => {
    const a = answers.current;
    const body = new URLSearchParams({
      "form-name": kind === "emergency" ? "assist-emergency" : "assist-request",
      details: a.details ?? "",
      phone: a.phone ?? "",
      message: a.message ?? "",
      contact: a.contact ?? "",
      conversation: transcript.current.join("\n"),
      page: window.location.href,
    });
    try {
      const res = await fetch(asset("/__forms.html"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  /* Move to a node. A node that sends waits for the submission first,
     behind the typing indicator, and only confirms if it went through. */
  const go = async (to: string) => {
    const n = SCRIPT[to];
    if (!n.send) return play(n);
    setReady(false);
    setTyping(true);
    const ok = await deliver(n.send);
    setTyping(false);
    if (ok) {
      answers.current = {};
      transcript.current = [];
    }
    play(ok ? n : FAILED);
  };

  const pick = (c: Chip) => {
    if (!ready || !c.to) return;
    say(c.label);
    if (c.to === "root") {
      answers.current = {};
      transcript.current = [];
    }
    void go(c.to);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !ready || !node.input) return;
    say(text);
    setDraft("");
    answers.current[node.input.field] = text;
    void go(node.input.to);
  };

  return (
    <div className="o-ai" data-open={open || undefined}>
      {open && (
        <section
          className="o-ai-panel"
          role="dialog"
          aria-label={ASSIST.name}
          aria-live="off"
        >
          <header className="o-ai-head">
            <span className="o-ai-dot" aria-hidden />
            <span className="o-ai-who">
              <strong>{ASSIST.name}</strong>
              <span className="o-label o-ai-status">{ASSIST.status}</span>
            </span>
            <button
              type="button"
              className="o-ai-close"
              onClick={() => {
                setOpen(false);
                launcher.current?.focus();
              }}
              aria-label="Close chat"
            >
              &times;
            </button>
          </header>

          <div ref={log} className="o-ai-log" aria-live="polite" aria-relevant="additions">
            {msgs.map((m) => (
              <p key={m.id} className="o-ai-msg" data-from={m.from}>
                {m.text}
              </p>
            ))}
            {typing && (
              <p className="o-ai-msg o-ai-typing" data-from="bot" aria-label="Typing">
                <span /><span /><span />
              </p>
            )}
          </div>

          <div className="o-ai-foot">
            {ready && node.chips && (
              <div className="o-ai-chips">
                {node.chips.map((c) =>
                  c.href?.startsWith("/") ? (
                    <a key={c.label} href={asset(c.href)}>
                      {c.label}
                    </a>
                  ) : c.href ? (
                    <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer">
                      {c.label} &#8599;
                    </a>
                  ) : (
                    <button key={c.label} type="button" onClick={() => pick(c)}>
                      {c.label}
                    </button>
                  ),
                )}
              </div>
            )}
            {node.input && (
              <form className="o-ai-form" onSubmit={submit}>
                <input
                  ref={field}
                  type={node.input.kind === "tel" ? "tel" : "text"}
                  inputMode={node.input.kind === "tel" ? "tel" : "text"}
                  autoComplete="off"
                  placeholder={node.input.placeholder}
                  value={draft}
                  disabled={!ready}
                  onChange={(e) => setDraft(e.target.value)}
                  aria-label={node.input.placeholder}
                />
                <button type="submit" disabled={!ready || !draft.trim()} aria-label="Send">
                  &rarr;
                </button>
              </form>
            )}
            <p className="o-ai-fine">{ASSIST.privacy}</p>
          </div>
        </section>
      )}

      <button
        ref={launcher}
        type="button"
        className="o-ai-launch"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="orravan-assist"
      >
        <span className="o-ai-launch-dot" aria-hidden />
        <span>{open ? "Close" : ASSIST.launcher}</span>
      </button>
    </div>
  );
}
