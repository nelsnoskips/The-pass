import Image from "next/image";
import { SereinMist } from "@/components/serein/SereinMist";
import { DuskClock } from "@/components/serein/DuskClock";

const GOLDEN = "/images/serein/serein-golden.jpg";
const DUSK = "/images/serein/serein-dusk.jpg";
const NIGHT = "/images/serein/serein-night.jpg";

const MOVEMENTS: { n: string; name: string; detail: string }[] = [
  { n: "I", name: "Tide", detail: "Santa Barbara uni, sea lettuce, cold broth of its own shells" },
  { n: "II", name: "Stone", detail: "Abalone cooked over embers, kelp butter, verjus" },
  { n: "III", name: "Furrow", detail: "Ranch carrots, three years of koji, black garlic" },
  { n: "IV", name: "Smoke", detail: "Local halibut, smoked hay cream, fennel pollen" },
  { n: "V", name: "Salt", detail: "White sea bass cured forty days, Tomol Ranch citrus" },
  { n: "VI", name: "Ember", detail: "Santa Maria oak, spot prawn, its head pressed into sauce" },
  { n: "VII", name: "Garum", detail: "Anchovy fermented one year, spring alliums, chicory" },
  { n: "VIII", name: "Veil", detail: "Kanpachi, compressed cucumber, coastal sage oil" },
  { n: "IX", name: "Serein", detail: "Buttermilk, salt-preserved plum, lemon verbena" },
  { n: "X", name: "Dark", detail: "Bitter chocolate, kelp caramel, olive oil, sea salt" },
];

/**
 * SEREIN — a concept room from The Pass Test Kitchen.
 *
 * The hero is a scroll-scrubbed film that loses its light: golden hour
 * dissolves through dusk into candlelit night across three graded frames
 * of one composition, resolving into the conventional reservation hero.
 * Built with the cinematic-scroll-hero technique (dual engine, still
 * frame under reduced motion).
 */
