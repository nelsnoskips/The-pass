import type { Metadata } from "next";
import { MERCH, RELEASE, money } from "@/lib/feedback";
import { Plate } from "@/components/feedback/Plate";

export const metadata: Metadata = {
  title: "Merch table — FEEDBACK",
  description: "Tees, caps and the current release. Sold at the counter and here.",
};

/** The merch table, set up the way it is at the back of a venue. */
export default function MerchPage() {
  return (
    <div className="bg-[#0f0b09] px-5 pb-20 pt-28 sm:px-8">
      <div className="mx-auto max-w-[1000px]">
        <p className="fbk-label text-[rgba(232,225,211,0.5)]">Merch table</p>
        <h1 className="fbk-display mt-3 text-[clamp(44px,9vw,110px)]">
          At the back.
        </h1>

        <div className="mt-12 grid gap-10 sm:grid-cols-2">
          {MERCH.map((item) => (
            <article key={item.name} className="fbk-channel fbk-channel-dark p-6">
              <Plate
                src={item.image}
                alt={item.name}
                className="fbk-channel-art aspect-square w-full"
                imgClassName="h-full w-full object-contain"
              />
              <h2 className="fbk-display mt-5 text-[26px]">{item.name}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[rgba(232,225,211,0.7)]">
                {item.detail}
              </p>
              <p className="fbk-mono mt-3 text-[15px]">{money(item.price)}</p>
              <p className="fbk-label mt-4 text-[rgba(232,225,211,0.45)]">
                Sold at the counter
              </p>
            </article>
          ))}
        </div>

        <section className="mt-16 border-t border-[rgba(232,225,211,0.18)] pt-10">
          <p className="fbk-label text-[rgba(232,225,211,0.5)]">
            Current release
          </p>
          <p className="fbk-display mt-2 text-[36px]">
            {RELEASE.title}{" "}
            <span className="fbk-mono text-[15px] text-[rgba(232,225,211,0.6)]">
              {RELEASE.format}
            </span>
          </p>
          <p className="fbk-mono mt-2 text-[13px] text-[rgba(232,225,211,0.7)]">
            {RELEASE.through} · {money(RELEASE.price)}
          </p>
        </section>
      </div>
    </div>
  );
}
