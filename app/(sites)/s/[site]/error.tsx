"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

/**
 * Something on a restaurant page failed. The restaurant's header and
 * footer stay (this renders inside its layout), the guest gets a plain
 * sentence and a Retry, and nothing typed elsewhere on the site is lost.
 */
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
  }, [error]);
  const retry = () => startTransition(() => { router.refresh(); reset(); });
  return (
    <div className="site-wrap" style={{ maxWidth: 640, padding: "72px 24px 96px" }}>
      <p className="site-eyebrow">Sorry</p>
      <h1 style={{ fontSize: "clamp(30px, 5vw, 42px)", lineHeight: 1.1, marginTop: 12 }}>We couldn&rsquo;t load this page.</h1>
      <p style={{ marginTop: 16, color: "var(--muted)" }}>
        It may be your connection, or a hiccup on our side. Check you&rsquo;re online and try again — or give us a call.
      </p>
      <div className="site-actions" style={{ marginTop: 24 }}>
        <button type="button" className="site-btn" onClick={retry}>Try again</button>
      </div>
    </div>
  );
}
