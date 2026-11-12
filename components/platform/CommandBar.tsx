"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { searchAction } from "@/lib/platform/search-actions";
import type { SearchHit } from "@/lib/platform/search";

const PAGES = [
  ["Home", ""], ["Chat", "chat"], ["Agents", "agents"], ["Website", "website"], ["Host stand", "host"], ["Orders", "orders"],
  ["Gift cards", "gift-cards"], ["Guests", "guests"], ["Reviews", "reviews"], ["Messages", "messages"],
  ["Campaigns", "campaigns"], ["Segments", "segments"], ["Promotions", "promotions"],
  ["Reporting", "reporting"], ["Settings", "settings"], ["Floor plan", "settings/floor"], ["Team", "settings/team"],
  ["Loyalty", "settings/loyalty"], ["Import guests", "settings/import"],
] as const;
const KIND = { guest: "Guest", booking: "Booking", order: "Order", gift_card: "Gift card" } as const;

/**
 * ⌘K: jump to any screen, or find a guest, booking, order or gift card
 * from anywhere. Results come from the server, scoped to this restaurant.
 */
export function CommandBar({ org }: { org: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); input.current?.focus(); setOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const n = ++seq.current;
    const t = setTimeout(() => start(async () => {
      const r = await searchAction(org, term);
      if (n === seq.current) { setHits(r); setActive(0); }
    }), 180);
    return () => clearTimeout(t);
  }, [q, org]);

  const term = q.trim().toLowerCase();
  const pages = PAGES.filter(([l]) => !term || l.toLowerCase().includes(term)).slice(0, term ? 4 : 6)
    .map(([label, seg]) => ({ kind: "page" as const, title: label, detail: "Go to", href: seg ? `/r/${org}/${seg}` : `/r/${org}` }));
  const results = [...(term.length >= 2 ? hits : []), ...pages];
  const go = (href: string) => { setOpen(false); setQ(""); input.current?.blur(); router.push(href); };

  return (
    <div className="pf-cmd" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input
        ref={input} value={q} placeholder="Search guests, bookings, orders…" aria-label="Search" role="combobox"
        aria-expanded={open} aria-controls="pf-cmd-list" autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active].href); }
          else if (e.key === "Escape") { setOpen(false); input.current?.blur(); }
        }}
      />
      <kbd>⌘K</kbd>
      {open && (
        <div className="pf-cmd-list" id="pf-cmd-list" role="listbox">
          {term.length >= 2 && !pending && hits.length === 0 && <p className="pf-cmd-empty">No guests, bookings, orders or gift cards match.</p>}
          {pending && <p className="pf-cmd-empty">Searching…</p>}
          {results.map((r, i) => (
            <button key={`${i}:${r.kind}:${r.title}`} type="button" role="option" aria-selected={i === active}
              className="pf-cmd-item" onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => go(r.href)}>
              <span className="k">{r.kind === "page" ? "Page" : KIND[r.kind]}</span>
              <span className="t">{r.title}</span>
              <span className="d">{r.detail}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
