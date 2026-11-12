"use client";

import { useSyncExternalStore } from "react";

/** A bar across the top while the device has no connection. */
function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function OfflineBar() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div className="pf-offline" role="status" aria-live="polite">
      <span aria-hidden className="pf-offline-dot" />
      Offline — changes won&rsquo;t save until you&rsquo;re back.
    </div>
  );
}
