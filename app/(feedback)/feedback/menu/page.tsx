import type { Metadata } from "next";
import { EVENT, SET_LIST } from "@/lib/feedback";
import { ChannelStrip } from "@/components/feedback/ChannelMenu";

export const metadata: Metadata = {
  title: "Full set list — FEEDBACK",
  description:
    "Everything FEEDBACK plays: main set, second set and encore. Smash burgers, fries and shakes in Rivertown.",
};

/**
 * The full set list. Same channel strips as the home page — one
 * component, so a price can never be right in one place and wrong in
 * the other.
 */
export default function MenuPage() {
  return (
    <div className="bg-[#0f0b09] px-5 pb-20 pt-28 sm:px-8">
      <div className="mx-auto max-w-[900px]">
        <p className="fbk-label text-[rgba(232,225,211,0.5)]">Set list</p>
        <h1 className="fbk-display mt-3 text-[clamp(44px,9vw,110px)]">
          The full set.
        </h1>
        <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-[rgba(232,225,211,0.7)]">
          Three sets a day, every day, until the prep runs out. Availability is
          what is actually left on the line right now.
        </p>

        {SET_LIST.map((set) => (
          <section key={set.title} className="mt-14">
            <div className="flex items-baseline justify-between border-b border-[rgba(232,225,211,0.18)] pb-3">
              <h2 className="fbk-display text-[30px]">{set.title}</h2>
              {set.note && (
                <p className="fbk-label text-[rgba(232,225,211,0.45)]">{set.note}</p>
              )}
            </div>
            <div className="fbk-paper mt-5">
              <ul className="divide-y divide-[rgba(20,16,14,0.15)]">
                {set.items.map((item) => (
                  <li key={item.code}>
                    <ChannelStrip item={item} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        <section id="shows" className="mt-20 border-t border-[rgba(232,225,211,0.18)] pt-10">
          <h2 className="fbk-display text-[30px]">Shows</h2>
          <div className="mt-5 flex flex-wrap items-baseline justify-between gap-4 border border-[rgba(232,225,211,0.18)] p-6">
            <div>
              <p className="fbk-display text-[34px]">{EVENT.date}</p>
              <p className="fbk-mono mt-1 text-[13px] text-[rgba(232,225,211,0.7)]">
                {EVENT.time} · {EVENT.detail}
              </p>
            </div>
            <p className="fbk-label text-[var(--fb-red)]">Free · All ages</p>
          </div>
        </section>
      </div>
    </div>
  );
}
