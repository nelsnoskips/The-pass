"use client";

import { useEffect, useState } from "react";
import { FOOTER, NAV, ORRAVAN } from "@/lib/site";
import { asset } from "@/lib/images";
import { Plate } from "./ui";

/**
 * The bar: mark left, the four practice menus, the two doors on the
 * right. The quick row underneath is the mock's second rail — one word
 * per practice, always in reach.
 */
export function TopBar() {
  /* Past the hero the main row tightens and the service subnav folds
     away; the header stays sticky the whole way. */
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    let queued = false;
    const read = () => {
      queued = false;
      setCompact(window.scrollY > window.innerHeight * 0.85);
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-[rgba(247,245,239,0.92)] backdrop-blur-sm">
      <div
        className="mx-auto flex max-w-[1280px] items-center gap-6 px-5 transition-[height] duration-300 lg:px-8"
        style={{ height: compact ? 58 : 72 }}
      >
        <a href="#top" aria-label="Orravan home" className="shrink-0">
          <Logo className="h-7" />
        </a>

        <nav className="ml-4 hidden items-center gap-6 lg:flex" aria-label="Main">
          {NAV.menus.map((menu) => (
            <button
              key={menu}
              type="button"
              className="o-label flex items-center gap-1 text-ink-soft transition-colors hover:text-signal"
            >
              {menu}
              <svg viewBox="0 0 8 5" className="w-2.5 opacity-40" aria-hidden>
                <path d="M0 0 L4 5 L8 0" fill="currentColor" />
              </svg>
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <a href="#record" className="o-btn o-btn-ghost hidden sm:inline-flex">
            Service portal
          </a>
          <a href="#close" className="o-btn">
            Request service
          </a>
        </div>
      </div>

      <div
        className="hidden overflow-hidden border-t border-rule/60 transition-[height,opacity] duration-300 lg:block"
        style={{ height: compact ? 0 : 28, opacity: compact ? 0 : 1 }}
      >
        <div className="mx-auto flex h-[28px] max-w-[1280px] items-center justify-center gap-10 px-8">
          {NAV.quick.map((item) => (
            <a
              key={item}
              href="#services"
              className="o-label text-[10px] text-ink-mute transition-colors hover:text-signal"
            >
              {item}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}

/**
 * The mark: the uploaded artwork once it lands, the script wordmark
 * until then — so the site is never waiting on a logo file.
 */
export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  /* Probed rather than raced: an eager <img> can 404 before hydration
     attaches onError, so the mark waits for the probe and never flashes
     a broken image. */
  const [state, setState] = useState<"probing" | "art" | "script">("probing");

  useEffect(() => {
    const probe = new Image();
    probe.onload = () => setState("art");
    probe.onerror = () => setState("script");
    probe.src = asset("/images/15-official-orravan-logo.png");
  }, []);

  if (state === "art") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={asset("/images/15-official-orravan-logo.png")}
        alt="Orravan"
        className={className}
        style={light ? { filter: "invert(1) brightness(1.6)" } : undefined}
      />
    );
  }
  return (
    <span
      className={`o-script text-[26px] leading-none ${light ? "text-bone" : "text-ink"} ${className ?? ""}`}
    >
      <span className="text-signal">O</span>rravan
    </span>
  );
}

export function Footer() {
  return (
    <footer className="o-panel">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 lg:grid-cols-[1.2fr_2fr_1.2fr] lg:px-8">
        <div>
          <Logo className="h-8" light />
          <p className="o-label mt-4 text-[10px] text-bone/50">{ORRAVAN.descriptor}</p>
        </div>

        <FooterColumns />

        <div className="text-sm leading-relaxed text-bone/80 lg:text-right">
          <p className="o-label text-bone">{ORRAVAN.place}</p>
          <p className="mt-2">{ORRAVAN.license}</p>
          <a href={`tel:${ORRAVAN.phone.replace(/\D/g, "")}`} className="mt-1 block hover:text-signal">
            {ORRAVAN.phone}
          </a>
          <a
            href="https://www.linkedin.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Orravan on LinkedIn"
            className="mt-3 inline-flex h-8 w-8 items-center justify-center rounded border border-bone/25 text-bone/80 hover:border-signal hover:text-signal"
          >
            in
          </a>
        </div>
      </div>
      <div className="border-t border-rule-dark">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-5 py-4 lg:px-8">
          <p className="text-xs text-bone/45">© Orravan. All rights reserved.</p>
          <p className="flex gap-5 text-xs text-bone/45">
            <a href="#" className="hover:text-bone">Privacy Policy</a>
            <a href="#" className="hover:text-bone">Terms of Use</a>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumns() {
  return (
    <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
      {FOOTER.columns.map((col) => (
        <div key={col.title}>
          <p className="o-label text-[10px] text-bone/50">{col.title}</p>
          <ul className="mt-3 space-y-1.5">
            {col.links.map((link) => (
              <li key={link}>
                <a href="#" className="text-[13px] text-bone/80 hover:text-signal">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
