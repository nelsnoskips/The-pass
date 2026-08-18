"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FEEDBACK, orderCount } from "@/lib/feedback";
import { Waveform } from "./Waveform";
import { Wordmark } from "./Wordmark";
import { useOrder, usePressure, useSound } from "./state";

/**
 * The room's furniture: the bar across the top, the sound switch, and
 * the cut between pages.
 *
 * Ordering is deliberately reachable from every one of these — the nav
 * button, the tray count, and the hero's revealed CTA are three doors
 * to the same register. Nothing about the concept is allowed to put a
 * hungry person more than one tap from it.
 */

const NAV = [
  { href: "/feedback/menu", label: "Menu" },
  { href: "/feedback/order", label: "Order" },
  { href: "/feedback#locations", label: "Locations" },
  { href: "/feedback/merch", label: "Merch" },
];

export function TopBar() {
  const order = useOrder();
  const count = orderCount(order.lines);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[rgba(232,225,211,0.12)] bg-[rgba(11,9,8,0.82)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-8">
        <Link href="/feedback" aria-label="FEEDBACK home" className="min-w-0 shrink">
          <Wordmark
            distortion={0}
            className="h-5 w-[104px] text-[var(--fb-bone)] sm:h-6 sm:w-[132px]"
          />
          <span className="fbk-mono hidden text-[7px] tracking-[0.24em] text-[rgba(232,225,211,0.5)] sm:block">
            {FEEDBACK.descriptor}
          </span>
        </Link>

        {/* The links move to their own row on a phone rather than
            competing with the order button for the same 390px. */}
        <nav className="ml-4 hidden gap-6 md:flex" aria-label="Main">
          {NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="fbk-label whitespace-nowrap text-[rgba(232,225,211,0.85)] transition-colors hover:text-[var(--fb-red)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="fbk-label ml-auto hidden whitespace-nowrap text-[rgba(232,225,211,0.55)] lg:block">
          {FEEDBACK.hoursShort}
        </p>

        <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-4">
          <SoundSwitch />
          <Link
            href="/feedback/order"
            className="fbk-btn whitespace-nowrap px-3 py-2 text-[10px] sm:px-4 sm:text-[11px]"
          >
            Order
            {count > 0 && (
              <span className="fbk-mono ml-1 rounded-full bg-[var(--fb-bone)] px-1.5 text-[10px] text-[#14100e]">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      <nav
        className="flex gap-5 overflow-x-auto border-t border-[rgba(232,225,211,0.1)] px-4 py-2 md:hidden"
        aria-label="Main"
      >
        {NAV.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="fbk-label whitespace-nowrap text-[rgba(232,225,211,0.85)]"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

/**
 * Sound is off until it is asked for. No autoplay, no context created
 * before the click, and the label says which state the switch is in
 * rather than which state it would move to.
 */
export function SoundSwitch() {
  const sound = useSound();

  return (
    <button
      type="button"
      onClick={sound.toggle}
      aria-pressed={sound.on}
      className="fbk-label flex shrink-0 items-center gap-2 border border-[rgba(232,225,211,0.22)] px-2.5 py-1.5 text-[rgba(232,225,211,0.8)] transition-colors hover:border-[rgba(232,225,211,0.5)]"
    >
      <span className={`fbk-led ${sound.on ? "fbk-led-on" : ""}`} aria-hidden />
      <span className="hidden sm:inline">Sound {sound.on ? "on" : "off"}</span>
      <span className="sm:hidden" aria-hidden>
        {sound.on ? "ON" : "OFF"}
      </span>
    </button>
  );
}

/**
 * Between pages the signal collapses to a flat line, the screen cuts to
 * black, and the wave returns as the new page arrives. Around 550ms end
 * to end, which is the most a transition can take before it stops
 * feeling like production and starts feeling like waiting.
 *
 * Skipped entirely under reduced motion, where clicks navigate as
 * clicks always did.
 */
export function PageCut() {
  const pathname = usePathname();
  const router = useRouter();
  const pressure = usePressure();
  const [phase, setPhase] = useState<"idle" | "out" | "in">("idle");

  useEffect(() => {
    if (pressure.reduced) return;

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor || anchor.target === "_blank") return;

      const href = anchor.getAttribute("href");
      if (!href?.startsWith("/feedback")) return;

      // In-page anchors are not page changes; let them scroll.
      const [path] = href.split("#");
      if (path === pathname || path === "") return;

      event.preventDefault();
      setPhase("out");
      window.setTimeout(() => router.push(href), 250);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname, router, pressure.reduced]);

  /* The arriving half fires on every pathname change, including a back
     button, so the cut is symmetric however the visitor got here. */
  useEffect(() => {
    if (pressure.reduced) return;
    // Started on the next tick rather than during the effect: the wave
    // should return over the new page, not over the last frame of the
    // old one.
    const start = window.setTimeout(() => setPhase("in"), 0);
    const end = window.setTimeout(() => setPhase("idle"), 340);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(end);
    };
  }, [pathname, pressure.reduced]);

  if (phase === "idle") return null;

  return (
    <div
      aria-hidden
      className={`fbk-cut ${phase === "out" ? "fbk-cut-out" : "fbk-cut-in"} flex items-center justify-center`}
    >
      <div
        className="h-20 w-[70vw]"
        style={{
          transform: phase === "out" ? "scaleY(0.02)" : "scaleY(1)",
          transition: "transform 230ms cubic-bezier(0.6,0,0.4,1)",
        }}
      >
        <Waveform
          amplitude={0.9}
          cycles={16}
          className="h-full w-full text-[var(--fb-red)]"
          height={80}
          travel={false}
        />
      </div>
    </div>
  );
}
