"use client";

import { useEffect } from "react";

/** Orravan's GA4 property, set up 19 Oct 2026 with Alex as an admin. */
const GA_ID = "G-VLEL3B4CRH";

/**
 * Google Analytics, on Orravan's own domain only.
 *
 * The same build is reviewed at madisonfour.com/orravan-v3 before
 * launch, and every review visit counted there would land in Orravan's
 * reports as if it were a customer. So the tag loads only when the page
 * is served from orravan.ai (or a subdomain of it), and nothing at all
 * happens anywhere else.
 */
export function Analytics() {
  useEffect(() => {
    const host = window.location.hostname;
    if (host !== "orravan.ai" && !host.endsWith(".orravan.ai")) return;

    const w = window as unknown as { dataLayer: unknown[]; gtag?: (...args: unknown[]) => void };
    w.dataLayer = w.dataLayer || [];
    w.gtag = function gtag() {
      // gtag expects the arguments object itself, not an array copy.
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer.push(arguments);
    };
    w.gtag("js", new Date());
    w.gtag("config", GA_ID);

    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
  }, []);

  return null;
}
