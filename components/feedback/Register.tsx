"use client";

import { useState } from "react";
import { FEEDBACK, RELEASE, SET_LIST, money, orderCount, orderTotal } from "@/lib/feedback";
import { Plate } from "./Plate";
import { useOrder, useSound } from "./state";

/**
 * The register.
 *
 * The concept stops at the door of this page. Whatever the rest of the
 * site is doing with knobs and pedals, ordering is a list, a stepper
 * and a total, in that order, at a size that works one-handed — because
 * this is the only screen where a slow interaction costs the house
 * money. The ticket the guest has been building all the way down the
 * page is already here, because the tray follows them.
 */

const PICKUP = ["As soon as it's up", "In 20 minutes", "In 45 minutes"];

export function Register() {
  const order = useOrder();
  const sound = useSound();
  const [when, setWhen] = useState(PICKUP[0]);
  const [sent, setSent] = useState(false);

  const total = orderTotal(order.lines);
  const count = orderCount(order.lines);

  return (
    <div className="bg-[#0f0b09] px-5 pb-20 pt-28 sm:px-8">
      <div className="mx-auto grid max-w-[1100px] gap-12 lg:grid-cols-[1fr_360px] lg:items-start">
        <div>
          <p className="fbk-label text-[rgba(232,225,211,0.5)]">Pickup</p>
          <h1 className="fbk-display mt-3 text-[clamp(44px,9vw,96px)]">
            Order now.
          </h1>
          <p className="fbk-mono mt-4 text-[13px] text-[rgba(232,225,211,0.7)]">
            {FEEDBACK.address}, {FEEDBACK.city} · {FEEDBACK.hours}
          </p>

          {SET_LIST.map((set) => (
            <section key={set.title} className="mt-12">
              <h2 className="fbk-display border-b border-[rgba(232,225,211,0.18)] pb-2 text-[24px]">
                {set.title}
              </h2>
              <ul className="mt-2 divide-y divide-[rgba(232,225,211,0.1)]">
                {set.items.map((item) => {
                  const qty = order.qty(item.code);
                  return (
                    <li
                      key={item.code}
                      className="flex items-center gap-4 py-4"
                    >
                      <Plate
                        src={item.image}
                        alt=""
                        className="h-14 w-16 shrink-0 overflow-hidden"
                        imgClassName="h-full w-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="fbk-display text-[20px]">{item.name}</p>
                        <p className="mt-0.5 truncate text-[12px] text-[rgba(232,225,211,0.6)]">
                          {item.detail}
                        </p>
                      </div>
                      <p className="fbk-mono w-14 text-right text-[14px]">
                        {money(item.price)}
                      </p>
                      <div className="flex shrink-0 items-center border border-[rgba(232,225,211,0.25)]">
                        <button
                          type="button"
                          className="h-9 w-9 text-[18px] leading-none disabled:opacity-30"
                          onClick={() => {
                            order.remove(item.code);
                            sound.click();
                          }}
                          disabled={qty === 0}
                          aria-label={`Remove one ${item.name}`}
                        >
                          −
                        </button>
                        <span className="fbk-mono w-8 text-center text-[13px]">
                          {qty}
                        </span>
                        <button
                          type="button"
                          className="h-9 w-9 text-[18px] leading-none"
                          onClick={() => {
                            order.add(item.code);
                            sound.click();
                          }}
                          aria-label={`Add one ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        {/* The ticket, following the guest from wherever they built it. */}
        <aside className="fbk-channel fbk-channel-dark sticky top-24 p-6">
          <p className="fbk-label text-[rgba(232,225,211,0.5)]">Your ticket</p>

          {count === 0 ? (
            <p className="mt-4 text-[14px] leading-relaxed text-[rgba(232,225,211,0.65)]">
              Nothing on it yet. Add something from the set list — or turn the
              knob on the front page all the way up and let the burger build
              itself.
            </p>
          ) : (
            <ul className="fbk-mono mt-4 space-y-2 text-[13px]">
              {order.lines.map((line) => {
                const item =
                  SET_LIST.flatMap((s) => s.items).find(
                    (i) => i.code === line.code,
                  ) ??
                  (line.code === RELEASE.code
                    ? { name: RELEASE.title, price: RELEASE.price }
                    : null);
                if (!item) return null;
                return (
                  <li key={line.code} className="flex justify-between gap-3">
                    <span className="truncate">
                      {line.qty} × {item.name}
                    </span>
                    <span>{money(item.price * line.qty)}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="fbk-mono mt-5 flex justify-between border-t border-[rgba(232,225,211,0.18)] pt-3 text-[15px]">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>

          <fieldset className="mt-6">
            <legend className="fbk-label text-[rgba(232,225,211,0.5)]">
              Pickup time
            </legend>
            <div className="mt-2 space-y-1.5">
              {PICKUP.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 text-[13px]"
                >
                  <input
                    type="radio"
                    name="pickup"
                    value={option}
                    checked={when === option}
                    onChange={() => setWhen(option)}
                    className="accent-[#E23B2E]"
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            className="fbk-btn mt-6 w-full"
            disabled={count === 0}
            onClick={() => {
              setSent(true);
              sound.click();
            }}
            style={count === 0 ? { opacity: 0.4, pointerEvents: "none" } : undefined}
          >
            Send to the kitchen
          </button>

          {sent && (
            <p
              role="status"
              className="fbk-mono mt-4 border border-[var(--fb-red)] p-3 text-[12px] leading-relaxed text-[var(--fb-red)]"
            >
              Demo only — this concept room does not take real orders. The
              ticket would print at the pass, {when.toLowerCase()}.
            </p>
          )}

          <p className="fbk-label mt-4 text-[rgba(232,225,211,0.35)]">
            Or call {FEEDBACK.phone}
          </p>
        </aside>
      </div>
    </div>
  );
}
