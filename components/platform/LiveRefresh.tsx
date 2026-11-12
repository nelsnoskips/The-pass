"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Keeps a live screen (the host stand, the kitchen board) current: asks the
 * server for a fresh render every 12 seconds while the tab is visible and
 * online, and at once when the tab comes back into view. When an id shows
 * up in `watch` that wasn't there before, it chimes (unless muted — the
 * choice is remembered on this device) and puts "(2) New orders" in the
 * tab title until someone touches the screen.
 */
const EVERY_MS = 12_000;

export function LiveRefresh({ watch, noun, storageKey }: { watch: string[]; noun: string; storageKey: string }) {
  const router = useRouter();
  const seen = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const [unseen, setUnseen] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    try { setMuted(localStorage.getItem(storageKey) === "1"); } catch { /* storage blocked: chime stays on */ }
  }, [storageKey]);

  // Poll and refresh on return.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && navigator.onLine !== false) router.refresh();
    };
    const timer = setInterval(refresh, EVERY_MS);
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
    };
  }, [router]);

  // Browsers only allow sound after a gesture: unlock on the first touch,
  // and treat any touch as "I've seen the new ones".
  useEffect(() => {
    const touch = () => {
      setUnseen(0);
      if (!audio.current) {
        try {
          const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
          if (Ctx) audio.current = new Ctx();
        } catch { /* no audio */ }
      }
      void audio.current?.resume?.();
    };
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    return () => {
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
    };
  }, []);

  // New arrivals.
  const key = watch.join(",");
  useEffect(() => {
    const ids = new Set(key ? key.split(",") : []);
    if (seen.current === null) { seen.current = ids; return; }
    const fresh = [...ids].filter((id) => !seen.current!.has(id));
    seen.current = ids;
    if (!fresh.length) return;
    setUnseen((n) => n + fresh.length);
    if (!muted) chime(audio.current);
  }, [key, muted]);

  // A refresh can put the page's own title back, so keep re-applying.
  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(/^\(\d+\) New [^·]*· /, "");
      document.title = unseen > 0 ? `(${unseen}) New ${noun}${unseen > 1 ? "s" : ""} · ${base}` : base;
    };
    apply();
    if (!unseen) return;
    const t = setInterval(apply, 2_000);
    return () => {
      clearInterval(t);
      document.title = document.title.replace(/^\(\d+\) New [^·]*· /, "");
    };
  }, [unseen, noun]);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    try { localStorage.setItem(storageKey, next ? "1" : "0"); } catch { /* not remembered */ }
    if (!next) chime(audio.current);
  };

  return (
    <button type="button" className="pf-btn small quiet pf-chime" onClick={toggle} aria-pressed={!muted}
      aria-label={muted ? `Chime for new ${noun}s is off. Turn on` : `Chime for new ${noun}s is on. Mute`}>
      <span aria-hidden>♪</span> {muted ? "Chime off" : "Chime on"}
    </button>
  );
}

function chime(ctx: AudioContext | null) {
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    for (const [i, freq] of [880, 1320].entries()) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, t + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t + i * 0.18);
      osc.stop(t + i * 0.18 + 0.55);
    }
  } catch { /* sound is a nicety */ }
}
