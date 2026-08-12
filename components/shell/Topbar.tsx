"use client";

import Link from "next/link";
import { Bell, RefreshCw } from "lucide-react";
import { FilterBar } from "./FilterBar";
import { Popover } from "@/components/ui/Popover";
import { formatDateTime } from "@/lib/format";
import type { AppNotification, Location, User } from "@/lib/types";

export function Topbar({
  user,
  locations,
  notifications,
  lastSyncAt,
}: {
  user: User;
  locations: Location[];
  notifications: AppNotification[];
  lastSyncAt: string | null;
}) {
  const unread = notifications.filter((n) => !n.read).length;
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link href="/" className="mr-1 font-display text-xl text-ink lg:hidden">
          The Pass
        </Link>
        <div className="order-last w-full lg:order-none lg:w-auto lg:flex-1">
          <FilterBar locations={locations} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className="hidden items-center gap-1.5 text-xs text-slate md:flex"
            title="Time of the most recent successful data sync"
          >
            <RefreshCw size={13} aria-hidden />
            {lastSyncAt ? `Synced ${formatDateTime(lastSyncAt)}` : "Not synced yet"}
          </span>
          <Popover
            align="end"
            triggerClassName="relative !px-2"
            panelClassName="w-80 max-w-[90vw] p-0"
            trigger={
              <>
                <Bell size={16} aria-hidden />
                <span className="sr-only">Notifications</span>
                {unread > 0 && (
                  <span
                    aria-label={`${unread} unread notifications`}
                    className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cobalt px-1 text-[10px] font-semibold text-white"
                  >
                    {unread}
                  </span>
                )}
              </>
            }
          >
            {(close) => (
              <div>
                <p className="micro-label border-b border-line px-4 py-2.5 text-slate">
                  Notifications
                </p>
                <ul className="max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <li key={n.id} className="border-b border-line last:border-0">
                      <Link
                        href={n.href}
                        onClick={close}
                        className="block px-4 py-3 hover:bg-canvas"
                      >
                        <span className="flex items-start gap-2">
                          {!n.read && (
                            <span
                              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cobalt"
                              aria-hidden
                            />
                          )}
                          <span>
                            <span className="block text-[13px] font-medium text-ink">
                              {n.title}
                            </span>
                            <span className="block text-xs text-slate">{n.body}</span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/settings#notifications"
                  onClick={close}
                  className="block px-4 py-2.5 text-xs font-medium text-cobalt hover:bg-canvas"
                >
                  Notification preferences
                </Link>
              </div>
            )}
          </Popover>
          <Link
            href="/settings"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white"
            title={`${user.name} — account settings`}
          >
            {initials}
          </Link>
        </div>
      </div>
    </header>
  );
}
