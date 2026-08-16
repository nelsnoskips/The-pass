"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  availabilityFor,
  formatDoors,
  formatSunset,
  isServiceDay,
} from "@/lib/serein-sun";

/**
 * The reservation flow: choose the evening, the table, the party, and
 * the pairing, and watch the card on the left compose itself as you go.
 *
 * Availability is derived from the date (see lib/serein-sun) so a
 * concept booking still behaves consistently. Everything renders after
 * mount because each evening's hour depends on the real sunset, which
 * the server can't know for the visitor's "today" without disagreeing
 * with the client.
 */

type Seating = "room" | "counter";
type Pairing = "wine" | "botanical" | "none";

const SEATINGS: { key: Seating; name: string; detail: string; seats: string }[] = [
  { key: "room", name: "The Room", detail: "The long table, facing the window", seats: "Twenty-four seats" },
  { key: "counter", name: "The Counter", detail: "At the pass, where the plates are finished", seats: "Six seats" },
];

const PAIRINGS: { key: Pairing; name: string; detail: string; price: string }[] = [
  { key: "wine", name: "Central Coast Wine", detail: "Ten pours from within ninety miles", price: "$95" },
  { key: "botanical", name: "Botanical", detail: "Coastal sage, fennel pollen, kelp, verjus", price: "$95" },
  { key: "none", name: "Neither, thank you", detail: "The menu alone", price: "—" },
];

