"use client";

import { useEffect } from "react";
import { sendGAEvent } from "@next/third-parties/google";

const CAL_LINK = "the-pass-team-ht7tto/book";

/**
 * Cal.com inline embed. Keeping the booking flow on madisonfour.com is
 * what lets analytics and ad platforms attribute a booked First Look to
 * the visit that caused it; the old /book redirect handed visitors off
 * before any measurement could see them. Falls back to a plain link if
 * the embed script cannot load.
 */
export function CalEmbed() {
  useEffect(() => {
    // Cal.com's official loader stub: queues calls until embed.js arrives.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const w = window as any;
    (function (C: any, A: string, L: string) {
      const p = function (a: any, ar: any) {
        a.q.push(ar);
      };
      const d = C.document;
      C.Cal =
        C.Cal ||
        function (...args: any[]) {
          const cal = C.Cal;
          if (!cal.loaded) {
            cal.ns = {};
            cal.q = cal.q || [];
            d.head.appendChild(d.createElement("script")).src = A;
            cal.loaded = true;
          }
          if (args[0] === L) {
            const api: any = function (...apiArgs: any[]) {
              p(api, apiArgs);
            };
            const namespace = args[1];
            api.q = api.q || [];
            if (typeof namespace === "string") {
              cal.ns[namespace] = cal.ns[namespace] || api;
              p(cal.ns[namespace], args);
              p(cal, ["initNamespace", namespace]);
            } else p(cal, args);
            return;
          }
          p(cal, args);
        };
    })(w, "https://app.cal.com/embed/embed.js", "init");

    w.Cal("init", "book", { origin: "https://app.cal.com" });
    w.Cal.ns.book("inline", {
      elementOrSelector: "#cal-first-look",
      calLink: CAL_LINK,
      config: { layout: "month_view" },
    });
    w.Cal.ns.book("ui", {
      cssVarsPerTheme: {
        light: { "cal-brand": "#4B1719" },
        dark: { "cal-brand": "#B79A68" },
      },
      hideEventTypeDetails: false,
    });
    // A completed booking is the site's primary conversion.
    w.Cal.ns.book("on", {
      action: "bookingSuccessful",
      callback: () => {
        try {
          sendGAEvent("event", "generate_lead", { method: "first_look_booking" });
        } catch {
          /* analytics unavailable */
        }
      },
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
  }, []);

  return (
    <div>
      <div id="cal-first-look" className="min-h-[640px] w-full" />
      <p className="mt-6 text-center text-[12.5px] text-[#1A1310]/50">
        Calendar not loading?{" "}
        <a
          href={`https://cal.com/${CAL_LINK}`}
          className="text-[#4B1719] underline underline-offset-2"
        >
          Open the booking page directly
        </a>{" "}
        or email{" "}
        <a
          href="mailto:hello@madisonfour.com"
          className="text-[#4B1719] underline underline-offset-2"
        >
          hello@madisonfour.com
        </a>
        .
      </p>
    </div>
  );
}
