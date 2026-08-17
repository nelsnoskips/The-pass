"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { FULFILMENT, HOUSE, currentIssue, issueLabel } from "@/lib/house";

/**
 * The register. Pick items, choose pickup or delivery, leave a name and
 * a phone, and the ticket prints.
 *
 * The rotisserie runs out, so the order page has to say so: once the
 * birds are gone, every rotisserie item is struck through and reads
 * "back tomorrow at 11" rather than quietly disappearing. A deli that
 * tells you the truth at 8pm is the whole brand.
 *
 * No tipping step — this house takes that at the counter.
 */

const OPEN_HOUR = 11;
const CLOSE_HOUR = 21;
const TAX = 0.095;

function birdsLeft(now: Date): number {
  const hours = now.getHours() + now.getMinutes() / 60;
  const through = Math.min(1, Math.max(0, (hours - OPEN_HOUR) / (CLOSE_HOUR - OPEN_HOUR)));
  return Math.max(0, Math.round(HOUSE.birdsAtOpen * (1 - Math.pow(through, 0.72))));
}

type Line = { name: string; price: number; qty: number };

export function OrderFlow() {
  const issue = currentIssue();
  const [mounted, setMounted] = useState(false);
  const [birds, setBirds] = useState<number | null>(null);
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [mode, setMode] = useState<"pickup" | "delivery">("pickup");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    setMounted(true);
    const tick = () => setBirds(birdsLeft(new Date()));
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const soldOut = mounted && birds === 0;

  const add = (name: string, price: string, step: number) =>
    setLines((prev) => {
      const qty = Math.max(0, (prev[name]?.qty ?? 0) + step);
      const next = { ...prev };
      if (qty === 0) delete next[name];
      else next[name] = { name, price: Number(price), qty };
      return next;
    });

  const items = Object.values(lines);
  const subtotal = items.reduce((s, l) => s + l.price * l.qty, 0);
  const fee = mode === "delivery" && subtotal > 0 ? FULFILMENT.fee : 0;
  const tax = (subtotal + fee) * TAX;
  const total = subtotal + fee + tax;
  const ready = useMemo(() => {
    if (!mounted) return "";
    const d = new Date();
    d.setMinutes(d.getMinutes() + (mode === "delivery" ? 40 : 20));
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }, [mounted, mode]);

  const canPlace =
    items.length > 0 &&
    name.trim() !== "" &&
    phone.trim() !== "" &&
    (mode === "pickup" || address.trim() !== "");

  if (placed) {
    return (
      <div className="mx-auto max-w-[420px]">
        <div className="hse-sticker bg-[#F2EDE4] px-7 py-8 text-center">
          <p className="hse-label text-[#E8552A]">Order in</p>
          <p className="hse-display mt-3 text-[36px]">
            {mode === "pickup" ? "Pickup" : "Delivery"} · {ready}
          </p>
          <p className="mt-3 text-[13.5px] text-[#16130F]/70">
            {mode === "pickup"
              ? `Come to the counter and say your name. ${HOUSE.address}`
              : `We will text ${phone} when the bag leaves the shop.`}
          </p>
          <ul className="mt-7 space-y-1.5 border-y border-dashed border-[#16130F]/30 py-5 text-left text-[13px]">
            {items.map((l) => (
              <li key={l.name} className="flex justify-between gap-4">
                <span>
                  {l.qty} × {l.name}
                </span>
                <span className="hse-num">${(l.price * l.qty).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <p className="hse-display mt-4 flex justify-between text-[22px]">
            <span>Total</span>
            <span className="hse-num">${total.toFixed(2)}</span>
          </p>
          <p className="hse-label mt-6 text-[#16130F]/45">
            House Issue · {issueLabel(issue.number)} · Made for the block
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPlaced(false);
            setLines({});
          }}
          className="hse-label mt-6 w-full border-2 border-[#16130F] py-3 transition-colors hover:bg-[#16130F] hover:text-[#F2EDE4]"
        >
          Start another order
        </button>
        <p className="mt-4 text-center text-[12px] text-[#16130F]/55">
          A concept room by The Pass. Nothing was charged and no order was sent.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
      {/* The menu, orderable. */}
      <div>
        {soldOut && (
          <p className="hse-label mb-8 border-2 border-[#E8552A] bg-[#E8552A]/10 px-4 py-3 text-[#16130F]">
            The rotisserie has sold out for today. Back tomorrow at 11.
          </p>
        )}

        {issue.sections.map((section) => (
          <section key={section.title} className="mb-10">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-[#16130F] pb-2">
              <h2 className="hse-display text-[24px]">{section.title}</h2>
              {section.note && (
                <p className="hse-label text-[#16130F]/55">{section.note}</p>
              )}
            </div>
            <ul>
              {section.items.map((item) => {
                const gone = Boolean(item.fromRotisserie) && soldOut;
                const qty = lines[item.name]?.qty ?? 0;
                return (
                  <li
                    key={item.name}
                    className="flex items-center justify-between gap-6 border-b border-dotted border-[#16130F]/25 py-4"
                  >
                    <div className={clsx(gone && "opacity-45")}>
                      <p className={clsx("text-[15.5px]", gone && "line-through")}>
                        {item.name}
                      </p>
                      <p className="mt-1 text-[12.5px] leading-snug text-[#16130F]/65">
                        {gone ? "Back tomorrow at 11" : item.detail}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <span className={clsx("hse-num text-[15px]", gone && "opacity-45")}>
                        ${item.price}
                      </span>
                      {gone ? (
                        <span className="hse-label w-[104px] text-right text-[#16130F]/40">
                          Sold out
                        </span>
                      ) : qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => add(item.name, item.price, 1)}
                          className="hse-label w-[104px] border-2 border-[#16130F] py-2 transition-colors hover:bg-[#16130F] hover:text-[#F2EDE4]"
                        >
                          Add
                        </button>
                      ) : (
                        <span className="hse-stepper w-[104px] justify-between">
                          <button type="button" onClick={() => add(item.name, item.price, -1)} aria-label={`One fewer ${item.name}`}>
                            −
                          </button>
                          <span className="hse-num text-[15px]">{qty}</span>
                          <button type="button" onClick={() => add(item.name, item.price, 1)} aria-label={`One more ${item.name}`}>
                            +
                          </button>
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* The ticket. */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="hse-card p-6">
          <p className="hse-label text-[#E8552A]">Your order</p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {(["pickup", "delivery"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={clsx(
                  "hse-label border-2 border-[#16130F] py-2.5 transition-colors",
                  mode === m ? "bg-[#16130F] text-[#F2EDE4]" : "hover:bg-[#16130F]/10",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-[#16130F]/65">
            {mode === "pickup"
              ? `${FULFILMENT.pickupWait}. ${HOUSE.address}`
              : `${FULFILMENT.deliveryWait}. ${FULFILMENT.radius}, $${FULFILMENT.fee} flat.`}
          </p>

          <ul className="mt-6 min-h-[64px] space-y-2 border-t border-[#16130F]/20 pt-5 text-[13.5px]">
            {items.length === 0 ? (
              <li className="text-[#16130F]/45">Nothing on the ticket yet.</li>
            ) : (
              items.map((l) => (
                <li key={l.name} className="flex justify-between gap-4">
                  <span>
                    {l.qty} × {l.name}
                  </span>
                  <span className="hse-num">${(l.price * l.qty).toFixed(2)}</span>
                </li>
              ))
            )}
          </ul>

          <dl className="mt-5 space-y-1.5 border-t border-[#16130F]/20 pt-4 text-[13px]">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="hse-num">${subtotal.toFixed(2)}</dd>
            </div>
            {mode === "delivery" && (
              <div className="flex justify-between">
                <dt>Delivery</dt>
                <dd className="hse-num">${fee.toFixed(2)}</dd>
              </div>
            )}
            <div className="flex justify-between text-[#16130F]/70">
              <dt>Tax</dt>
              <dd className="hse-num">${tax.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between border-t-2 border-[#16130F] pt-3">
              <dt className="hse-display text-[20px]">Total</dt>
              <dd className="hse-display hse-num text-[20px]">${total.toFixed(2)}</dd>
            </div>
          </dl>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="hse-label text-[#16130F]/60">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full border-b-2 border-[#16130F]/30 bg-transparent py-2 text-[15px] outline-none focus:border-[#E8552A]"
              />
            </label>
            <label className="block">
              <span className="hse-label text-[#16130F]/60">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                className="mt-1.5 w-full border-b-2 border-[#16130F]/30 bg-transparent py-2 text-[15px] outline-none focus:border-[#E8552A]"
              />
            </label>
            {mode === "delivery" && (
              <label className="block">
                <span className="hse-label text-[#16130F]/60">Address</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1.5 w-full border-b-2 border-[#16130F]/30 bg-transparent py-2 text-[15px] outline-none focus:border-[#E8552A]"
                />
              </label>
            )}
          </div>

          <button
            type="button"
            disabled={!canPlace}
            onClick={() => setPlaced(true)}
            className={clsx(
              "hse-label mt-6 w-full border-2 border-[#16130F] py-3.5 transition-colors",
              canPlace
                ? "bg-[#E8552A] hover:bg-[#16130F] hover:text-[#F2EDE4]"
                : "cursor-not-allowed border-[#16130F]/25 text-[#16130F]/35",
            )}
          >
            {mounted && items.length > 0
              ? `Place order · ready ${ready}`
              : "Place order"}
          </button>
          <p className="mt-3 text-[11.5px] leading-relaxed text-[#16130F]/55">
            No tip on the site; we take that at the counter. Pay when you
            collect. A concept room by The Pass.
          </p>
        </div>
      </aside>
    </div>
  );
}
