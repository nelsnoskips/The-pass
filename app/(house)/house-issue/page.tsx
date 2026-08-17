import Link from "next/link";
import Image from "next/image";
import { Masthead } from "@/components/house/Masthead";
import { ChickenCount } from "@/components/house/ChickenCount";
import { Plate } from "@/components/house/Plate";
import { HeroCallouts } from "@/components/house/HeroCallouts";
import { Polaroid, Prop, Tape } from "@/components/house/Prop";
import {
  COLLAB,
  HOUSE,
  ISSUES,
  THIS_WEEK,
  currentIssue,
  issueLabel,
} from "@/lib/house";

/**
 * Issue No. 001. The order of business is deliberate: navigation and
 * ordering, the masthead, the live count, the promise, today's menu,
 * the drop, the block, then how to get here. No motion anywhere — this
 * concept proves restraint next to SEREIN's film.
 */
export default function HouseIssuePage() {
  const issue = currentIssue();
  const past = ISSUES.filter((i) => !i.current);

  return (
    <>
      <Masthead issue={issue.number} dated={issue.dated} />

      <main id="main">
        {/* ------------------------------------------ the layered hero --- */}
        {/* Three planes: storefront behind, masthead type in the middle,
            the cut-out sandwich in front. Each moves at its own rate on
            scroll, so the depth is real rather than a rectangle sliding. */}
        <section className="hse-stage hse-paper border-b-4 border-[#16130F]">
          <div className="relative mx-auto min-h-[520px] max-w-[1320px] px-4 pb-8 pt-6 sm:min-h-[620px] sm:px-6 lg:min-h-[720px]">
            {/* Plane 1: the block. */}
            {/* Masked rather than scrimmed: a solid gradient would have to
                guess the paper's colour, and the paper is a photograph
                with its own variation. Fading the photo's own alpha lets
                the real sheet show through, so there is no seam. */}
            <div className="hse-layer hse-l-back absolute inset-y-0 right-0 w-full [mask-image:linear-gradient(to_right,transparent_2%,black_46%)] lg:w-[62%] lg:[mask-image:linear-gradient(to_right,transparent_0%,black_34%)]">
              <Plate
                src="/images/house/hero-storefront.jpg"
                alt="The HOUSE ISSUE storefront on Sunset, benches out front"
                label="Hero · the storefront"
                className="h-full w-full bg-transparent"
                sizes="(max-width: 1024px) 100vw, 62vw"
                priority
              />
            </div>

            {/* Plane 2: the masthead, which the sandwich passes in front of. */}
            <div className="hse-layer hse-l-type relative z-10 pointer-events-none">
              <h1 className="hse-display text-[clamp(56px,15vw,206px)] leading-[0.82]">
                House Issue
                <span className="align-super text-[0.2em]">™</span>
              </h1>
              <p className="hse-label mt-3 max-w-[280px] text-[#16130F]/70">
                {HOUSE.descriptor} · {HOUSE.place}
              </p>
            </div>

            {/* Plane 3: the sandwich, cut out and closest to the guest. */}
            <div className="hse-layer hse-l-hand pointer-events-none absolute inset-x-0 bottom-[-4%] z-20 flex justify-center lg:left-auto lg:right-[4%] lg:w-[54%]">
              {/* The sandwich, whole. Annotations anchor to its frame. */}
              <div className="relative w-[86%] max-w-[720px] lg:w-full">
                <Image
                  src="/images/house/hero-sandwich.png"
                  alt="A turkey club held out toward you"
                  width={1665}
                  height={1531}
                  priority
                  quality={88}
                  sizes="(max-width: 1024px) 90vw, 54vw"
                  className="h-auto w-full drop-shadow-[0_28px_45px_rgba(22,19,15,0.34)]"
                />
                <HeroCallouts />
              </div>
            </div>

            {/* The live count, tucked behind the sandwich edge. */}
            <div className="absolute bottom-8 left-4 z-[15] sm:left-6">
              <ChickenCount variant="sticker" />
            </div>
          </div>
        </section>

        {/* ------------------------------------------- the promise --- */}
        <section className="hse-paper border-b-4 border-[#16130F]">
          <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.1fr_0.75fr] lg:items-center lg:gap-12">
            <div>
              <h2 className="hse-display text-[clamp(34px,5vw,62px)]">
                Good food.
                <br />
                Good people.
                <br />
                Same table.
              </h2>
              <p className="mt-6 max-w-[380px] text-[14.5px] leading-relaxed text-[#16130F]/75">
                We are a neighborhood deli, rotisserie and goods shop in Los
                Angeles. Everything we do is made for the block and the
                people on it.
              </p>
              <p className="hse-label mt-8 inline-block rounded-full border-2 border-[#16130F] px-4 py-2">
                {HOUSE.mark}
              </p>
            </div>

            <figure className="relative">
              <Plate
                src="/images/house/cutout-rotisserie-spread.png"
                alt="A rotisserie chicken on a metal tray with crispy potatoes, pickles and charred greens"
                label="Feature · the rotisserie plate"
                className="hse-cut-bare aspect-[4/3]"
                imgClassName="object-contain"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
              <figcaption className="mt-4 grid gap-2 sm:grid-cols-3">
                {[
                  ["Rotisserie chicken", "Lemon, herb, garlic"],
                  ["Crispy potatoes", "Kettle fried daily"],
                  ["House pickles", "Dill, garlic, chili"],
                ].map(([t, d]) => (
                  <span key={t} className="hse-callout text-[#16130F]/70">
                    <span aria-hidden className="mr-1 text-[#E8552A]">↗</span>
                    {t}
                    <span className="mt-0.5 block font-normal tracking-normal normal-case opacity-70">
                      {d}
                    </span>
                  </span>
                ))}
              </figcaption>
            </figure>

            <Prop
              stock="quote-card"
              className="hse-sticker-r mx-auto w-full max-w-[340px]"
              sizes="(max-width: 1024px) 90vw, 26vw"
            >
              <Tape kind="kraft" width={132} className="-top-4 left-6 -rotate-[7deg]" />
              <blockquote className="px-9 py-12 text-center">
                <p className="hse-display text-[clamp(28px,3.4vw,42px)] leading-[0.95]">
                  “Made
                  <br />
                  for the
                  <br />
                  block.”
                </p>
                <span aria-hidden className="mx-auto mt-3 block h-1 w-16 bg-[#E8552A]" />
                <p className="hse-label mt-5 text-[#16130F]/60">
                  House Issue
                  <br />
                  Los Angeles, CA
                </p>
              </blockquote>
            </Prop>
          </div>
        </section>

        {/* ------------------------------------------ today's menu --- */}
        <section id="menu" className="relative scroll-mt-4 overflow-clip bg-[#16130F] py-12 text-[#F2EDE4]">
          {/* The counter the cards sit on. */}
          <div className="absolute inset-0" aria-hidden>
            <Plate
              src="/images/house/case-steel.jpg"
              alt=""
              label=""
              className="h-full w-full"
              sizes="100vw"
              imgClassName="object-cover"
            />
            <div className="absolute inset-0 bg-[#16130F]/72" />
          </div>
          <div className="relative mx-auto max-w-[1320px] px-4 sm:px-6">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <p className="hse-label">Today&apos;s menu</p>
              <a href="#full-menu" className="hse-label transition-colors hover:text-[#E8552A]">
                Full menu →
              </a>
            </div>

            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {issue.features.map((f, i) => (
                <li
                  key={f.code}
                  className="hse-card relative flex min-h-[272px] flex-col px-5 pb-5 pt-6 text-[#16130F]"
                >
                  {/* The plate is printed larger than its card and runs off
                      the top and right edges. A menu that keeps every
                      photograph politely inside its box reads as a
                      catalogue; letting the food break the rule is what
                      makes it read as press. */}
                  <div className="pointer-events-none absolute -top-[18%] right-[-9%] z-[5] w-[62%]">
                    <Plate
                      src={f.image}
                      alt={f.name}
                      label={f.name}
                      className="hse-cut-bare aspect-square"
                      imgClassName="object-contain"
                      sizes="(max-width: 768px) 55vw, 20vw"
                    />
                  </div>

                  <div className="relative z-10 w-[47%]">
                    <div className="flex items-start justify-between gap-2">
                      <p className="hse-display text-[clamp(36px,3.8vw,50px)] leading-none text-[#E8552A]">
                        {String(i + 1).padStart(2, "0")}
                      </p>
                      <p className="hse-label hse-num pt-1 text-[#16130F]/45">{f.code}</p>
                    </div>
                    <p className="hse-display mt-2 text-[21px] leading-[0.95]">{f.name}</p>
                    <p className="hse-num mt-1.5 text-[19px]">${f.price}</p>
                  </div>

                  <div className="relative z-10 mt-auto pt-8">
                    <p className="hse-label text-[#16130F]/55">
                      Availability:{" "}
                      <span className="text-[#2E7D32]">
                        {f.availability === "good" ? "Good" : f.availability === "limited" ? "Limited" : "Gone"}
                      </span>
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <span className="hse-stepper">
                        <button type="button" aria-label={`One fewer ${f.name}`}>−</button>
                        <span className="hse-num w-9 text-center text-[15px]">1</span>
                        <button type="button" aria-label={`One more ${f.name}`}>+</button>
                      </span>
                      <button type="button" className="hse-btn hse-label flex-1">
                        Add
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            {/* The rail plaque, stamped into the counter. */}
            <p className="hse-label mx-auto mt-10 w-fit border border-[#F2EDE4]/25 bg-[#16130F]/70 px-5 py-2 text-[#F2EDE4]/60">
              — {HOUSE.motto} —
            </p>
          </div>
        </section>

        {/* ------------------------------------------------ the drop --- */}
        <section className="bg-[#16130F] pb-14 text-[#F2EDE4]">
          <div className="mx-auto grid max-w-[1320px] gap-8 px-4 sm:px-6 lg:grid-cols-[0.85fr_2fr] lg:gap-10">
            <div className="bg-[#E8552A] p-8 text-[#16130F]">
              <p className="hse-label">The Drop</p>
              <p className="hse-display mt-5 text-[clamp(30px,3.6vw,50px)]">
                Issue 001 / available until it isn&apos;t.
              </p>
              <Link href="/house-issue/goods" className="hse-btn hse-label mt-8 bg-[#16130F] text-[#F2EDE4] hover:bg-[#F2EDE4] hover:text-[#16130F]">
                Shop the drop →
              </Link>
            </div>

            <ul className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {issue.drop.map((d) => (
                <li key={d.name}>
                  <Plate
                    src={d.image}
                    alt={`${d.name}, ${d.variant}`}
                    label={d.name}
                    className="hse-cut aspect-square"
                    imgClassName="object-contain p-[13%]"
                    sizes="(max-width: 1024px) 50vw, 22vw"
                  />
                  <p className="hse-label mt-4">
                    {d.name} <span className="text-[#F2EDE4]/55">({d.variant})</span>
                  </p>
                  <p className="hse-num mt-1 text-[15px] text-[#F2EDE4]/85">${d.price}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------------- the neighborhood desk --- */}
        <section className="hse-paper border-y-4 border-[#16130F]">
          <div className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6">
            <p className="hse-label text-[#E8552A]">Neighborhood Desk</p>
            <div className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr_0.8fr] lg:gap-12">
              <div>
                <h2 className="hse-display text-[clamp(30px,4vw,52px)]">
                  This block,
                  <br />
                  this week.
                </h2>
                <ul className="mt-8 space-y-5">
                  {THIS_WEEK.map((e) => (
                    <li key={e.title} className="hse-rule pt-4">
                      <p className="hse-label">
                        {e.title} · {e.time}
                      </p>
                      <p className="mt-1.5 text-[13.5px] text-[#16130F]/70">{e.detail}</p>
                    </li>
                  ))}
                </ul>
                <Link href="/house-issue/issues" className="hse-btn hse-btn-ghost hse-label mt-8">
                  View calendar →
                </Link>
              </div>

              <figure className="lg:-mt-2">
                <Polaroid
                  src="/images/house/desk-polaroids.jpg"
                  alt="Guests at the long table, taped-down photographs"
                  className="rotate-[-1.4deg]"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                >
                  <Tape kind="orange" width={150} className="-top-5 left-1/2 -translate-x-1/2 rotate-[2.5deg]" />
                  <figcaption className="hse-label absolute bottom-[6%] left-0 w-full text-center text-[#16130F]/55">
                    Thank you for making this block home.
                  </figcaption>
                </Polaroid>
              </figure>

              <div className="space-y-8">
                <Prop stock="menu-card" className="px-7 py-8 text-center" sizes="(max-width: 1024px) 90vw, 22vw">
                  <p className="hse-label text-[#E8552A]">Local collab</p>
                  <p className="hse-display mt-4 text-[22px]">House Issue</p>
                  <p className="hse-display text-[16px] text-[#16130F]/60">×</p>
                  <p className="hse-display text-[22px]">{COLLAB.partner}</p>
                  <p className="hse-label mt-4 text-[#16130F]/70">{COLLAB.what}</p>
                  <p className="hse-label mt-1 text-[#16130F]/70">{COLLAB.when}</p>
                  <Image
                    src="/images/house/stamp-chicken-ink.png"
                    alt=""
                    width={1254}
                    height={1600}
                    sizes="120px"
                    className="mx-auto mt-5 h-auto w-[86px] opacity-80"
                  />
                </Prop>

                <form className="hse-card p-6">
                  <p className="hse-label">Neighborhood notes</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#16130F]/70">
                    Got something for the block? Tell us about it.
                  </p>
                  <input
                    type="text"
                    aria-label="Your note"
                    className="mt-4 w-full border-b-2 border-[#16130F]/30 bg-transparent py-2 text-[14px] outline-none focus:border-[#E8552A]"
                  />
                  <button type="button" className="hse-btn hse-label mt-4 w-full">
                    Submit →
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------- the full menu --- */}
        <section id="full-menu" className="hse-paper scroll-mt-4 border-b-4 border-[#16130F]">
          <div className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 className="hse-display text-[clamp(28px,3.6vw,46px)]">
                Everything we have today
              </h2>
              <p className="hse-label text-[#E8552A]">{HOUSE.kitchenNote}</p>
            </div>
            <div className="mt-10 grid gap-x-14 gap-y-12 lg:grid-cols-3">
              {issue.sections.map((s) => (
                <div key={s.title}>
                  <h3 className="hse-display text-[24px]">{s.title}</h3>
                  {s.note && <p className="hse-label mt-2 text-[#E8552A]">{s.note}</p>}
                  <ul className="mt-6">
                    {s.items.map((item) => (
                      <li key={item.name} className="hse-line">
                        <span>
                          <span className="block text-[15.5px]">{item.name}</span>
                          <span className="mt-1 block text-[12.5px] leading-snug text-[#16130F]/65">
                            {item.detail}
                          </span>
                        </span>
                        <span className="hse-num text-[15px]">{item.price}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="hse-rule mt-12 grid gap-10 pt-8 sm:grid-cols-2">
              {issue.notes.map((n) => (
                <article key={n.title}>
                  <h3 className="hse-display text-[20px]">{n.title}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-[#16130F]/75">{n.body}</p>
                </article>
              ))}
            </div>

            <p className="hse-label mt-10 text-[#16130F]/55">
              {past.length > 0
                ? `${past.length} issue${past.length === 1 ? "" : "s"} before this one · `
                : "The first issue. The next one is already cooking · "}
              <Link href="/house-issue/issues" className="hse-link">The archive →</Link>
            </p>
          </div>
        </section>

        {/* --------------------------------------------- come hungry --- */}
        <section id="visit" className="scroll-mt-4 bg-[#E8552A] text-[#16130F]">
          <div className="mx-auto grid max-w-[1320px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_1fr_0.9fr] lg:items-center">
            <div>
              <p className="hse-label">Come visit</p>
              <h2 className="hse-display mt-4 text-[clamp(46px,8vw,120px)] leading-[0.85]">
                Come
                <br />
                hungry.
              </h2>
            </div>

            <div id="order" className="scroll-mt-4">
              <p className="hse-label">{HOUSE.address}</p>
              <dl className="mt-5 space-y-2 text-[14px]">
                <div className="flex justify-between gap-6 border-b border-[#16130F]/25 pb-2">
                  <dt className="hse-label">Open today</dt>
                  <dd className="hse-num">{HOUSE.hours}</dd>
                </div>
                <div className="flex justify-between gap-6 border-b border-[#16130F]/25 pb-2">
                  <dt className="hse-label">Phone</dt>
                  <dd className="hse-num">{HOUSE.phone}</dd>
                </div>
              </dl>
              <Link
                href="/house-issue/order"
                className="hse-btn hse-label mt-6 w-full bg-[#16130F] text-[#F2EDE4] hover:bg-[#F2EDE4] hover:text-[#16130F]"
              >
                <span aria-hidden>▣</span> Order pickup or delivery →
              </Link>
              <p className="hse-label mt-4 text-[#16130F]/70">
                Walk-ins welcome. {HOUSE.promise}
              </p>
            </div>

            {/* A drawn map, not an embed: no third-party script on a page
                whose whole argument is speed. */}
            <div className="relative border-2 border-[#16130F] bg-[#F2EDE4] p-5">
              <svg viewBox="0 0 300 200" className="h-auto w-full" role="img" aria-label="Map: 1806 W Sunset Boulevard">
                <rect width="300" height="200" fill="#F2EDE4" />
                <path d="M0 130 L300 96" stroke="#16130F" strokeWidth="7" opacity="0.85" />
                <path d="M0 60 L300 30" stroke="#16130F" strokeWidth="2" opacity="0.3" />
                <path d="M96 0 L128 200" stroke="#16130F" strokeWidth="2" opacity="0.3" />
                <path d="M210 0 L236 200" stroke="#16130F" strokeWidth="2" opacity="0.3" />
                <text x="228" y="88" fontSize="9" fontWeight="700" fill="#16130F" opacity="0.7">SUNSET BLVD</text>
                <circle cx="150" cy="112" r="9" fill="#E8552A" stroke="#16130F" strokeWidth="2" />
                <text x="150" y="140" fontSize="9" fontWeight="700" textAnchor="middle" fill="#16130F">H/01</text>
              </svg>
              <p className="hse-label mt-3 text-center text-[#16130F]/60">1806 W Sunset Blvd</p>
            </div>
          </div>

          {/* The receipt, left on the counter. */}
          <div className="relative mx-auto max-w-[1320px] px-4 pb-12 sm:px-6">
            <div className="relative overflow-clip border-2 border-[#16130F] py-12">
              <div className="absolute inset-0" aria-hidden>
                <Plate
                  src="/images/house/wood-counter.jpg"
                  alt=""
                  label=""
                  className="h-full w-full"
                  sizes="100vw"
                  imgClassName="object-cover"
                />
                <div className="absolute inset-0 bg-[#16130F]/45" />
              </div>
              <p className="hse-stamp hse-label absolute right-5 top-5 z-10 hidden border-2 border-[#F2EDE4]/80 px-3 py-2 text-[#F2EDE4]/80 sm:block">
                {HOUSE.motto}
              </p>
              <div className="hse-sticker relative z-10 mx-auto max-w-[320px] bg-[#F2EDE4] px-6 py-5 text-center">
              <p className="hse-label">Thank you</p>
              <p className="mt-2 text-[13px] text-[#16130F]/70">See you tomorrow.</p>
                <p className="hse-label hse-num mt-4 text-[#16130F]/50">
                  House Issue · {issueLabel(issue.number)} · Sunday Edition
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
