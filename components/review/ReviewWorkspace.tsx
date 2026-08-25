"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PIN_STYLES, type Draft, offsetPct, selectorFor, shortText } from "./annotate";

type Mode = "browse" | "comment" | "edit";

const MODE_COPY: Record<Mode, { label: string; hint: string }> = {
  browse: { label: "Browse", hint: "Click through the site as a visitor would." },
  comment: { label: "Comment", hint: "Click anything on the page to pin a note to it." },
  edit: { label: "Suggest an edit", hint: "Click any text to rewrite it in place." },
};

/**
 * The review workspace: the mock in a frame, an annotation layer over
 * it, and a list of what the client has said so far.
 *
 * The three modes exist because the client is doing three different
 * things and a single click cannot mean all of them. Browsing has to
 * stay possible — half the feedback on a website is about how it moves
 * between pages — so arming an annotation mode is deliberate and
 * visible, and browse is the default.
 */
export function ReviewWorkspace({
  token,
  projectName,
  clientName,
  mockPath,
  round,
  alreadySubmitted,
}: {
  token: string;
  projectName: string;
  clientName: string;
  mockPath: string;
  round: number;
  alreadySubmitted: boolean;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [mode, setMode] = useState<Mode>("browse");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pagePath, setPagePath] = useState(mockPath);
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    alreadySubmitted ? "sent" : "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  // Mode has to be readable from listeners bound once to the iframe
  // document, which close over their first value.
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const docOf = () => {
    try {
      return frameRef.current?.contentDocument ?? null;
    } catch {
      return null;
    }
  };

  /* -------------------------------------------------- pin rendering -- */

  const paintPins = useCallback(() => {
    const doc = docOf();
    if (!doc?.body) return;

    doc.querySelectorAll(".pass-a-pin").forEach((n) => n.remove());
    const path = doc.location.pathname;

    drafts
      .filter((d) => d.pagePath === path)
      .forEach((d, i) => {
        let target: Element | null = null;
        try { target = doc.querySelector(d.selector); } catch { target = null; }
        if (!target) return;

        const r = target.getBoundingClientRect();
        const pin = doc.createElement("div");
        pin.className = "pass-a-pin";
        pin.dataset.kind = d.kind;
        pin.dataset.id = d.id;
        if (d.id === activeId) pin.dataset.active = "1";
        pin.innerHTML = `<span>${i + 1}</span>`;
        pin.style.left = `${r.left + doc.documentElement.scrollLeft + (r.width * d.xPct) / 100}px`;
        pin.style.top = `${r.top + doc.documentElement.scrollTop + (r.height * d.yPct) / 100}px`;
        pin.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setActiveId(d.id);
        });
        doc.body.appendChild(pin);
      });
  }, [drafts, activeId]);

  // Painting is cheap and depends on the drafts; wiring is not and must
  // not. Keeping the painter behind a ref is what lets the listener
  // effect below run exactly once per frame load instead of once per
  // draft — attaching a second set of handlers made a single click
  // record the same note two, then three, then four times.
  const paintRef = useRef(paintPins);
  useEffect(() => {
    paintRef.current = paintPins;
    paintPins();
  }, [paintPins]);

  /* ------------------------------------------------ frame wiring ----- */

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let detach: (() => void) | null = null;

    const wire = () => {
      detach?.();
      detach = null;

      let doc: Document | null = null;
      try { doc = frame.contentDocument; } catch { doc = null; }
      if (!doc) {
        // Cross-origin. Nothing can be injected, so say so rather than
        // presenting a review tool that silently does nothing.
        setBlocked(true);
        return;
      }
      setBlocked(false);
      setPagePath(doc.location.pathname);

      if (!doc.getElementById("pass-a-styles")) {
        const style = doc.createElement("style");
        style.id = "pass-a-styles";
        style.textContent = PIN_STYLES;
        doc.head.appendChild(style);
      }
      doc.documentElement.classList.toggle("pass-a-armed", modeRef.current !== "browse");

      let hovered: Element | null = null;

      const onOver = (e: Event) => {
        if (modeRef.current === "browse") return;
        const t = e.target as Element;
        if (!t || t.classList?.contains("pass-a-pin")) return;
        hovered?.classList.remove("pass-a-hover");
        hovered = t;
        hovered.classList.add("pass-a-hover");
      };

      const onOut = () => hovered?.classList.remove("pass-a-hover");

      const onClick = (e: MouseEvent) => {
        const m = modeRef.current;
        if (m === "browse") return;
        const t = e.target as Element;
        if (!t || t.classList?.contains("pass-a-pin")) return;

        e.preventDefault();
        e.stopPropagation();

        const { xPct, yPct } = offsetPct(t, e.clientX, e.clientY);
        const id = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        const base = {
          id,
          pagePath: doc!.location.pathname,
          selector: selectorFor(t),
          xPct,
          yPct,
          context: shortText(t),
          body: "",
        };

        if (m === "comment") {
          setDrafts((d) => [...d, { ...base, kind: "comment" }]);
          setActiveId(id);
          return;
        }

        // Edit mode: hand the element to the client to retype, and
        // record both sides so the studio sees what it was as well as
        // what they want. Only leaf-ish elements are worth editing —
        // handing over a whole section would let one keystroke wipe
        // the page.
        const el = t as HTMLElement;
        if (el.isContentEditable) return;
        const original = (el.textContent ?? "").trim();
        if (el.children.length > 3 || original.length === 0) return;

        el.classList.add("pass-a-editing");
        el.setAttribute("contenteditable", "true");
        el.focus();

        el.addEventListener(
          "blur",
          () => {
            el.removeAttribute("contenteditable");
            el.classList.remove("pass-a-editing");
            const next = (el.textContent ?? "").trim();
            if (next === original) return;
            setDrafts((d) => [
              ...d,
              { ...base, kind: "edit", originalText: original, suggestedText: next },
            ]);
            setActiveId(id);
          },
          { once: true },
        );
      };

      doc.addEventListener("mouseover", onOver, true);
      doc.addEventListener("mouseout", onOut, true);
      doc.addEventListener("click", onClick, true);

      const d = doc;
      detach = () => {
        d.removeEventListener("mouseover", onOver, true);
        d.removeEventListener("mouseout", onOut, true);
        d.removeEventListener("click", onClick, true);
      };

      paintRef.current();
    };

    frame.addEventListener("load", wire);
    // Already loaded when this effect runs after a client navigation.
    if (frame.contentDocument?.readyState === "complete") wire();
    return () => {
      frame.removeEventListener("load", wire);
      detach?.();
    };
  }, []);

  // Arming a mode changes the cursor across the whole mock, so it is
  // obvious the next click will do something other than navigate.
  useEffect(() => {
    let doc: Document | null = null;
    try { doc = frameRef.current?.contentDocument ?? null; } catch { doc = null; }
    doc?.documentElement.classList.toggle("pass-a-armed", mode !== "browse");
  }, [mode]);

  /* ------------------------------------------------------- actions --- */

  const update = (id: string, patch: Partial<Draft>) =>
    setDrafts((d) => d.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const remove = (id: string) => {
    setDrafts((d) => d.filter((x) => x.id !== id));
    setActiveId((a) => (a === id ? null : a));
  };

  async function submit() {
    if (drafts.length === 0) return;
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch(`/api/review/${token}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          author: author.trim() || null,
          comments: drafts.map((d) => ({
            kind: d.kind,
            pagePath: d.pagePath,
            selector: d.selector,
            xPct: d.xPct,
            yPct: d.yPct,
            originalText: d.originalText ?? null,
            suggestedText: d.suggestedText ?? null,
            body: d.body || null,
          })),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Submit failed (${res.status})`);
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  /* --------------------------------------------------------- render -- */

  if (status === "sent") {
    return (
      <div className="rv-done">
        <p className="rv-eyebrow">Round {round}</p>
        <h1>Thank you — that&rsquo;s with us.</h1>
        <p>
          {drafts.length > 0
            ? `${drafts.length} note${drafts.length === 1 ? "" : "s"} on ${projectName} sent through. `
            : `Your notes on ${projectName} are already in. `}
          We&rsquo;ll come back to you with the next round.
        </p>
      </div>
    );
  }

  return (
    <div className="rv-shell">
      <header className="rv-bar">
        <div className="rv-id">
          <span className="rv-eyebrow">{clientName} · Round {round}</span>
          <strong>{projectName}</strong>
        </div>

        <div className="rv-modes" role="group" aria-label="Review mode">
          {(Object.keys(MODE_COPY) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              data-on={mode === m ? "1" : undefined}
            >
              {MODE_COPY[m].label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="rv-submit"
          onClick={submit}
          disabled={drafts.length === 0 || status === "sending"}
        >
          {status === "sending" ? "Sending…" : `Submit ${drafts.length || ""}`.trim()}
        </button>
      </header>

      <p className="rv-hint">{MODE_COPY[mode].hint}</p>

      <div className="rv-body">
        <div className="rv-frame">
          {blocked && (
            <div className="rv-blocked">
              <p>
                This mock is hosted somewhere else, so notes can&rsquo;t be pinned to it
                directly. Send it back to us and we&rsquo;ll host a reviewable copy.
              </p>
            </div>
          )}
          <iframe ref={frameRef} src={mockPath} title={`${projectName} preview`} />
        </div>

        <aside className="rv-side">
          <div className="rv-side-head">
            <span className="rv-eyebrow">Your notes</span>
            <span className="rv-count">{drafts.length}</span>
          </div>

          {drafts.length === 0 && (
            <p className="rv-empty">
              Nothing yet. Pick <strong>Comment</strong> or <strong>Suggest an edit</strong>,
              then click the part of the page you mean.
            </p>
          )}

          <ol className="rv-list">
            {drafts.map((d, i) => (
              <li key={d.id} data-on={d.id === activeId ? "1" : undefined}>
                <div className="rv-list-head">
                  <span className="rv-num" data-kind={d.kind}>{i + 1}</span>
                  <span className="rv-kind">{d.kind === "edit" ? "Edit" : "Comment"}</span>
                  <button type="button" onClick={() => remove(d.id)} aria-label="Remove note">×</button>
                </div>

                <p className="rv-context">{d.context}</p>

                {d.kind === "edit" && (
                  <div className="rv-diff">
                    <p><span>Was</span> {d.originalText}</p>
                    <p><span>Now</span> {d.suggestedText}</p>
                  </div>
                )}

                <textarea
                  value={d.body}
                  onChange={(e) => update(d.id, { body: e.target.value })}
                  onFocus={() => setActiveId(d.id)}
                  placeholder={d.kind === "edit" ? "Anything to add?" : "What should change here?"}
                  rows={2}
                />
              </li>
            ))}
          </ol>

          <label className="rv-author">
            <span>Your name</span>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="So we know who to reply to"
            />
          </label>

          {error && <p className="rv-error">{error}</p>}
          <p className="rv-fine">Page: {pagePath}</p>
        </aside>
      </div>
    </div>
  );
}
