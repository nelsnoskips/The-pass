"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { seg: "", label: "Overview" },
  { seg: "host", label: "Host stand" },
  { seg: "guests", label: "Guests" },
  { seg: "website", label: "Website" },
  { seg: "agents", label: "Agents" },
  { seg: "reporting", label: "Reporting" },
  { seg: "messages", label: "Messages" },
  { seg: "reviews", label: "Reviews" },
  { seg: "gift-cards", label: "Gift cards" },
  { seg: "settings", label: "Settings" },
];
const SOON: string[] = [];

export function PlatformNav({ org }: { org: string }) {
  const path = usePathname();
  return (
    <nav className="pf-tabs" aria-label="Restaurant">
      {TABS.map((t) => {
        const href = t.seg ? `/r/${org}/${t.seg}` : `/r/${org}`;
        const active = t.seg ? path.startsWith(href) : path === href;
        return (
          <Link key={t.seg || "overview"} href={href} aria-current={active ? "page" : undefined}>{t.label}</Link>
        );
      })}
      {SOON.map((s) => <span key={s} className="soon" title="Coming soon">{s}</span>)}
    </nav>
  );
}
