"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { seg: "host", label: "Host stand" },
  { seg: "guests", label: "Guests" },
  { seg: "website", label: "Website" },
  { seg: "agents", label: "Agents" },
  { seg: "messages", label: "Messages" },
  { seg: "settings", label: "Settings" },
];
const SOON: string[] = [];

export function PlatformNav({ org }: { org: string }) {
  const path = usePathname();
  return (
    <nav className="pf-tabs" aria-label="Restaurant">
      {TABS.map((t) => {
        const href = `/r/${org}/${t.seg}`;
        return (
          <Link key={t.seg} href={href} aria-current={path.startsWith(href) ? "page" : undefined}>{t.label}</Link>
        );
      })}
      {SOON.map((s) => <span key={s} className="soon" title="Coming soon">{s}</span>)}
    </nav>
  );
}
