"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { seg: "", label: "Connections" },
  { seg: "/floor", label: "Floor, hours & rules" },
  { seg: "/loyalty", label: "Loyalty" },
  { seg: "/team", label: "Team" },
  { seg: "/import", label: "Import" },
  { seg: "/morning-pass", label: "Morning pass" },
];

export function SettingsNav({ org, ok, err }: { org: string; ok?: string; err?: string }) {
  const path = usePathname();
  return (
    <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
      <nav className="pf-daynav" aria-label="Settings" style={{ flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const href = `/r/${org}/settings${t.seg}`;
          const active = path === href;
          return <Link key={t.seg} href={href} className={`pf-btn small${active ? " primary" : ""}`} aria-current={active ? "page" : undefined}>{t.label}</Link>;
        })}
      </nav>
      {ok && <p className="pf-msg ok" role="status">{ok}</p>}
      {err && <p className="pf-msg err" role="alert">{err}</p>}
    </div>
  );
}
