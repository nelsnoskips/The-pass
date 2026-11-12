"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

/**
 * A page inside the restaurant's frame failed to load (most often: the
 * connection dropped). The frame — top bar, navigation — stays; this
 * replaces only the page, with a way to try again.
 */
export default function OrgError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  useEffect(() => { console.error(error); }, [error]);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return (
    <section className="pf-panel pf-error" role="alert">
      <h1>{offline ? "You're offline" : "This page didn't load"}</h1>
      <p className="pf-sub">
        {offline
          ? "Nothing you've done has been lost. Reconnect, then try again."
          : "Something went wrong on our side or the connection dropped. Nothing was changed."}
      </p>
      <button className="pf-btn primary" disabled={pending} onClick={() => start(() => { router.refresh(); reset(); })}>
        {pending ? "Trying…" : "Retry"}
      </button>
      {error.digest && <p className="pf-sub mono" style={{ fontSize: 12 }}>Ref {error.digest}</p>}
    </section>
  );
}
