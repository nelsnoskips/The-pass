"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/portal", label: "Project" },
  { href: "/portal/rounds", label: "Rounds" },
  { href: "/portal/billing", label: "Billing" },
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Project room" className="flex items-center gap-6 sm:gap-7">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "mk-label relative py-1 transition-colors",
              active
                ? "text-[#0A0A09]"
                : "text-[#1A1310]/55 hover:text-[#0A0A09]",
            )}
          >
            {label}
            <span
              aria-hidden
              className={clsx(
                "absolute inset-x-0 -bottom-0.5 h-px bg-[#4B1719] transition-opacity",
                active ? "opacity-100" : "opacity-0",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