const MENU_PRICE = 210;
const PAIRING_PRICE = 95;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function ReserveFlow() {
  const [mounted, setMounted] = useState(false);
  const [date, setDate] = useState<Date | null>(null);
  const [guests, setGuests] = useState(2);
  const [seating, setSeating] = useState<Seating>("room");
  const [pairing, setPairing] = useState<Pairing>("wine");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => setMounted(true), []);

  // Thirty days of service evenings, the window the room opens.
  const evenings = useMemo(() => {
    if (!mounted) return [];
    const today = startOfDay(new Date());
    const out: Date[] = [];
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      if (isServiceDay(d)) out.push(d);
    }
    return out;
  }, [mounted]);

  const total = MENU_PRICE * guests + (pairing === "none" ? 0 : PAIRING_PRICE * guests);
  const full = date ? availabilityFor(date) === "full" : false;
  const canSubmit = Boolean(date) && !full && name.trim() !== "" && email.trim() !== "";

  const longDate = (d: Date) =>
    d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  if (done && date) {
    return (
      <div className="mx-auto max-w-[560px] border border-[#C9884B]/35 bg-[#080C13] p-10 text-center sm:p-14">
        <p className="srn-label text-[#C9884B]">Your evening is held</p>
        <p className="srn-serif mt-6 text-[clamp(30px,4vw,44px)] leading-[1.06] text-[#E9E5DB]">
          {longDate(date)}
        </p>
        <p className="srn-serif mt-2 text-[26px] italic text-[#C9884B]">
          {formatSunset(date)}
        </p>
        <dl className="mt-10 space-y-3 border-t border-[#E9E5DB]/12 pt-8 text-left text-[13.5px]">
          {[
            ["Guests", `${guests}`],
            ["Seating", SEATINGS.find((s) => s.key === seating)!.name],
            ["Pairing", PAIRINGS.find((p) => p.key === pairing)!.name],
            ["Doors", formatDoors(date)],
            ["Held for", name],
          ].map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-6">
              <dt className="srn-label text-[#E9E5DB]/45">{k}</dt>
              <dd className="text-[#E9E5DB]">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-[13px] leading-relaxed text-[#E9E5DB]/60">
          A confirmation would arrive at {email || "your inbox"}. This is a
          concept room by The Pass, so nothing was actually booked.
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="srn-label mt-8 border-b border-[#C9884B]/40 pb-0.5 text-[#C9884B] transition-colors hover:border-[#C9884B]"
        >
          Choose another evening
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_1.25fr] lg:gap-20">
      {/* The card, composing itself as choices are made. */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="border border-[#E9E5DB]/12 p-8">
          <p className="srn-label text-[#C9884B]">Your evening</p>
          <p className="srn-serif mt-5 text-[30px] leading-[1.1] text-[#E9E5DB]">
            {date ? longDate(date) : "Choose an evening"}
          </p>
          {date && (
            <p className="srn-serif mt-1 text-[20px] italic text-[#C9884B]">
              First course at {formatSunset(date)}
            </p>
          )}
          <dl className="mt-8 space-y-3 border-t border-[#E9E5DB]/12 pt-6 text-[13.5px]">
            {[
              ["Guests", `${guests}`],
              ["Seating", SEATINGS.find((s) => s.key === seating)!.name],
              ["Pairing", PAIRINGS.find((p) => p.key === pairing)!.name],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-6">
                <dt className="srn-label text-[#E9E5DB]/45">{k}</dt>
                <dd className="text-[#E9E5DB]/85">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex items-baseline justify-between gap-6 border-t border-[#E9E5DB]/12 pt-6">
            <span className="srn-label text-[#E9E5DB]/45">Estimated</span>
            <span className="srn-serif text-[26px] text-[#E9E5DB]">
              ${total.toLocaleString("en-US")}
            </span>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-[#E9E5DB]/45">
            $210 per guest, plus pairings. Service included; a card holds
            the table and is charged only for absence.
          </p>
        </div>
      </aside>

      <div>
        {/* 01 — the evening */}
        <section aria-labelledby="step-evening">
          <p className="srn-chapter-label srn-label text-[#E9E5DB]/45">
            <span>01</span>
            <span id="step-evening">Choose an evening</span>
          </p>
          {!mounted ? (
            <div className="mt-7 h-[132px] animate-pulse border border-[#E9E5DB]/10" />
          ) : (
            <ul className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {evenings.map((d) => {
                const state = availabilityFor(d);
                const selected = date?.toDateString() === d.toDateString();
                return (
                  <li key={d.toISOString()}>
                    <button
                      type="button"
                      disabled={state === "full"}
                      onClick={() => setDate(d)}
                      aria-pressed={selected}
                      className={clsx(
                        "w-full border p-3 text-left transition-colors",
                        state === "full" && "cursor-not-allowed border-[#E9E5DB]/8 text-[#E9E5DB]/25",
                        state !== "full" && selected && "border-[#C9884B] bg-[#C9884B]/10",
                        state !== "full" && !selected && "border-[#E9E5DB]/15 hover:border-[#E9E5DB]/40",
                      )}
                    >
                      <span className="srn-label block text-[#E9E5DB]/50">
                        {d.toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                      <span className="srn-serif mt-1 block text-[24px] leading-none text-[#E9E5DB]">
                        {d.getDate()}
                      </span>
                      <span className="mt-2 block text-[11px] text-[#E9E5DB]/55">
                        {state === "full" ? "Full" : formatSunset(d)}
                      </span>
                      {state === "few" && (
                        <span className="mt-1 block text-[10.5px] uppercase tracking-[0.16em] text-[#C9884B]">
                          Two left
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-[12.5px] text-[#E9E5DB]/50">
            Thursday to Monday. Each evening begins as the sun reaches the
            water, so the hour moves with the season.
          </p>
        </section>

        {/* 02 — the table */}
        <section aria-labelledby="step-table" className="mt-14">
          <p className="srn-chapter-label srn-label text-[#E9E5DB]/45">
            <span>02</span>
            <span id="step-table">The table</span>
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {SEATINGS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSeating(s.key)}
                aria-pressed={seating === s.key}
                className={clsx(
                  "border p-5 text-left transition-colors",
                  seating === s.key
                    ? "border-[#C9884B] bg-[#C9884B]/10"
                    : "border-[#E9E5DB]/15 hover:border-[#E9E5DB]/40",
                )}
              >
                <p className="srn-serif text-[22px] text-[#E9E5DB]">{s.name}</p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[#E9E5DB]/60">
                  {s.detail}
                </p>
                <p className="srn-label mt-3 text-[#E9E5DB]/40">{s.seats}</p>
              </button>
            ))}
          </div>

          <p className="srn-label mt-8 text-[#E9E5DB]/45">Guests</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setGuests(n)}
                aria-pressed={guests === n}
                className={clsx(
                  "h-11 w-11 border text-[15px] transition-colors",
                  guests === n
                    ? "border-[#C9884B] bg-[#C9884B]/10 text-[#E9E5DB]"
                    : "border-[#E9E5DB]/15 text-[#E9E5DB]/70 hover:border-[#E9E5DB]/40",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* 03 — the pairing */}
        <section aria-labelledby="step-pairing" className="mt-14">
          <p className="srn-chapter-label srn-label text-[#E9E5DB]/45">
            <span>03</span>
            <span id="step-pairing">Beside the menu</span>
          </p>
          <ul className="mt-7 divide-y divide-[#E9E5DB]/10 border-y border-[#E9E5DB]/10">
            {PAIRINGS.map((p) => (
              <li key={p.key}>
                <button
                  type="button"
                  onClick={() => setPairing(p.key)}
                  aria-pressed={pairing === p.key}
                  className="flex w-full items-baseline justify-between gap-6 py-5 text-left"
                >
                  <span className="flex items-baseline gap-4">
                    <span
                      aria-hidden
                      className={clsx(
                        "mt-1 h-2.5 w-2.5 shrink-0 rounded-full border transition-colors",
                        pairing === p.key
                          ? "border-[#C9884B] bg-[#C9884B]"
                          : "border-[#E9E5DB]/35",
                      )}
                    />
                    <span>
                      <span className="srn-serif block text-[20px] text-[#E9E5DB]">
                        {p.name}
                      </span>
                      <span className="mt-1 block text-[12.5px] text-[#E9E5DB]/60">
                        {p.detail}
                      </span>
                    </span>
                  </span>
                  <span className="srn-label shrink-0 text-[#E9E5DB]/50">{p.price}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* 04 — who to expect */}
        <section aria-labelledby="step-details" className="mt-14">
          <p className="srn-chapter-label srn-label text-[#E9E5DB]/45">
            <span>04</span>
            <span id="step-details">Who we should expect</span>
          </p>
          <div className="mt-7 grid gap-6 sm:grid-cols-2">
            <label>
              <span className="srn-label text-[#E9E5DB]/55">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full border-0 border-b border-[#E9E5DB]/25 bg-transparent px-0 py-2.5 text-[15px] text-[#E9E5DB] outline-none transition-colors focus:border-[#C9884B]"
              />
            </label>
            <label>
              <span className="srn-label text-[#E9E5DB]/55">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full border-0 border-b border-[#E9E5DB]/25 bg-transparent px-0 py-2.5 text-[15px] text-[#E9E5DB] outline-none transition-colors focus:border-[#C9884B]"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => setDone(true)}
            className={clsx(
              "srn-label group mt-10 inline-flex items-center gap-3 px-8 py-4 transition-colors",
              canSubmit
                ? "bg-[#E9E5DB] text-[#05070B] hover:bg-[#C9884B]"
                : "cursor-not-allowed border border-[#E9E5DB]/15 text-[#E9E5DB]/35",
            )}
          >
            Hold this evening
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </button>
          {!date && (
            <p className="mt-4 text-[12.5px] text-[#E9E5DB]/45">
              Choose an evening to continue.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
