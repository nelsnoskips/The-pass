"use client";

import Link from "next/link";
import { useEffect, type CSSProperties, type ReactNode } from "react";
import { textOn, type AppFeatures } from "@/lib/app/config";
import { useOnline } from "@/components/sites/net";
import { useAppConfig } from "./AppContext";
import { AppIcon } from "./AppIcon";

export type AppTab = "home" | "rewards" | "more" | "page";

const ICON: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  order: "M6 7h12l-1 13H7zM9 7a3 3 0 0 1 6 0",
  reserve: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5",
  rewards: "M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4L4.2 9.7l5.4-.8z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
};

function Icon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/**
 * The app's frame: its name across the top, the page, and a tab bar at
 * the bottom. Colours come from the app config as CSS variables; text is
 * black or white, whichever reads on them.
 */
export function AppFrame({ base, q, features, tab, preview, children }: {
  base: string;
  /** Kept on links inside the app ("?preview=draft" in the builder's preview). */
  q: string;
  features: AppFeatures;
  tab: AppTab;
  /** The builder's preview: no service worker, a "not live" strip. */
  preview: boolean;
  children: ReactNode;
}) {
  const c = useAppConfig();
  const online = useOnline();
  const vars = {
    "--app-bg": c.background,
    "--app-ink": textOn(c.background),
    "--app-accent": c.accent,
    "--app-on-accent": textOn(c.accent),
  } as CSSProperties;

  useEffect(() => {
    if (preview || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`${base}/app/sw.js`, { scope: `${base}/` }).catch(() => {
      // No offline copy this time; the app still works online.
    });
  }, [base, preview]);

  const tabs = [
    { id: "home", label: "Home", href: `${base}/app${q}`, icon: ICON.home, internal: true },
    ...(features.ordering ? [{ id: "order", label: "Order", href: `${base}/order`, icon: ICON.order, internal: false }] : []),
    { id: "reserve", label: "Reserve", href: `${base}/reserve`, icon: ICON.reserve, internal: false },
    ...(features.loyalty ? [{ id: "rewards", label: "Rewards", href: `${base}/app/rewards${q}`, icon: ICON.rewards, internal: true }] : []),
    { id: "more", label: "More", href: `${base}/app/more${q}`, icon: ICON.more, internal: true },
  ];

  return (
    <div className="papp" style={vars}>
      <a href="#papp-main" className="papp-skip">Skip to content</a>
      {preview && <p className="papp-preview">Preview of your draft · guests don&rsquo;t see this yet</p>}
      <header className="papp-bar">
        <Link href={`${base}/app${q}`} className="papp-brand">
          <AppIcon config={c} size={30} />
          <span>{c.name}</span>
        </Link>
      </header>
      {!online && (
        <p className="papp-offline" role="status">You&rsquo;re offline. The menu and hours you&rsquo;ve opened before still work.</p>
      )}
      <main id="papp-main" className="papp-main" tabIndex={-1}>{children}</main>
      <nav className="papp-tabs" aria-label="App">
        {tabs.map((t) => (
          <Link key={t.id} href={t.href} className="papp-tab" aria-current={tab === t.id ? "page" : undefined} prefetch={t.internal ? undefined : false}>
            <Icon d={t.icon} />
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
