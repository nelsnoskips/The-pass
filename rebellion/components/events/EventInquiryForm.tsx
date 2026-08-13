"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Private-event inquiry (blueprint §08 field list).
 *
 * Required fields first, qualification second, so a phone submit is short and
 * the sales team still gets date, headcount, occasion and budget. Nothing is
 * posted yet — the CRM pipeline, owner notification, source/campaign capture
 * and same-business-day SLA task are the §08 automation to wire next.
 */

const field =
  "w-full border border-ink/20 bg-paper px-4 py-3 text-sm placeholder:text-ink-mute/60 " +
  "focus:border-oxblood focus:outline-none";

const labelCls = "micro mb-2 block text-ink-mute";

export function EventInquiryForm() {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div role="status" className="border border-oxblood/30 bg-paper p-8">
        <h3 className="display text-2xl">Request received</h3>
        <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-ink-mute">
          Someone from the events team will reply by the end of the next
          business day with availability, formats and pricing. If your date is
          tight, call us and say so.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="grid gap-5 sm:grid-cols-2"
      noValidate={false}
    >
      <div className="sm:col-span-2">
        <p className="micro text-oxblood">Step 01 · Who you are</p>
      </div>

      <div>
        <label className={labelCls} htmlFor="name">
          Name *
        </label>
        <input id="name" name="name" required autoComplete="name" className={field} />
      </div>
      <div>
        <label className={labelCls} htmlFor="email">
          Email *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={field}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="phone">
          Phone *
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          className={field}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="contact-pref">
          Preferred contact
        </label>
        <select id="contact-pref" name="contactPreference" className={field}>
          <option>Email</option>
          <option>Phone</option>
          <option>Text</option>
        </select>
      </div>

      <div className="mt-4 sm:col-span-2">
        <p className="micro text-oxblood">Step 02 · The event</p>
      </div>

      <div>
        <label className={labelCls} htmlFor="date">
          Preferred date *
        </label>
        <input id="date" name="date" type="date" required className={field} />
      </div>
      <div>
        <label className={labelCls} htmlFor="flexible">
          Date flexibility
        </label>
        <select id="flexible" name="flexible" className={field}>
          <option>Fixed date</option>
          <option>Flexible by a few days</option>
          <option>Flexible by a few weeks</option>
        </select>
      </div>
      <div>
        <label className={labelCls} htmlFor="guests">
          Guest count *
        </label>
        <input
          id="guests"
          name="guests"
          type="number"
          min={1}
          required
          className={field}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="format">
          Format
        </label>
        <select id="format" name="format" className={field}>
          <option>Seated</option>
          <option>Standing</option>
          <option>Mixed</option>
          <option>Not sure yet</option>
        </select>
      </div>
      <div>
        <label className={labelCls} htmlFor="occasion">
          Occasion *
        </label>
        <input
          id="occasion"
          name="occasion"
          required
          placeholder="Rehearsal dinner, birthday, off-site…"
          className={field}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="budget">
          Estimated investment
        </label>
        <select id="budget" name="budget" className={field}>
          <option>Not sure yet</option>
          <option>Under $2,500</option>
          <option>$2,500 – $5,000</option>
          <option>$5,000 – $10,000</option>
          <option>$10,000+</option>
        </select>
      </div>

      <div className="sm:col-span-2">
        <label className={labelCls} htmlFor="notes">
          Food &amp; beverage preferences, AV, accessibility, anything else
        </label>
        <textarea id="notes" name="notes" rows={4} className={cn(field, "resize-y")} />
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          className="micro w-full bg-oxblood px-8 py-4 text-bone transition-colors duration-[var(--dur-micro)] hover:bg-[#8d343d] sm:w-auto"
        >
          Send inquiry
        </button>
        <p className="mt-4 text-xs text-ink-mute">
          We reply by the end of the next business day. * required.
        </p>
      </div>
    </form>
  );
}
