"use client";

import { useState } from "react";
import { ORRAVAN, QUOTE } from "@/lib/site";
import { asset } from "@/lib/images";

/**
 * The quote form. It posts to the host as the "request-quote" Netlify
 * form, declared in public/__forms.html beside the assistant's two, and
 * the host's form notification emails it to the office. It confirms only
 * on a 2xx; anything else gets the phone number and email instead.
 */
export function QuoteForm() {
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
        <p className="o-display text-[clamp(1.6rem,2.4vw,2.2rem)] leading-none">Request received.</p>
        <p className="mt-3 text-[14px] text-ink-soft">{QUOTE.sent}</p>
        <a href={asset("/")} className="o-btn mt-6 inline-flex bg-[var(--orravan-blue)]">
          Back to the homepage
        </a>
      </div>
    );
  }

  return (
    <form className="o-quote" onSubmit={submit} name="request-quote">
      <input type="hidden" name="form-name" value="request-quote" />
      <p hidden>
        <label>
          Leave this empty <input name="bot-field" tabIndex={-1} autoComplete="off" />
        </label>
      </p>

      <div className="o-quote-row">
        <label>
          <span>First name *</span>
          <input name="first_name" required autoComplete="given-name" />
        </label>
        <label>
          <span>Last name *</span>
          <input name="last_name" required autoComplete="family-name" />
        </label>
      </div>
      <div className="o-quote-row">
        <label>
          <span>Phone *</span>
          <input name="phone" type="tel" required autoComplete="tel" />
        </label>
        <label>
          <span>Email *</span>
          <input name="email" type="email" required autoComplete="email" />
        </label>
      </div>
      <label>
        <span>Street address</span>
        <input name="street_address" autoComplete="street-address" />
      </label>
      <div className="o-quote-row">
        <label>
          <span>City</span>
          <input name="city" autoComplete="address-level2" />
        </label>
        <label>
          <span>ZIP code</span>
          <input name="postal" inputMode="numeric" autoComplete="postal-code" />
        </label>
      </div>
      <label>
        <span>How can we help? *</span>
        <textarea name="message" required rows={5} />
      </label>

      {state === "failed" && (
        <p className="o-quote-error" role="alert">
          {QUOTE.failed}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="o-btn bg-[var(--orravan-blue)]" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Request quote"}
        </button>
        <span className="text-[12px] text-ink-mute">* Required</span>
      </div>
    </form>
  );
}

/** Who to reach, beside the form. */
export function QuoteContact() {
  return (
    <dl className="o-quote-contact">
      <div>
        <dt className="o-label">Call</dt>
        <dd>
          <a href={`tel:${ORRAVAN.phone.replace(/\D/g, "")}`}>{ORRAVAN.phone}</a>
        </dd>
      </div>
      <div>
        <dt className="o-label">Email</dt>
        <dd>
          <a href={`mailto:${ORRAVAN.email}`}>{ORRAVAN.email}</a>
        </dd>
      </div>
      <div>
        <dt className="o-label">Hours</dt>
        <dd>{ORRAVAN.hours}</dd>
      </div>
      <div>
        <dt className="o-label">Office</dt>
        <dd>
          {ORRAVAN.address.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </dd>
      </div>
      <div>
        <dt className="o-label">License</dt>
        <dd>{ORRAVAN.license}</dd>
      </div>
    </dl>
  );
}
