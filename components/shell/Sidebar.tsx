"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  MapPin,
  Megaphone,
  MousePointerClick,
  Plug,
  SearchCheck,
  Settings2,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/keywords", label: "Keywords & Search Terms", icon: SearchCheck },
  { href: "/conversions", label: "Conversions", icon: MousePointerClick },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/calendar", label: "Marketing Calendar", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function Sidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const withFilters = (href: string) => (search ? `${href}?${search}` : href);

  return (
    <aside
      className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-ink text-white lg:flex"
      aria-label="Primary navigation"
    >
      <div className="px-6 pb-6 pt-7">
        <Link href={withFilters("/")} className="block">
          <span className="font-display text-[26px] leading-none text-white">
            The Pass
          </span>
          <span className="micro-label mt-1.5 block text-white/45">
            Marketing Intelligence
          </span>
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={withFilters(href)}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-cobalt text-white"
                  : "text-white/65 hover:bg-white/8 hover:text-white",
              )}
            >
              <Icon size={17} strokeWidth={1.8} aria-hidden />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-5 py-4">
        <p className="micro-label text-champagne">Managed by</p>
        <p className="mt-1 text-sm font-medium text-white">Alexis Romero</p>
        <p className="text-xs text-white/50">Senior Marketing Strategist</p>
      </div>
      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-sm font-medium text-white">{userName}</p>
        <p className="text-xs capitalize text-white/50">
          {userRole.replace("_", " ")}
        </p>
      </div>
    </aside>
  );
}
