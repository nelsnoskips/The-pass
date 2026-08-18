"use client";

import { useEffect, useState } from "react";
import {
  ALL_ITEMS,
  FEEDBACK,
  RELEASE,
  itemByCode,
  money,
  orderCount,
  orderNumber,
  orderTotal,
  type OrderLine,
} from "@/lib/feedback";
import { Wordmark } from "./Wordmark";
import { useEntered } from "./useScrollProgress";
import { useOrder, usePressure } from "./state";

/**
 * The receipt, printed out of the footer.
 *
 * A restaurant site's footer is usually where information goes to die.
 * Here it is the pass window: the thermal printer feeds the visitor's
 * actual order out of a slot in the counter, updating as they add to
 * it, so the tray is visible from anywhere on the page without a
 * floating cart ever covering the food.
 *
 * With nothing in the tray it prints the house's own demo ticket, so
 * the device is legible before anyone has ordered anything.
 */

const DEMO: OrderLine[] = [
  { code: "01", qty: 1 },
  { code: "03", qty: 1 },
];

export function Receipt() {
  const order = useOrder();
  const pressure = usePressure();
  const { ref, entered } = useEntered<HTMLDivElement>(0.2);
  const [stamp, setStamp] = useState<string | null>(null);

  const live = order.lines.length > 0;
  const lines = live ? order.lines : DEMO;
  const total = orderTotal(lines);
  // Stable across renders, derived from the ticket itself rather than
  // from a clock, so the server and the client agree.
  const number = orderNumber(total * 31 + orderCount(lines) * 7 + 482);

  /* The time is the visitor's, so it can only be read after mount. */
  useEffect(() => {
    const tick = () =>
      setStamp(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      );
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div ref={ref} className="relative flex justify-center overflow-hidden pb-16">
      {/* The printer slot the paper comes out of. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-3 bg-[#0b0908] shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
      />

      <div
        // Re-keyed on the ticket so every change re-feeds the paper.
        key={live ? JSON.stringify(order.lines) : "demo"}
        className={`fbk-receipt w-[300px] px-6 py-7 ${
          entered && !pressure.reduced ? "fbk-feed" : ""
        }`}
      >
        <Wordmark distortion={0} className="mx-auto h-5 w-[150px] text-[#14100e]" />

        <p className="fbk-mono mt-4 text-center text-[11px]">
          ORDER NO. <span className="text-[#7E1416]">{number}</span>
        </p>

        <div className="fbk-mono mt-4 flex justify-between border-b border-dashed border-[#14100e]/35 pb-2 text-[10px]">
          <span>{live ? "PICKUP" : "DINE IN"}</span>
          <span>{stamp ?? "—:—"}</span>
        </div>

        <ul className="fbk-mono mt-3 space-y-1.5 text-[11px]">
          {lines.map((line) => {
            const item =
              itemByCode(line.code) ??
              (line.code === RELEASE.code
                ? { name: RELEASE.title, price: RELEASE.price }
                : null);
            if (!item) return null;
            return (
              <li key={line.code} className="flex justify-between gap-3">
                <span className="truncate uppercase">
                  {line.qty} {item.name}
                </span>
                <span>{money(item.price * line.qty)}</span>
              </li>
            );
          })}
        </ul>

        <div className="fbk-mono mt-3 border-t border-dashed border-[#14100e]/35 pt-2 text-[11px]">
          <p className="flex justify-between">
            <span>SUBTOTAL</span>
            <span>{money(total)}</span>
          </p>
          <p className="flex justify-between font-bold">
            <span>TOTAL</span>
            <span>{money(total)}</span>
          </p>
        </div>

        <p className="fbk-mono mt-5 text-center text-[9px] leading-relaxed text-[#14100e]/70">
          {FEEDBACK.address}
          <br />
          {FEEDBACK.phone}
          <br />
          {live ? "READY IN 8—12 MIN" : "TURN IT UP"}
        </p>

        {live && (
          <button
            type="button"
            onClick={order.clear}
            className="fbk-mono mt-4 w-full border border-[#14100e]/30 py-1.5 text-[10px] uppercase tracking-widest text-[#14100e]/70 transition-colors hover:bg-[#14100e] hover:text-[#E8E1D3]"
          >
            Void ticket
          </button>
        )}
      </div>
    </div>
  );
}

/** Everything orderable, for the register page. */
export const ORDERABLE = ALL_ITEMS;
