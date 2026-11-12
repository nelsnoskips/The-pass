"use client";

import { useSyncExternalStore } from "react";

/**
 * Calling the restaurant's server from a guest page without ever blanking
 * it: a dropped connection or a server hiccup becomes a sentence next to
 * the button, and whatever the guest typed stays where it is.
 */

export const NETWORK_ERROR = "Couldn’t reach the restaurant — your details are kept, try again.";
export const SERVER_ERROR = "Something went wrong on our side — your details are kept. Please try again, or call us.";

/** Next's redirect() reaches the browser as a thrown error; it is a success. */
export function isRedirect(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

/**
 * Run a server action. Redirects are re-thrown for Next to follow; any
 * other failure comes back as a guest-facing message.
 */
export async function guard<T>(call: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await call() };
  } catch (err) {
    if (isRedirect(err)) throw err;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    const network = offline || err instanceof TypeError || /fetch|network|load failed/i.test(String((err as Error)?.message ?? ""));
    return { ok: false, error: network ? NETWORK_ERROR : SERVER_ERROR };
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** navigator.onLine, kept current. True on the server, so first paint agrees. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}
