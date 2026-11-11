"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bot,
  CalendarCheck,
  CalendarDays,
  FileText,
  Globe,
  Heart,
  LayoutDashboard,
  MapPin,
  Megaphone,
  MessageSquare,
  MousePointerClick,
  Plug,
  SearchCheck,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";

interface NavItem {
  label: string;
  icon: LucideIcon;
  /** Absent = on the roadmap, shown so the shape of the platform is
   *  visible, but not a link. */
  href?: string;
}

/**
 * The platform's shape: what guests see (Storefront), how the room gets
 * filled (Marketing), and what the restaurant knows (Data) — with the
 * agents that run all three kept at the top.
 */
const GROUPS: { heading: string | null; items: NavItem[] }[] = [
  {
    heading: null,
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/agents", label: "Agents", icon: Bot },
    ],
  },
  {
    heading: "Storefront",
    items: [
      { label: "Website", icon: Globe },
      { label: "Reservations", icon: CalendarCheck },
    ],
  },
  {
    heading: "Marketing",
    items: [
      { href: "/campaigns", label: "Ad Campaigns", icon: Megaphone },
      { href: "/keywords", label: "Keywords & Search Terms", icon: SearchCheck },
      { href: "/calendar", label: "Marketing Calendar", icon: CalendarDays },
      { label: "SMS & Email", icon: MessageSquare },
      { label: "Loyalty", icon: Heart },
    ],
  },
  {
    heading: "Data",
    items: [
      { label: "Guests", icon: Users },
      { href: "/conversions", label: "Conversions", icon: MousePointerClick },
      { href: "/locations", label: "Locations", icon: MapPin },
      { href: "/reports", label: "Reports", icon: FileText },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/settings", label: "Settings", icon: Settings2 },
    ],
  },
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
        <Link href={withFilters("/dashboard")} className="block">
          <span className="font-display text-[26px] leading-none text-white">
            The Pass
          </span>
          <span className="micro-label mt-1.5 block text-white/45">
            Restaurant Platform
          </span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {GROUPS.map((group) => (
          <div key={group.heading ?? "top"} className={group.heading ? "mt-4" : undefined}>
            {group.heading && (
              <p className="micro-label px-3 pb-1.5 text-white/35">{group.heading}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
                if (!href) {
                  return (
                    <span
                      key={label}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium text-white/30"
                    >
                      <Icon size={17} strokeWidth={1.8} aria-hidden />
                      <span className="truncate">{label}</span>
                      <span className="ml-auto rounded-full border border-white/15 px-1.5 py-px text-[9.5px] uppercase tracking-wider text-white/40">
                        Soon
                      </span>
                    </span>
                  );
                }
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={withFilters(href)}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
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
            </div>
          </div>
        ))}
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
