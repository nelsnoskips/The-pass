"use client";

import { useState } from "react";

/* PLACEHOLDER radius — Cocoa Beach and the immediate barrier island. The real
   list comes from the licensed delivery area confirmed in blueprint §10. */
const ELIGIBLE_ZIPS = new Set(["32931", "32920", "32925", "32937", "32903"]);

type Result = null | { ok: boolean; zip: string };

/**
 * Fulfillment gate (blueprint §09): a guest should learn whether we can deliver
 * to them *before* they browse deeply, not at checkout.
 */
export function DeliveryChecker() {
  const [zip, setZip] = useState("");
  const [mode, setMode] = useState<"delivery" | "pickup">("delivery");
  const [result, setResult] = useState<Result>(null);

  return (
    <div className="border border-rule bg-paper p-6 md:p-8">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <fieldset className="flex items-center gap-0">
          <legend className="sr-only">Fulfillment method</legend>
          {(["delivery", "pickup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m);
                setResult(null);
              }}
              className={`micro border px-6 py-3 transition-colors duration-[var(--dur-micro)] ${
                mode === m
                  ? "border-ink bg-ink text-bone"
                  : "border-ink/20 text-ink-mute hover:border-ink"
              }`}
            >
              {m === "delivery" ? "Local delivery" : "Pickup"}
            </button>
          ))}
        </fieldset>

        {mode === "delivery" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setResult({ ok: ELIGIBLE_ZIPS.has(zip.trim()), zip: zip.trim() });
            }}
            className="flex flex-1 flex-wrap items-end gap-3"
          >
            <div className="min-w-[180px] flex-1">
              <label htmlFor="zip" className="micro mb-2 block text-ink-mute">
                Delivery ZIP
              </label>
              <input
                id="zip"
                inputMode="numeric"
                pattern="[0-9]{5}"
                required
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="32931"
                className="w-full border border-ink/20 bg-bone px-4 py-3 text-sm focus:border-oxblood focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="micro bg-oxblood px-7 py-3.5 text-bone transition-colors duration-[var(--dur-micro)] hover:bg-[#8d343d]"
            >
              Check
            </button>
          </form>
        ) : (
          <p className="text-sm text-ink-mute">
            Pickup at the bar during service hours. We&apos;ll hold your order
            for 48 hours.
          </p>
        )}
      </div>

      {result && (
        <p role="status" className="mt-5 text-sm">
          {result.ok ? (
            <>
              <span className="font-semibold text-oxblood">
                Good news — we deliver to {result.zip}.
              </span>{" "}
              <span className="text-ink-mute">
                Minimum, fee and available windows appear at checkout.
              </span>
            </>
          ) : (
            <>
              <span className="font-semibold">
                We can&apos;t deliver to {result.zip} yet.
              </span>{" "}
              <span className="text-ink-mute">
                Pickup at the bar is available to everyone.
              </span>
            </>
          )}
        </p>
      )}
    </div>
  );
}
