"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED = "papp-install-dismissed";

function subscribeDisplay(onChange: () => void) {
  const m = window.matchMedia("(display-mode: standalone)");
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
}

/** Opened from the home screen already: nothing to install. */
export function useInstalled(): boolean {
  return useSyncExternalStore(
    subscribeDisplay,
    () => window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    () => true, // the server renders no prompt; the browser decides
  );
}

/** iPhone and iPad Safari: no install prompt, only Share → Add to Home Screen. */
export function useIos(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    () => false,
  );
}

function readDismissed(): boolean {
  try { return window.localStorage.getItem(DISMISSED) === "1"; } catch { return false; }
}

/**
 * "Install the app": the browser's own prompt where there is one
 * (Android, Chrome, Edge), the Share-sheet steps on iPhone, and nothing
 * once it's on the home screen.
 */
export function InstallPrompt({ name }: { name: string }) {
  const installed = useInstalled();
  const ios = useIos();
  const dismissedStored = useSyncExternalStore(() => () => {}, readDismissed, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const onInstalled = () => { setDone(true); setEvent(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || done || dismissed || dismissedStored || (!event && !ios)) return null;
  const dismiss = () => {
    setDismissed(true);
    try { window.localStorage.setItem(DISMISSED, "1"); } catch { /* private mode: hidden for this visit */ }
  };

  return (
    <aside className="papp-install" aria-label="Install the app">
      <div>
        <b>Get {name} on your home screen</b>
        {ios && !event ? (
          <p>Tap <ShareIcon /> <b>Share</b> at the bottom of Safari, then <b>Add to Home Screen</b>.</p>
        ) : (
          <p>One tap, no app store. It opens like any other app.</p>
        )}
      </div>
      <div className="papp-install-actions">
        {event && (
          <button type="button" className="papp-btn" onClick={async () => {
            await event.prompt();
            const choice = await event.userChoice.catch(() => ({ outcome: "dismissed" as const }));
            setEvent(null);
            if (choice.outcome === "accepted") setDone(true);
          }}>Install the app</button>
        )}
        <button type="button" className="papp-btn ghost" onClick={dismiss}>Not now</button>
      </div>
    </aside>
  );
}

export function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "-3px" }} aria-label="the Share icon" role="img">
      <path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1" />
    </svg>
  );
}
