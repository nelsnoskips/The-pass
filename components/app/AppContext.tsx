"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { parseAppConfig, type AppConfig } from "@/lib/app/config";

/**
 * The app's config for every part of the page. In the builder's preview
 * (a draft, shown only to the restaurant's own signed-in people) the
 * builder posts unsaved edits here and the app redraws as they type.
 */
const Ctx = createContext<AppConfig | null>(null);

export const PREVIEW_MESSAGE = "pass-app-preview";
export const PREVIEW_READY = "pass-app-preview-ready";

export function AppConfigProvider({ initial, preview, children }: { initial: AppConfig; preview: boolean; children: ReactNode }) {
  const [config, setConfig] = useState(initial);
  useEffect(() => {
    if (!preview || window.parent === window) return;
    const onMessage = (e: MessageEvent) => {
      // Only the builder on our own origin, in the frame that holds us.
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const d = e.data as { type?: string; config?: unknown } | null;
      if (!d || d.type !== PREVIEW_MESSAGE) return;
      const p = parseAppConfig(d.config, { adjust: true });
      if (p.ok) setConfig(p.config);
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: PREVIEW_READY }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, [preview]);
  return <Ctx.Provider value={config}>{children}</Ctx.Provider>;
}

export function useAppConfig(): AppConfig {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAppConfig outside AppConfigProvider");
  return c;
}
