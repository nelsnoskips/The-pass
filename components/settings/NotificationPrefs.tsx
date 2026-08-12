"use client";

import { useStoredState } from "@/lib/useStoredState";

const CATEGORIES = [
  { key: "sync_failure", label: "Urgent tracking or sync failure", locked: true },
  { key: "opportunity", label: "Opportunity assigned or updated" },
  { key: "campaign_launched", label: "Campaign / promotion launched" },
  { key: "goal_reached", label: "Goal reached" },
  { key: "calendar_approval", label: "Calendar approval needed" },
  { key: "monthly_review", label: "Monthly review available" },
  { key: "strategist_note", label: "Strategist note posted" },
];

/**
 * Notification preferences by category and channel. Routine metric
 * fluctuations are never sent as alerts. Persisted per user in localStorage
 * (a preferences table in production).
 */
export function NotificationPrefs({ userId }: { userId: string }) {
  const defaults = Object.fromEntries(
    CATEGORIES.map((c) => [
      c.key,
      { inApp: true, email: c.key === "sync_failure" || c.key === "monthly_review" },
    ]),
  );
  const [prefs, setPrefs] = useStoredState<
    Record<string, { inApp: boolean; email: boolean }>
  >(`pass-notify-prefs:${userId}`, defaults, (stored) => ({
    ...defaults,
    ...stored,
  }));

  const toggle = (key: string, channel: "inApp" | "email") => {
    setPrefs((prev) => ({
      ...prev,
      [key]: { ...prev[key], [channel]: !prev[key][channel] },
    }));
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[480px] text-[13px]">
        <thead>
          <tr className="border-b border-line bg-canvas/60">
            <th className="px-4 py-2.5 text-left font-medium text-slate">Category</th>
            <th className="px-4 py-2.5 text-center font-medium text-slate">In-app</th>
            <th className="px-4 py-2.5 text-center font-medium text-slate">Email</th>
          </tr>
        </thead>
        <tbody>
          {CATEGORIES.map((cat) => (
            <tr key={cat.key} className="border-b border-line/70 last:border-0">
              <td className="px-4 py-2.5 text-ink">
                {cat.label}
                {cat.locked && (
                  <span className="ml-1.5 text-[11px] text-slate">(always on)</span>
                )}
              </td>
              {(["inApp", "email"] as const).map((channel) => (
                <td key={channel} className="px-4 py-2.5 text-center">
                  <input
                    type="checkbox"
                    aria-label={`${cat.label} — ${channel === "inApp" ? "in-app" : "email"}`}
                    checked={cat.locked && channel === "inApp" ? true : prefs[cat.key][channel]}
                    disabled={cat.locked && channel === "inApp"}
                    onChange={() => toggle(cat.key, channel)}
                    className="h-4 w-4 accent-[var(--cobalt)]"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
