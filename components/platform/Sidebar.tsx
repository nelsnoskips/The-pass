"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The restaurant's navigation, grouped by the part of the business it
 * runs. The Dining room group is ours alone: reservations and the host
 * stand sit beside ordering, not in another product.
 */
const GROUPS: { name: string | null; items: { seg: string; label: string; icon: string }[] }[] = [
  { name: null, items: [
    { seg: "", label: "Home", icon: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
    { seg: "chat", label: "Chat", icon: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5" },
    { seg: "agents", label: "Agents", icon: "M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" },
    { seg: "website", label: "Website", icon: "M3 5h18v14H3zM3 9h18M7 7h.01M10 7h.01" },
  ] },
  { name: "Dining room", items: [
    { seg: "host", label: "Host stand", icon: "M4 19h16M6 19V9l6-4 6 4v10M10 19v-5h4v5" },
  ] },
  { name: "Ecommerce", items: [
    { seg: "orders", label: "Orders", icon: "M6 7h12l-1 13H7zM9 7a3 3 0 0 1 6 0" },
    { seg: "gift-cards", label: "Gift cards", icon: "M3 8h18v4H3zM5 12v8h14v-8M12 8v12M12 8c-1.5-3-5-3-5 0M12 8c1.5-3 5-3 5 0" },
    { seg: "financials", label: "Financials", icon: "M4 20h16M6 16V10M10 16V10M14 16V10M18 16V10M3 8l9-5 9 5z" },
  ] },
  { name: "Guests", items: [
    { seg: "guests", label: "Guests", icon: "M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 19v-1a3 3 0 0 0-2-2.8M17 5.2a3 3 0 0 1 0 5.6" },
    { seg: "reviews", label: "Reviews", icon: "M12 4l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4L4.2 9.7l5.4-.8z" },
  ] },
  { name: "Marketing", items: [
    { seg: "campaigns", label: "Campaigns", icon: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a3 3 0 0 1 0 6M18 6a7 7 0 0 1 0 12" },
    { seg: "segments", label: "Segments", icon: "M12 3a9 9 0 1 0 9 9h-9zM15 3.5A9 9 0 0 1 20.5 9H15z" },
    { seg: "promotions", label: "Promotions", icon: "M3 12V4h8l10 10-8 8zM7.5 7.5h.01" },
    { seg: "messages", label: "Messages", icon: "M4 5h16v11H8l-4 4z" },
    { seg: "reporting", label: "Reporting", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  ] },
];

export function Sidebar({ org }: { org: string }) {
  const path = usePathname();
  const item = (seg: string, label: string, icon: string) => {
    const href = seg ? `/r/${org}/${seg}` : `/r/${org}`;
    const active = seg ? path.startsWith(href) : path === href;
    return (
      <Link key={seg || "home"} href={href} aria-current={active ? "page" : undefined} className="pf-side-link">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={icon} /></svg>
        <span>{label}</span>
      </Link>
    );
  };
  return (
    <nav className="pf-side" aria-label="Restaurant">
      <div className="pf-side-groups">
        {GROUPS.map((g, i) => (
          <div key={g.name ?? i} className="pf-side-group">
            {g.name && <p className="pf-side-h">{g.name}</p>}
            {g.items.map((t) => item(t.seg, t.label, t.icon))}
          </div>
        ))}
      </div>
      <div className="pf-side-group pf-side-foot">
        {item("settings", "Settings", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z")}
      </div>
    </nav>
  );
}
