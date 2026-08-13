"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  MapPin,
  Megaphone,
  MoreHorizontal,
  MousePointerClick,
  Plug,
  SearchCheck,
  Settings2,
  X,
} from "lucide-react";
import clsx from "clsx";

const PRIMARY = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/conversions", label: "Conversions", icon: MousePointerClick },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
];

const MORE = [
  { href: "/keywords", label: "Keywords & Search Terms", icon: SearchCheck },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function MobileNav() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [moreOpen, setMoreOpen] = useState(false);
  const withFilters = (href: string) => (search ? `${href}?${search}` : href);

  return (
    <>
      {moreOpen && (
        <div
          className="no-print fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={() => setMoreOpen(false)}
          aria-hidden
        />
      )}
      {moreOpen && (
        <div
          role="dialog"
          aria-label="More destinations"
          className="no-print fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-line bg-surface p-4 pb-24 lg:hidden"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="micro-label text-slate">More</p>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              aria-label="Close menu"
              className="rounded-full p-2 text-slate hover:bg-canvas"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
          <ul className="space-y-1">
            {MORE.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={withFilters(href)}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-ink hover:bg-canvas"
                >
                  <Icon size={18} strokeWidth={1.8} aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <nav
        aria-label="Mobile navigation"
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="flex">
          {PRIMARY.map(({ href, label, icon: Icon }) => {
            const active =
              pathname.startsWith(href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={withFilters(href)}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium",
                    active ? "text-cobalt" : "text-slate",
                  )}
                >
                  <Icon size={19} strokeWidth={1.8} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium text-slate"
            >
              <MoreHorizontal size={19} strokeWidth={1.8} aria-hidden />
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
