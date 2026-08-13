"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * Email capture. Posts nowhere yet — the ESP/consent wiring is a blueprint §11
 * decision. The optimistic state is deliberately honest about that.
 */
export function NewsletterForm() {
  const [status, setStatus] = useState<"idle" | "done">("idle");
  const [email, setEmail] = useState("");

  if (status === "done") {
    return (
      <p role="status" className="text-sm text-bone">
        Thanks — we&apos;ll be in touch.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setStatus("done");
      }}
      className="flex items-center gap-2 border-b border-bone/30 pb-2"
    >
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        className="w-full bg-transparent text-sm text-bone placeholder:text-bone/40 focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 p-1 text-bone/70 transition-colors duration-[var(--dur-micro)] hover:text-bone"
      >
        <span className="sr-only">Subscribe</span>
        <ArrowRight size={16} aria-hidden />
      </button>
    </form>
  );
}
