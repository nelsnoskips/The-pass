"use client";

import clsx from "clsx";
import { useStoredState } from "@/lib/useStoredState";

const OUTCOMES = [
  "Reservations",
  "Online orders",
  "Phone calls",
  "Private dining leads",
  "Store visits",
];

/** The client's primary business outcomes; steers the Return Hero framing. */
export function OutcomePicker({ userId }: { userId: string }) {
  const [selected, setSelected] = useStoredState<string[]>(
    `pass-outcomes:${userId}`,
    ["Reservations"],
  );

  const toggle = (outcome: string) => {
    setSelected((prev) =>
      prev.includes(outcome)
        ? prev.filter((o) => o !== outcome)
        : [...prev, outcome],
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {OUTCOMES.map((outcome) => {
        const active = selected.includes(outcome);
        return (
          <button
            key={outcome}
            type="button"
            onClick={() => toggle(outcome)}
            aria-pressed={active}
            className={clsx(
              "rounded-full border px-4 py-2 text-[13px] font-medium transition-colors",
              active
                ? "border-cobalt bg-cobalt text-white"
                : "border-line bg-surface text-ink hover:border-slate/40",
            )}
          >
            {outcome}
          </button>
        );
      })}
    </div>
  );
}
