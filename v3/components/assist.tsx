"use client";

import { useEffect, useRef, useState } from "react";
import { ASSIST, KNOWN_ORDER, SCRIPT, type Node } from "@/lib/assist";

/**
 * Orravan Assist — a mock of the chat the client asked for.
 *
 * A small launcher bottom-right; a panel that runs a scripted
 * conversation. There is no model behind it and nothing typed leaves
 * the browser, and the panel says so. The point is to let Orravan feel
 * the experience — a service request taken, an emergency triaged and a
 * technician paged, a work order found — before paying to build it.
 *
 * The one piece of real behaviour: typing a work-order number is
 * actually checked, so the mock does not claim to find an order the
 * page has never heard of.
 */

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

  const say = (text: string) => setMsgs((m) => [...m, { id: next(), from: "you", text }]);

  const pick = (label: string, to: string) => {
    if (!ready) return;
    say(label);
    if (to === "track-open") {
      document.getElementById("record")?.scrollIntoView({ behavior: still ? "auto" : "smooth" });
    }
    play(SCRIPT[to]);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !ready || !node.input) return;
    say(text);
    setDraft("");
    // The one lookup that is real: does the page know this order?
    const to =
      node.input.kind === "order"
        ? KNOWN_ORDER.test(text) ? "track-found" : "track-miss"
        : node.input.to;
    play(SCRIPT[to]);
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
            <span className="o-label o-ai-tag">{ASSIST.tag}</span>
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
                {node.chips.map((c) => (
                  <button key={c.label} type="button" onClick={() => pick(c.label, c.to)}>
                    {c.label}
                  </button>
                ))}
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
