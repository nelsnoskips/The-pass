"use client";

import { useEffect, useState } from "react";

function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * "Get updates": push notifications from the restaurant. Until push keys
 * are set up it says so and stores nothing.
 */
export function PushToggle({ slug, vapidKey, preview }: { slug: string; vapidKey: string | null; preview: boolean }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    if (!vapidKey || preview || !("serviceWorker" in navigator)) return;
    let live = true;
    navigator.serviceWorker.getRegistration(`/s/${slug}/`)
      .then((reg) => reg?.pushManager?.getSubscription())
      .then((sub) => { if (live && sub) setOn(true); })
      .catch(() => {});
    return () => { live = false; };
  }, [slug, vapidKey, preview]);

  if (!vapidKey) {
    return (
      <div className="papp-row">
        <span>
          <b id="papp-push-label">Get updates</b>
          <span className="papp-note">Updates are coming soon.</span>
        </span>
        <button type="button" role="switch" aria-checked="false" aria-labelledby="papp-push-label" className="papp-switch" disabled />
      </div>
    );
  }

  const turnOn = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setMsg({ text: "This browser can't get updates. On iPhone, add the app to your Home Screen first, then open it from there.", error: true });
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setMsg({ text: "Notifications are blocked for this app. You can allow them in your phone's settings.", error: true });
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey) });
    const res = await fetch(`/api/app/${slug}/push`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
    if (!res.ok) {
      await sub.unsubscribe().catch(() => {});
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setMsg({ text: body?.error ?? "That didn't work. Please try again.", error: true });
      return;
    }
    setOn(true);
    setMsg({ text: "You're in. We'll only send the good stuff.", error: false });
  };

  const turnOff = async () => {
    const reg = await navigator.serviceWorker.getRegistration(`/s/${slug}/`);
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch(`/api/app/${slug}/push`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setOn(false);
    setMsg({ text: "Updates are off.", error: false });
  };

  return (
    <div className="papp-row">
      <span>
        <b id="papp-push-label">Get updates</b>
        <span className="papp-note">News, specials and events from us. Turn off any time.</span>
        {msg && <span className={`papp-note${msg.error ? " err" : ""}`} role={msg.error ? "alert" : "status"}>{msg.text}</span>}
      </span>
      <button type="button" role="switch" aria-checked={on} aria-labelledby="papp-push-label" className="papp-switch" disabled={busy || preview}
        onClick={async () => {
          setBusy(true);
          setMsg(null);
          try { await (on ? turnOff() : turnOn()); }
          catch { setMsg({ text: navigator.onLine === false ? "You're offline. Try again when you're back." : "That didn't work. Please try again.", error: true }); }
          finally { setBusy(false); }
        }} />
    </div>
  );
}
