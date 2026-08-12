import type { LucideIcon } from "lucide-react";
import { CircleAlert, Inbox, PlugZap, Unlink } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Distinguishes the four non-data states the blueprint requires:
 * no activity, not connected, not mapped, and sync error.
 */
export type EmptyKind = "no_activity" | "not_connected" | "not_mapped" | "sync_error";

const KIND_META: Record<EmptyKind, { icon: LucideIcon; title: string }> = {
  no_activity: { icon: Inbox, title: "No activity in this period" },
  not_connected: { icon: PlugZap, title: "Not connected" },
  not_mapped: { icon: Unlink, title: "Not mapped" },
  sync_error: { icon: CircleAlert, title: "Sync error" },
};

export function EmptyState({
  kind = "no_activity",
  title,
  body,
  action,
}: {
  kind?: EmptyKind;
  title?: string;
  body: string;
  action?: ReactNode;
}) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span
        className={
          kind === "sync_error"
            ? "rounded-full bg-error-soft p-3 text-error"
            : "rounded-full bg-canvas p-3 text-slate"
        }
      >
        <Icon size={20} strokeWidth={1.8} aria-hidden />
      </span>
      <p className="text-sm font-semibold text-ink">{title ?? meta.title}</p>
      <p className="max-w-sm text-[13px] text-slate">{body}</p>
      {action}
    </div>
  );
}
