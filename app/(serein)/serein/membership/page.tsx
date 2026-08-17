import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "The Blue Hour — SEREIN's members' circle",
  description:
    "The Blue Hour is the members' circle of SEREIN: standing evenings, the first of every season, and the hours the public never sees.",
};

const DUSK = "/images/serein/serein-dusk.jpg";
const ROOM = "/images/serein/room.png";

const PRINCIPLES: { title: string; detail: string }[] = [
  {
    title: "A table that is already yours",
    detail:
      "Thirty seats and one seating means the room fills before most guests think to call. Members are seated first, always.",
  },
  {
    title: "The evenings nobody advertises",
    detail:
      "A handful of nights each season belong only to the circle: single-producer dinners, the cellar opened, the kitchen cooking off the menu.",
  },
  {
    title: "The kitchen, in your inbox",
    detail:
      "A letter each month on what the boats brought, what is fermenting, and what will change when the season turns.",
  },
];

const TIERS: {
  name: string;
  price: string;
  cadence: string;
  line: string;
  includes: string[];
  seats: string;
}[] = [
  {
    name: "Vigil",
    price: "$60",
    cadence: "each month",
    line: "For those who watch for the light.",
    includes: [
      "Sixty-day booking window, before the public",
      "Two seats held on request each month",
      "The monthly letter from the kitchen",
      "First word on members' evenings",
    ],
    seats: "Open",
  },
  {
    name: "Lantern",
    price: "$180",
    cadence: "each month",
    line: "For those who keep a standing evening.",
    includes: [
      "A standing table each month, yours to move or release",
      "Pairings included for two, wine or botanical",
      "Two seats at every members' evening",
      "The cellar list, and the pours held back from it",
    ],
    seats: "Forty members",
  },
  {
    name: "Keeper",
    price: "$480",
    cadence: "each month",
    line: "For those who sit at the pass.",
    includes: [
      "The counter reserved, any evening, on a day's notice",
      "The kitchen will cook off the menu for you",
      "Two guests carried on your name at any time",
      "A dinner cooked in your own room, once a year",
    ],
    seats: "Twelve members",
  },
];

/**
 * The Blue Hour — SEREIN's members' circle. A sibling brand rather than
 * a page of the restaurant: same house typography and ink, but the
 * accent shifts from brass to the mist blue of the hour after sunset,
 * so the circle reads as its own mark within the family.
 */
