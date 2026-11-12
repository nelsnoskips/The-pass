"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const key = (slug: string) => `papp-booking:${slug}`;

/**
 * Rewards progress needs the guest's booking link (it was texted to
 * them; that's the proof it's theirs). Opened once with it, this device
 * remembers it, so the Rewards tab shows progress next time too.
 */
export function RememberBooking({ slug, token, valid }: { slug: string; token: string | null; valid: boolean }) {
  const router = useRouter();
  useEffect(() => {
    try {
      if (token && valid) window.localStorage.setItem(key(slug), token);
      else if (token && !valid) window.localStorage.removeItem(key(slug));
      else {
        const saved = window.localStorage.getItem(key(slug));
        if (saved && /^[A-Za-z0-9_-]{8,64}$/.test(saved)) router.replace(`/s/${slug}/app/rewards?b=${encodeURIComponent(saved)}`);
      }
    } catch {
      // Storage blocked: progress shows when opened from the booking link.
    }
  }, [slug, token, valid, router]);
  return null;
}

export function ForgetBooking({ slug }: { slug: string }) {
  const router = useRouter();
  return (
    <button type="button" className="papp-btn ghost" onClick={() => {
      try { window.localStorage.removeItem(key(slug)); } catch { /* nothing stored */ }
      router.replace(`/s/${slug}/app/rewards`);
    }}>Forget on this phone</button>
  );
}
