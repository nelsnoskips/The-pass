"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOnline } from "./net";

export interface SiteLink { href: string; label: string; external?: boolean }

/**
 * The phone-width menu: the header's links don't fit under 760px, so a
 * button opens them as a panel. Closes on a link, on Escape and on
 * navigation; focus goes back to the button.
 */
export function SiteMenu({ links }: { links: SiteLink[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) { setLastPath(path); setOpen(false); }

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); button.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="site-menu-mobile">
      <button ref={button} type="button" className="site-menu-button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden className="bars" />
        {open ? "Close" : "Menu"}
      </button>
      <div id={id} ref={panel} className="site-menu-panel" hidden={!open}>
        <nav aria-label="Site menu">
          <ul>
            {links.map((l) => (
              <li key={l.href}>
                {l.external
                  ? <a href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
                  : <Link href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

/** A quiet bar when the device drops offline. Nothing typed is lost. */
export function OfflineNotice() {
  const online = useOnline();
  if (online) return null;
  return (
    <p className="site-offline" role="status">
      You&rsquo;re offline. Anything you&rsquo;ve typed stays here — send it once you&rsquo;re back online.
    </p>
  );
}
