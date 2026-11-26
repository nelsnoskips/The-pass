"use client";

import { useState } from "react";
import { asset } from "@/lib/images";
import { CONTACT_PAGE } from "@/lib/pages";

/** The "Send message" form from orravan.ai/contact-us, posted as the
    "contact" Netlify form. Confirms only on a 2xx. */
export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setState("sending");
    const data = new FormData(form);
    data.set("page", window.location.href);
    try {
      const res = await fetch(asset("/__forms.html"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(data as unknown as Record<string, string>).toString(),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setState("sent");
    } catch {
      setState("failed");
    }
  };

  if (state === "sent") {
    return (
      <div className="o-quote o-quote-done" role="status">
        <p className="o-display text-[clamp(1.6rem,2.4vw,2.2rem)] leading-none">Message sent.</p>
        <p className="mt-3 text-[14px] text-ink-soft">{CONTACT_PAGE.sent}</p>
      </div>
    );
  }

  return (
    <form className="o-quote" onSubmit={submit} name="contact">
      <input type="hidden" name="form-name" value="contact" />
      <p hidden>
        <label>
          Leave this empty <input name="bot-field" tabIndex={-1} autoComplete="off" />
        </label>
      </p>
      <div className="o-quote-row">
        <label>
          <span>Name *</span>
          <input name="name" required autoComplete="name" />
        </label>
        <label>
          <span>Company</span>
          <input name="company" autoComplete="organization" />
        </label>
      </div>
      <div className="o-quote-row">
        <label>
          <span>Email *</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          <span>Phone</span>
          <input name="phone" type="tel" autoComplete="tel" />
        </label>
      </div>
      <label>
        <span>Message *</span>
        <textarea name="message" required rows={5} />
      </label>
      {state === "failed" && (
        <p className="o-quote-error" role="alert">
          {CONTACT_PAGE.failed}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="o-btn bg-[var(--orravan-blue)]" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send message"}
        </button>
        <span className="text-[12px] text-ink-mute">* Required</span>
      </div>
    </form>
  );
}
