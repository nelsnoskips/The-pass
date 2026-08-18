"use client";

import Link from "next/link";
import { LEAD_ITEMS, money, type MenuItem } from "@/lib/feedback";
import { Plate } from "./Plate";
import { useOrder, useSound } from "./state";

/**
 * 03 / SET LIST — the menu as an amplifier's channels.
 *
 * Each item is a channel strip: an indicator that switches from red to
 * amber, a plate that steps forward, an availability meter that jumps
 * rather than slides, and an ADD that depresses and stays down like a
 * latching footswitch. Everything is 150—250ms, because the point of
 * the section is that it feels *switched*, not animated.
 *
 * The card itself is printed stock taped to the panel, exactly as it is
 * in the room: the personality is in the motion, not in the layout.
 */

export function ChannelMenu() {
  return (
    <section
      id="menu"
      className="relative bg-[#0f0b09] px-5 py-16 sm:px-8"
      aria-labelledby="setlist-heading"
    >
      <p className="fbk-label flex items-center gap-3 text-[rgba(232,225,211,0.6)]">
        <span className="fbk-chip">03</span> Set list / Menu
      </p>

      <div className="fbk-stock relative mt-6 rotate-[-0.4deg] p-5 sm:p-8">
        {/* Tape, off-square, holding the card to the panel. */}
        <span
          aria-hidden
          className="absolute -top-4 left-8 h-8 w-24 rotate-[-4deg] bg-[rgba(232,225,211,0.22)] backdrop-blur-[1px]"
        />
        <span
          aria-hidden
          className="absolute -top-4 right-10 h-8 w-24 rotate-[3deg] bg-[rgba(232,225,211,0.22)] backdrop-blur-[1px]"
        />

        <h2 id="setlist-heading" className="sr-only">
          Set list
        </h2>

        <ul className="divide-y divide-[rgba(20,16,14,0.15)]">
          {LEAD_ITEMS.map((item) => (
            <li key={item.code}>
              <ChannelStrip item={item} />
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end">
          <Link
            href="/feedback/menu"
            className="fbk-label inline-flex items-center gap-2 text-[#14100e] underline decoration-[#7E1416] underline-offset-4"
          >
            Full set list →
          </Link>
        </div>
      </div>
    </section>
  );
}

export function ChannelStrip({ item }: { item: MenuItem }) {
  const order = useOrder();
  const sound = useSound();
  const inTray = order.qty(item.code) > 0;

  return (
    <div className="fbk-channel group flex flex-wrap items-center gap-3 border-0 bg-transparent p-3 sm:flex-nowrap sm:gap-5 sm:p-4">
      <span className="fbk-chip shrink-0 self-start">{item.code}</span>

      <Plate
        src={item.image}
        alt={item.name}
        className="fbk-channel-art h-14 w-16 shrink-0 overflow-hidden sm:h-20 sm:w-28"
        imgClassName="h-full w-full object-cover"
      />

      <div className="min-w-[9rem] flex-1 basis-0">
        <p className="fbk-display flex flex-wrap items-baseline gap-x-3 text-[22px] text-[#14100e] sm:text-[26px]">
          {item.name}
          <span className="fbk-mono text-[15px] tracking-normal">
            · {money(item.price)}
          </span>
        </p>
        <p className="mt-1 text-[13px] leading-snug text-[#14100e]/70">
          {item.detail}
        </p>

        {/* The availability meter: how much of today's prep is left. */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="fbk-led fbk-led-amber" aria-hidden />
          <div className="fbk-meter w-20 bg-[rgba(20,16,14,0.15)] sm:w-28">
            <span style={{ transform: `scaleX(${item.availability / 100})` }} />
          </div>
          <span className="fbk-mono text-[10px] text-[#14100e]/55">
            {item.availability}% left today
          </span>
        </div>
      </div>

      <button
        type="button"
        data-on={inTray}
        onClick={() => {
          order.add(item.code);
          sound.click();
        }}
        className="fbk-toggle-light fbk-label ml-auto shrink-0 self-center px-4 py-2 sm:ml-0"
        aria-label={`Add ${item.name} to the order`}
      >
        {inTray ? `Add · ${order.qty(item.code)}` : "Add"}
      </button>
    </div>
  );
}