export default function SereinPage() {
  return (
    <>
      {/* ------------------------------------------------ the film --- */}
      <section className="srn-stagewrap">
        <div className="srn-stage">
          <div className="srn-photo">
            {/* Dusk is the base layer; golden covers it, night rises over both. */}
            <Image src={DUSK} alt="" fill priority quality={86} sizes="100vw" className="srn-img-dusk" />
            <Image src={GOLDEN} alt="" fill priority quality={86} sizes="100vw" className="srn-img-golden" />
            <Image
              src={NIGHT}
              alt="A candlelit stone sill looking out over the Pacific after sunset"
              fill
              quality={86}
              sizes="100vw"
              className="srn-img-night"
            />
          </div>
          <div className="srn-veil" aria-hidden />
          <SereinMist className="absolute inset-0 z-[3] h-full w-full" />

          <div className="srn-acts">
            {/* Act I — the name, and what it means. */}
            <div className="srn-act srn-act-title" aria-hidden>
              <p className="srn-serif srn-wordmark-big text-[#E9E5DB]">SEREIN</p>
              <p className="mt-8 max-w-[440px] text-[13.5px] leading-relaxed tracking-[0.02em] text-[#E9E5DB]/60">
                <em className="italic">serein</em> (n.) the fine rain that falls
                from a clear sky, after sunset
              </p>
            </div>

            {/* Act II — the promise. */}
            <div className="srn-act srn-act-line" aria-hidden>
              <p className="srn-serif srn-line-big text-[#E9E5DB]">
                Ten courses, served as{" "}
                <em className="italic text-[#C9884B]">the light leaves.</em>
              </p>
              <p className="mt-6 max-w-[520px] text-[15px] leading-relaxed text-[#E9E5DB]/70">
                Dinner begins at dusk and ends in candlelight. The room
                darkens with the sky, and the menu follows the coast from
                the ranches down into the water.
              </p>
            </div>

            {/* Act III — the resolution: the real, clickable hero. */}
            <div className="srn-act srn-act-final">
              <div className="srn-final-shade" aria-hidden />
              <div className="srn-final-inner">
                <div className="max-w-[640px]">
                  <p className="srn-serif text-[clamp(40px,7vw,72px)] tracking-[0.28em] text-[#E9E5DB]">
                    SEREIN
                  </p>
                  <p className="srn-label mt-5 text-[#C9884B]">
                    Santa Barbara, California
                  </p>
                  <h1 className="srn-serif mt-9 text-[clamp(30px,4vw,48px)] leading-[1.08] text-[#E9E5DB]">
                    Ten courses, served as{" "}
                    <em className="italic text-[#C9884B]">the light leaves.</em>
                  </h1>
                  <p className="mt-6 max-w-[430px] text-[15px] leading-relaxed text-[#E9E5DB]/70">
                    A thirty-seat coastal tasting room where the ranches of
                    Santa Barbara meet the Pacific, one evening at a time.
                  </p>
                  <div className="mt-10 flex flex-wrap items-center gap-5">
                    <a
                      href="#reserve"
                      className="srn-label group inline-flex items-center gap-3 border border-[#C9884B] px-7 py-4 text-[#E9E5DB] transition-colors hover:bg-[#C9884B] hover:text-[#05070B]"
                    >
                      Reserve an Evening
                      <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </a>
                    <a
                      href="#menu"
                      className="srn-label py-4 text-[#E9E5DB]/65 transition-colors hover:text-[#E9E5DB]"
                    >
                      The Ten Movements
                    </a>
                  </div>
                  <p className="srn-label mt-12 text-[#E9E5DB]/40">
                    Thursday to Monday · One seating · $210 per guest
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="srn-hint" aria-hidden>
            <span className="srn-label flex items-center gap-2 text-[#E9E5DB]/60">
              Scroll
              <span className="srn-serif text-[16px] leading-none">↓</span>
            </span>
          </div>
        </div>
      </section>

      {/* --------------------------------- chapter 01 — the threshold --- */}
      <section className="srn-paper-section bg-[#E9E5DB] px-5 py-24 text-[#05070B] sm:px-8 sm:py-32">
        <div className="mx-auto max-w-[1200px]">
          <p className="srn-chapter-label srn-label text-[#05070B]/45">
            <span>01</span>
            <span>The Threshold</span>
          </p>
          <div className="mt-12 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <h2 className="srn-serif text-[clamp(34px,4.5vw,58px)] leading-[1.04]">
                The coast,
                <br />
                <em className="italic text-[#7A4A22]">after dark.</em>
              </h2>
              <div className="mt-8 max-w-[440px] space-y-5 text-[15px] leading-relaxed text-[#05070B]/72">
                <p>
                  Everything here begins twice: once on the ranches above the
                  city, and once in the water below it. The menu walks that
                  distance in ten movements, starting in the hills at golden
                  hour and finishing on the ocean floor by candlelight.
                </p>
                <p>
                  Nothing is flown in. What the boats bring and what the farms
                  cut decides the evening, which is why we tell you the
                  courses only after you sit down.
                </p>
              </div>
              <dl className="mt-10 grid max-w-[440px] grid-cols-3 gap-6 border-t border-[#05070B]/15 pt-6">
                {[
                  ["30", "Seats, one seating"],
                  ["10", "Movements nightly"],
                  ["4", "Nights each week"],
                ].map(([term, def]) => (
                  <div key={term}>
                    <dt className="srn-serif text-[30px]">{term}</dt>
                    <dd className="mt-1 text-[11.5px] leading-snug text-[#05070B]/55">{def}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <figure className="relative aspect-[4/5] overflow-hidden bg-[#05070B]/5">
              {/* PLACEHOLDER: a single plated course on stone, daylight.
                  See the image brief for what to generate. */}
              <div className="flex h-full items-center justify-center px-8 text-center">
                <p className="srn-label text-[#05070B]/35">
                  Course photograph
                  <br />
                  to come
                </p>
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* ------------------------------ chapter 02 — the ten movements --- */}
      <section id="menu" className="scroll-mt-16 bg-[#05070B] px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-[1200px]">
          <p className="srn-chapter-label srn-label text-[#E9E5DB]/45">
            <span>02</span>
            <span>The Ten Movements</span>
          </p>
          <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
            <div>
              <h2 className="srn-serif text-[clamp(34px,4.5vw,58px)] leading-[1.04] text-[#E9E5DB]">
                Ten movements.
                <br />
                <em className="italic text-[#C9884B]">One current.</em>
              </h2>
              <p className="mt-7 max-w-[400px] text-[15px] leading-relaxed text-[#E9E5DB]/70">
                A single menu each evening, $210 per guest. Two pairings run
                beside it, given equal weight: Central Coast wine, or a
                botanical pour built from the same coastline. Either is $95.
              </p>
              <div className="mt-9 space-y-4 border-t border-[#E9E5DB]/12 pt-7">
                <p className="srn-label text-[#C9884B]">Beside the menu</p>
                <p className="text-[13.5px] leading-relaxed text-[#E9E5DB]/65">
                  <span className="text-[#E9E5DB]">Wine, Central Coast.</span>{" "}
                  Ten pours from within ninety miles: Sta. Rita Hills pinot,
                  skin-contact grenache blanc, old-vine chenin.
                </p>
                <p className="text-[13.5px] leading-relaxed text-[#E9E5DB]/65">
                  <span className="text-[#E9E5DB]">Botanical, no alcohol.</span>{" "}
                  Coastal sage, fennel pollen, toasted kelp, verjus, quince
                  shrub. Fermented and pressed in the same kitchen.
                </p>
              </div>
            </div>
            <ol>
              {MOVEMENTS.map((m) => (
                <li key={m.n} className="srn-movement">
                  <span className="srn-serif text-[18px] italic text-[#C9884B]">{m.n}</span>
                  <div>
                    <p className="srn-serif text-[22px] text-[#E9E5DB]">{m.name}</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#E9E5DB]/60">
                      {m.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ------------------------------------- chapter 03 — the room --- */}
      <section className="relative overflow-hidden bg-[#05070B]">
        <div className="relative aspect-[16/10] min-h-[420px] w-full">
          <Image
            src={DUSK}
            alt="The dining room at dusk, thirty seats facing the Pacific"
            fill
            quality={86}
            sizes="100vw"
            className="object-cover object-[62%_center]"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-[#05070B] via-[#05070B]/70 to-transparent"
          />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
              <p className="srn-chapter-label srn-label max-w-[420px] text-[#E9E5DB]/45">
                <span>03</span>
                <span>The Room</span>
              </p>
              <h2 className="srn-serif mt-8 max-w-[620px] text-[clamp(34px,5vw,64px)] leading-[1.04] text-[#E9E5DB]">
                Thirty seats.
                <br />
                <em className="italic text-[#C9884B]">One shared horizon.</em>
              </h2>
              <p className="mt-7 max-w-[400px] text-[15px] leading-relaxed text-[#E9E5DB]/70">
                Dark timber, ocean-worn stone, and a single long window. Every
                seat faces the water, and the room is lit only by what is left
                of the day and what we light when it goes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------- chapter 04 — reservation --- */}
      <section id="reserve" className="relative scroll-mt-16 overflow-hidden bg-[#05070B]">
        <div className="absolute inset-0" aria-hidden>
          <Image src={NIGHT} alt="" fill quality={86} sizes="100vw" className="object-cover object-[70%_center]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05070B] via-[#05070B]/80 to-[#05070B]/25" />
        </div>
        <div className="relative mx-auto max-w-[1200px] px-5 py-24 sm:px-8 sm:py-32">
          <p className="srn-chapter-label srn-label max-w-[420px] text-[#E9E5DB]/45">
            <span>04</span>
            <span>Arrival</span>
          </p>
          <div className="mt-12 grid gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
            <div>
              <h2 className="srn-serif text-[clamp(34px,5vw,60px)] leading-[1.04] text-[#E9E5DB]">
                Meet us
                <br />
                <em className="italic text-[#C9884B]">at the edge.</em>
              </h2>
              <div className="mt-10 border-t border-[#E9E5DB]/12 pt-8">
                <p className="srn-label text-[#E9E5DB]/45">The tide is the clock</p>
                <div className="mt-4">
                  <DuskClock />
                </div>
                <p className="mt-4 max-w-[420px] text-[13.5px] leading-relaxed text-[#E9E5DB]/60">
                  The first course is served as the sun reaches the water, so
                  the hour moves with the season. Doors open thirty minutes
                  before.
                </p>
              </div>
            </div>

            <div>
              <form className="grid gap-5" aria-label="Request a table">
                <label>
                  <span className="srn-label text-[#E9E5DB]/55">Evening</span>
                  <input
                    type="date"
                    name="date"
                    className="mt-2 w-full border-0 border-b border-[#E9E5DB]/25 bg-transparent px-0 py-2.5 text-[15px] text-[#E9E5DB] outline-none transition-colors focus:border-[#C9884B]"
                  />
                </label>
                <label>
                  <span className="srn-label text-[#E9E5DB]/55">Guests</span>
                  <select
                    name="guests"
                    defaultValue="2"
                    className="mt-2 w-full border-0 border-b border-[#E9E5DB]/25 bg-transparent px-0 py-2.5 text-[15px] text-[#E9E5DB] outline-none transition-colors focus:border-[#C9884B] [&>option]:bg-[#05070B]"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "guest" : "guests"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="srn-label text-[#E9E5DB]/55">Name</span>
                  <input
                    type="text"
                    name="name"
                    className="mt-2 w-full border-0 border-b border-[#E9E5DB]/25 bg-transparent px-0 py-2.5 text-[15px] text-[#E9E5DB] outline-none transition-colors focus:border-[#C9884B]"
                  />
                </label>
                <label>
                  <span className="srn-label text-[#E9E5DB]/55">Email</span>
                  <input
                    type="email"
                    name="email"
                    className="mt-2 w-full border-0 border-b border-[#E9E5DB]/25 bg-transparent px-0 py-2.5 text-[15px] text-[#E9E5DB] outline-none transition-colors focus:border-[#C9884B]"
                  />
                </label>
                <button
                  type="button"
                  className="srn-label group mt-3 inline-flex items-center justify-center gap-3 bg-[#E9E5DB] px-7 py-4 text-[#05070B] transition-colors hover:bg-[#C9884B]"
                >
                  Enter the Evening
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </button>
                <p className="text-[12px] leading-relaxed text-[#E9E5DB]/45">
                  Reservations open thirty days ahead. A concept room by The
                  Pass, so this form is for demonstration only.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#E9E5DB]/12 bg-[#05070B] px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-baseline justify-between gap-x-10 gap-y-4">
          <p className="srn-label text-[#E9E5DB]">SEREIN</p>
          <p className="srn-label text-[#E9E5DB]/45">Santa Barbara, California</p>
          <p className="srn-label text-[#E9E5DB]/45">Thursday to Monday</p>
          <p className="text-[12.5px] text-[#E9E5DB]/55">
            A concept room by{" "}
            <a
              href="/"
              className="border-b border-[#C9884B]/40 text-[#C9884B] transition-colors hover:border-[#C9884B]"
            >
              The Pass
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
