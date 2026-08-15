"use client";

import { useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";

/**
 * Consultation request. Submits to Netlify Forms when deployed on Netlify
 * (paired with the static form in public/__forms.html for build-time
 * detection); falls back to a prefilled email if form handling is
 * unavailable.
 */
export function Consultation() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setState("sending");
    try {
      const res = await fetch("/__forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(data as unknown as Record<string, string>).toString(),
      });
      if (!res.ok) throw new Error(`form endpoint returned ${res.status}`);
      sendGAEvent("event", "generate_lead", { method: "consultation_form" });
      setState("sent");
      form.reset();
    } catch {
      setState("error");
      const subject = encodeURIComponent("Consultation request — The Pass");
      const body = encodeURIComponent(
        `Name: ${data.get("name")}\nRestaurant: ${data.get("restaurant")}\nLocations: ${data.get("locations")}\nEmail: ${data.get("email")}\n\n${data.get("message")}`,
      );
      window.location.href = `mailto:hello@madisonfour.com?subject=${subject}&body=${body}`;
    }
  };

  return (
    <section
      id="consultation"
      className="scroll-mt-24 bg-[#F1EDE5] px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-[1100px] gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <p className="mk-label text-[#4B1719]">Begin</p>
          <h2 className="mt-5 font-editorial text-[38px] leading-[1.06] text-[#0A0A09] sm:text-[48px]">
            Request a private
            <br />
            <em className="italic text-[#4B1719]">consultation.</em>
          </h2>
          <p className="mt-6 max-w-[400px] text-[15px] leading-relaxed text-[#1A1310]/75">
            Tell us about your restaurant and where you want it to go. We&apos;ll
            come to the first conversation having already studied your market,
            your search presence, and your guest journey.
          </p>
          <p className="mk-label mt-10 text-[#1A1310]/50">
            Response within one business day
          </p>
          <p className="mt-4 text-[13.5px] text-[#1A1310]/70">
            Or write directly:{" "}
            <a
              href="mailto:hello@madisonfour.com"
              className="border-b border-[#4B1719]/30 text-[#4B1719] transition-colors hover:border-[#4B1719]"
            >
              hello@madisonfour.com
            </a>
          </p>
        </div>

        {state === "sent" ? (
          <div className="flex flex-col justify-center border border-[#B79A68]/40 bg-white/50 p-10 text-center">
            <p className="font-editorial text-[28px] text-[#0A0A09]">
              Received, with thanks.
            </p>
            <p className="mt-3 text-[14px] text-[#1A1310]/70">
              We&apos;ll be in touch within one business day.
            </p>
          </div>
        ) : (
          <form
            name="consultation"
            onSubmit={onSubmit}
            className="grid gap-5 sm:grid-cols-2"
          >
            <input type="hidden" name="form-name" value="consultation" />
            {[
              { name: "name", label: "Your name", type: "text", span: false },
              { name: "restaurant", label: "Restaurant / group", type: "text", span: false },
              { name: "email", label: "Email", type: "email", span: false },
              { name: "locations", label: "Number of locations", type: "text", span: false },
            ].map((field) => (
              <label key={field.name} className={field.span ? "sm:col-span-2" : ""}>
                <span className="mk-label text-[#1A1310]/60">{field.label}</span>
                <input
                  type={field.type}
                  name={field.name}
                  required={field.name !== "locations"}
                  className="mt-2 w-full border-0 border-b border-[#0A0A09]/25 bg-transparent px-0 py-2.5 text-[15px] text-[#0A0A09] outline-none transition-colors focus:border-[#4B1719]"
                />
              </label>
            ))}
            <label className="sm:col-span-2">
              <span className="mk-label text-[#1A1310]/60">
                What would growth look like for you?
              </span>
              <textarea
                name="message"
                rows={4}
                className="mt-2 w-full border-0 border-b border-[#0A0A09]/25 bg-transparent px-0 py-2.5 text-[15px] text-[#0A0A09] outline-none transition-colors focus:border-[#4B1719]"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={state === "sending"}
                className="mk-label group inline-flex items-center gap-3 bg-[#0A0A09] px-8 py-4 text-[#F1EDE5] transition-colors hover:bg-[#4B1719] disabled:opacity-60"
              >
                {state === "sending" ? "Sending…" : "Request Consultation"}
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </button>
              {state === "error" && (
                <p className="mt-3 text-[13px] text-[#4B1719]">
                  Direct submission wasn&apos;t available — we&apos;ve opened your email
                  client instead.
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
