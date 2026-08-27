"use client";

import { useState } from "react";

/**
 * Type-to-sign. Typing a name and checking the authorization box is the
 * signature; the server records it and emails both parties a copy. The
 * signature preview renders in a script style so signing feels like
 * signing, but the typed text is what is recorded.
 */
export function SignBlock({ slug }: { slug: string }) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const ready = name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && authorized;

  async function sign() {
    setState("busy");
    setError("");
    try {
      const res = await fetch("/api/agreements/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, title, email, authorized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setState("done");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const input = {
    width: "100%",
    padding: ".65rem .8rem",
    border: "1px solid var(--rule)",
    borderRadius: 6,
    fontSize: 15,
    background: "#fff",
    color: "var(--ink)",
  } as const;

  if (state === "done") {
    return (
      <div style={{ border: "1px solid var(--rule)", borderRadius: 10, padding: "1.6rem", background: "#fff" }}>
        <p style={{ fontFamily: "var(--font-dm-serif), serif", fontSize: 22 }}>Signed. ✓</p>
        <p style={{ marginTop: ".6rem", fontSize: 14.5, color: "var(--ink-soft)", lineHeight: 1.6 }}>
          Thank you, {name}. A copy is on its way to <strong>{email}</strong>, and
          Nelson has been notified — he&rsquo;ll countersign by reply and follow up
          with the deposit invoice.
        </p>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid var(--rule)", borderRadius: 10, padding: "1.6rem", background: "#fff" }}>
      <p style={{ fontWeight: 600, fontSize: 15 }}>Sign for Orravan Mechanical</p>
      <p style={{ marginTop: ".35rem", fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.55 }}>
        Type your name to sign electronically. A copy of this agreement goes to
        your email and to Madison Four.
      </p>

      <div style={{ display: "grid", gap: ".8rem", marginTop: "1.1rem" }}>
        <input style={input} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Full name" />
        <input style={input} placeholder="Title (e.g. Operations Manager)" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
        <input style={input} type="email" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Work email" />
      </div>

      {name.trim() && (
        <div style={{ marginTop: "1rem", borderBottom: "1px solid var(--ink)", paddingBottom: ".3rem" }}>
          <span style={{ fontFamily: "var(--font-instrument), cursive, serif", fontStyle: "italic", fontSize: 26 }}>
            {name}
          </span>
        </div>
      )}

      <label style={{ display: "flex", gap: ".6rem", alignItems: "flex-start", marginTop: "1.1rem", fontSize: 13.5, color: "var(--ink-soft)", lineHeight: 1.5, cursor: "pointer" }}>
        <input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} style={{ marginTop: 3 }} />
        <span>
          I am authorized to sign on behalf of Orravan Mechanical, and by typing
          my name I agree to the terms of this Project Scope &amp; Agreement.
        </span>
      </label>

      <button
        onClick={sign}
        disabled={!ready || state === "busy"}
        className="orv-btn"
        style={{ marginTop: "1.2rem", opacity: ready ? 1 : 0.45, cursor: ready ? "pointer" : "not-allowed" }}
      >
        {state === "busy" ? "Signing…" : "Sign the agreement"}
      </button>

      {state === "error" && (
        <p style={{ marginTop: ".8rem", fontSize: 13.5, color: "#8a2a2a" }}>
          {error} You can also accept by emailing{" "}
          <a href="mailto:nelson.schnebelen@gmail.com" style={{ textDecoration: "underline" }}>Nelson</a> directly.
        </p>
      )}
    </div>
  );
}