export default function MembershipPage() {
  return (
    <div className="srn-blue">
      <section className="relative overflow-hidden bg-[#05070B]">
        <div className="absolute inset-0" aria-hidden>
          <Image src={DUSK} alt="" fill priority quality={86} sizes="100vw" className="object-cover object-[70%_center]" />
          <div className="absolute inset-0 bg-[#05070B]/80" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#05070B]/70 via-transparent to-[#05070B]" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-5 pb-20 pt-32 sm:px-8 sm:pt-40">
          <Link
            href="/serein"
            className="srn-label text-[#E9E5DB]/50 transition-colors hover:text-[#E9E5DB]"
          >
            ← SEREIN
          </Link>
          <p className="srn-serif mt-10 text-[clamp(44px,9vw,120px)] leading-[0.95] tracking-[0.22em] text-[#E9E5DB]">
            THE BLUE HOUR
          </p>
          <div className="srn-hour-rule mt-8 h-px w-full max-w-[520px]" />
          <p className="mt-6 max-w-[520px] text-[14px] leading-relaxed text-[#E9E5DB]/65">
            <em className="italic">blue hour</em> (n.) the interval after
            sunset when the sky keeps its last colour, and before the dark
            arrives in full
          </p>
          <h1 className="srn-serif mt-12 max-w-[820px] text-[clamp(28px,4vw,50px)] leading-[1.08] text-[#E9E5DB]">
            The members&apos; circle of SEREIN, for the guests who would
            rather{" "}
            <em className="italic text-[#6E8CA6]">never have to call.</em>
          </h1>
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <a
              href="#tiers"
              className="srn-label group inline-flex items-center gap-3 border border-[#6E8CA6] px-7 py-4 text-[#E9E5DB] transition-colors hover:bg-[#6E8CA6] hover:text-[#05070B]"
            >
              The three memberships
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </a>
            <Link
              href="/serein/reserve"
              className="srn-label py-4 text-[#E9E5DB]/60 transition-colors hover:text-[#E9E5DB]"
            >
              Or reserve a single evening
            </Link>
          </div>
        </div>
      </section>

      {/* Why a circle at all */}
      <section className="bg-[#05070B] px-5 py-24 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-[1200px]">
          <p className="srn-chapter-label srn-label text-[#E9E5DB]/45">
            <span>01</span>
            <span>What it means</span>
          </p>
          <ol className="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-14">
            {PRINCIPLES.map((p, i) => (
              <li key={p.title}>
                <p className="srn-serif text-[20px] italic text-[#6E8CA6]">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2 className="srn-serif mt-4 text-[26px] leading-[1.12] text-[#E9E5DB]">
                  {p.title}
                </h2>
                <p className="mt-4 text-[13.5px] leading-relaxed text-[#E9E5DB]/65">
                  {p.detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The tiers */}
      <section id="tiers" className="scroll-mt-16 bg-[#080C13] px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-[1200px]">
          <p className="srn-chapter-label srn-label text-[#E9E5DB]/45">
            <span>02</span>
            <span>The three memberships</span>
          </p>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
            <h2 className="srn-serif text-[clamp(32px,4.5vw,56px)] leading-[1.04] text-[#E9E5DB]">
              Three ways to keep
              <br />
              <em className="italic text-[#6E8CA6]">an evening.</em>
            </h2>
            <p className="max-w-[420px] self-end text-[14.5px] leading-relaxed text-[#E9E5DB]/65">
              Membership is billed monthly and may be paused between
              seasons. Dues are credited against what you eat and drink, so
              the circle costs nothing extra to the guests who use it.
            </p>
          </div>

          <ol className="mt-16 grid gap-10 lg:grid-cols-3 lg:gap-0">
            {TIERS.map((t) => (
              <li key={t.name} className="srn-tier">
                <p className="srn-label text-[#6E8CA6]">{t.seats}</p>
                <h3 className="srn-serif mt-4 text-[34px] leading-none text-[#E9E5DB]">
                  {t.name}
                </h3>
                <p className="mt-3 text-[13.5px] italic text-[#E9E5DB]/60">
                  {t.line}
                </p>
                <p className="mt-6">
                  <span className="srn-serif text-[30px] text-[#E9E5DB]">{t.price}</span>
                  <span className="ml-2 text-[13px] text-[#E9E5DB]/55">{t.cadence}</span>
                </p>
                <ul className="mt-7 space-y-3">
                  {t.includes.map((line) => (
                    <li key={line} className="flex gap-3 text-[13px] leading-relaxed text-[#E9E5DB]/70">
                      <span aria-hidden className="mt-[9px] h-px w-3 shrink-0 bg-[#6E8CA6]/70" />
                      {line}
                    </li>
                  ))}
                </ul>
                <a
                  href="#join"
                  className="srn-label mt-8 inline-block border-b border-[#6E8CA6]/40 pb-0.5 text-[#6E8CA6] transition-colors hover:border-[#6E8CA6]"
                >
                  Request {t.name}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The year in the circle */}
      <section className="relative overflow-hidden bg-[#05070B]">
        <div className="relative aspect-[16/9] min-h-[420px] w-full">
          <Image src={ROOM} alt="" fill quality={86} sizes="100vw" className="object-cover object-[46%_center]" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#05070B] via-[#05070B]/45 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
              <p className="srn-chapter-label srn-label max-w-[420px] text-[#E9E5DB]/45">
                <span>03</span>
                <span>The year in the circle</span>
              </p>
              <ul className="mt-10 max-w-[440px] space-y-5">
                {[
                  ["Winter", "The cellar evening: bottles opened that were never on a list."],
                  ["Spring", "The first uni of the season, cooked at the counter, six seats."],
                  ["Summer", "One long table on the terrace, the only night we serve outside."],
                  ["Autumn", "The preservation dinner: a year of ferments, tasted in order."],
                ].map(([season, detail]) => (
                  <li key={season} className="border-b border-[#E9E5DB]/12 pb-5">
                    <p className="srn-label text-[#6E8CA6]">{season}</p>
                    <p className="mt-2 text-[14px] leading-relaxed text-[#E9E5DB]/75">
                      {detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Join */}
      <section id="join" className="scroll-mt-16 bg-[#05070B] px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto grid max-w-[1100px] gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
          <div>
            <p className="srn-chapter-label srn-label text-[#E9E5DB]/45">
              <span>04</span>
              <span>Join the circle</span>
            </p>
            <h2 className="srn-serif mt-10 text-[clamp(30px,4.5vw,52px)] leading-[1.05] text-[#E9E5DB]">
              Membership is
              <br />
              <em className="italic text-[#6E8CA6]">by request.</em>
            </h2>
            <p className="mt-6 max-w-[400px] text-[14.5px] leading-relaxed text-[#E9E5DB]/65">
              Lantern is limited to forty and Keeper to twelve, so requests
              are answered in the order they arrive and, when the circle is
              full, held on a list. We answer every one within a week.
            </p>
            <p className="srn-label mt-10 text-[#E9E5DB]/40">
              A concept room by The Pass. Nothing here is charged.
            </p>
          </div>

          <form className="grid gap-5 sm:grid-cols-2" aria-label="Request membership">
            {[
              { name: "name", label: "Your name", type: "text" },
              { name: "email", label: "Email", type: "email" },
            ].map((f) => (
              <label key={f.name}>
                <span className="srn-label text-[#E9E5DB]/55">{f.label}</span>
                <input
                  type={f.type}
                  name={f.name}
                  className="mt-2 w-full border-0 border-b border-[#E9E5DB]/25 bg-transparent px-0 py-2.5 text-[15px] text-[#E9E5DB] outline-none transition-colors focus:border-[#6E8CA6]"
                />
              </label>
            ))}
            <label className="sm:col-span-2">
              <span className="srn-label text-[#E9E5DB]/55">Membership</span>
              <select
                name="tier"
                defaultValue="Lantern"
                className="mt-2 w-full border-0 border-b border-[#E9E5DB]/25 bg-transparent px-0 py-2.5 text-[15px] text-[#E9E5DB] outline-none transition-colors focus:border-[#6E8CA6] [&>option]:bg-[#05070B]"
              >
                {TIERS.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} · {t.price} each month
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="srn-label text-[#E9E5DB]/55">
                Anything we should know
              </span>
              <textarea
                name="note"
                rows={3}
                className="mt-2 w-full border-0 border-b border-[#E9E5DB]/25 bg-transparent px-0 py-2.5 text-[15px] text-[#E9E5DB] outline-none transition-colors focus:border-[#6E8CA6]"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="button"
                className="srn-label group inline-flex items-center gap-3 bg-[#E9E5DB] px-8 py-4 text-[#05070B] transition-colors hover:bg-[#6E8CA6]"
              >
                Request membership
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </button>
            </div>
          </form>
        </div>
      </section>

      <footer className="border-t border-[#E9E5DB]/12 bg-[#05070B] px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-baseline justify-between gap-x-10 gap-y-4">
          <p className="srn-label text-[#E9E5DB]">
            THE BLUE HOUR <span className="text-[#6E8CA6]">· SEREIN</span>
          </p>
          <p className="srn-label text-[#E9E5DB]/45">Santa Barbara, California</p>
          <p className="text-[12.5px] text-[#E9E5DB]/55">
            A concept room by{" "}
            <a href="/" className="border-b border-[#6E8CA6]/40 text-[#6E8CA6] transition-colors hover:border-[#6E8CA6]">
              The Pass
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
