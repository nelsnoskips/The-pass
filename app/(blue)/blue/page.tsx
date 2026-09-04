import Link from "next/link";
import { BlueFrame, BlueMic } from "@/components/blue/BlueFrame";
import {
  BAR,
  DESCENT,
  EVENING,
  FOOTER_NAV,
  HERO_PLANES,
  MEMBERSHIP_FRAMES,
  MEMBER_RIGHTS,
  PRIVATE,
  VENUE,
  WEEK,
} from "@/lib/blue";

/**
 * A headline that arrives a line at a time out of overflow-hidden masks.
 * Without the engine the same markup is simply a headline, which is the
 * point: the mask is a wrapper, never a condition of the text existing.
 */
function Lines({ lines, className = "" }: { lines: string[]; className?: string }) {
  return (
    <h2 className={`blu-display ${className}`}>
      {lines.map((line, i) => (
        <span className="blu-mask" key={line}>
          <span style={{ transitionDelay: `${i * 90}ms` }}>{line}</span>
        </span>
      ))}
    </h2>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="blu-label text-[#BEBAB2]">{children}</p>;
}

/**
 * BLUE at the Gale South Beach — a concept room from The Pass Test Kitchen.
 *
 * The room doesn't start blue. It becomes Blue.
 *
 * The page opens in near-black candlelight with one narrow pool of blue
 * behind a microphone, and cobalt enters it in stages: a little as the
 * curtains draw back, more as dinner turns into the second set, and all
 * of it at the last call. Nothing here is blue because blue is the brand
 * colour. It is blue because the evening got there.
 */
export default function BluePage() {
  return (
    <main id="top">
      {/* ==================================================== hero === */}
      <section className="blu-herowrap" aria-label="BLUE at the Gale South Beach">
        <div className="blu-stage">
          {/* 1 — the rear scrim, furthest back, moving least. */}
          <div className="blu-plane blu-p-scrim">
            <div className="blu-lite" aria-hidden />
            {HERO_PLANES.scrim.src ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={HERO_PLANES.scrim.src} alt="" aria-hidden />
            ) : null}
          </div>

          {/* 2 — the dark the room starts in, lifting as it opens. */}
          <div className="blu-hero-night" aria-hidden />

          {/* 3 — the projection thrown on that scrim. */}
          <div className="blu-projection" aria-hidden>
            <span>
              BLUE
              <small>At the Gale South Beach</small>
            </span>
          </div>

          {/* 4 — the microphone and the pool of blue it stands in. The
                  plane rides the parallax; the microphone never moves. */}
          <div className="blu-plane blu-p-mic">
            <div className="blu-pool" aria-hidden />
            {HERO_PLANES.microphone.src ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={HERO_PLANES.microphone.src} alt="" aria-hidden />
            ) : (
              <BlueMic className="blu-mic" />
            )}
          </div>

          {/* 5 — the curtains, 28% occluded at rest. */}
          <div className="blu-plane blu-p-curtain" aria-hidden>
            <div className="blu-curtain blu-curtain-l" />
            <div className="blu-curtain blu-curtain-r" />
          </div>

          {/* 6 — the tables in the foreground, nearest and fastest. */}
          <div className="blu-plane blu-p-tables" aria-hidden>
            <div className="blu-lite" />
          </div>

          <div className="blu-haze" aria-hidden />
          <div className="blu-hero-shade" aria-hidden />
          <div className="blu-grain" aria-hidden />

          {/* The destination: real heading, real actions, in the first
              frame and the last. */}
          <div className="blu-hero-copy">
            <div className="blu-shell">
              <h1 className="blu-display blu-h1 max-w-[15ch]">
                The room
                <br />
                is waiting.
              </h1>
              <p className="blu-body mt-8 max-w-[46ch]">
                Dinner, live music and the night that follows—beneath the Gale South Beach.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <a href="#tonight" className="blu-btn blu-label">
                  View tonight
                </a>
                <a href="#reserve" className="blu-btn blu-btn-primary blu-label">
                  Reserve the experience
                </a>
              </div>
            </div>
          </div>

          <p className="blu-hero-eyebrow blu-label">
            Beneath the Gale · {VENUE.street}
          </p>
          <div className="blu-hero-exit" aria-hidden />
        </div>
      </section>

      {/* ======================================= this week at blue === */}
      <section id="tonight" className="blu-section" data-blu-reveal>
        <div className="blu-shell">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <Label>This week at Blue</Label>
              <Lines className="blu-h2 mt-6" lines={["Three nights.", "Six sets."]} />
            </div>
            <p className="blu-body max-w-[38ch]" data-blu-rise>
              Two sets a night, every night the room is open. The first at nine, the
              second when the floor is ready for it. Reservations open twenty-eight
              days ahead.
            </p>
          </div>

          <div id="calendar" className="blu-week mt-16 md:mt-24">
            {WEEK.map((show, i) => (
              <article className="blu-bill" key={show.artist} data-blu-reveal>
                <BlueFrame
                  frame={show.frame}
                  className="blu-portrait"
                  sizes="(max-width: 900px) 78vw, 30vw"
                >
                  <div className="blu-velvet" aria-hidden />
                </BlueFrame>

                <div className="blu-bill-meta mt-6" style={{ transitionDelay: `${i * 60}ms` }}>
                  <div className="flex items-baseline gap-4">
                    <span className="blu-num text-[clamp(2.6rem,4vw,4rem)] leading-none">
                      {show.date}
                    </span>
                    <span className="blu-label text-[#BEBAB2]">
                      {show.billing}
                      <span className="sr-only">, {show.day}</span>
                    </span>
                  </div>
                  <h3 className="blu-display blu-h3 mt-5">{show.artist}</h3>
                  <p className="blu-body mt-3 text-[0.95rem]">{show.format}</p>
                  <p className="blu-label mt-5 text-[#F1EDE4]">
                    <time>{show.sets}</time>
                  </p>
                  <p className="blu-body mt-4 max-w-[34ch] text-[0.95rem]">{show.note}</p>
                  <a href="#reserve" className="blu-link blu-label mt-5">
                    Reserve this night
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="blu-seam" aria-hidden />

      {/* ===================================== one seating, one show === */}
      <section id="experience" className="blu-section" data-blu-reveal>
        <div className="blu-shell grid gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <Label>The experience</Label>
            <Lines
              className="blu-h2 mt-6"
              lines={["One seating.", "One show.", "One complete", "evening."]}
            />
            <p className="blu-body mt-10 max-w-[42ch]" data-blu-rise>
              Dinner is not a prelude to the music, and the music is not something
              playing while you eat. The room does one thing at a time, and everyone
              in it does that thing together—four courses, two sets, one hour the
              lights change.
            </p>
            <a href="#reserve" className="blu-link blu-label mt-10">
              View the menu
            </a>
          </div>

          <div className="lg:col-span-7">
            <ol className="blu-hair">
              {EVENING.map((beat) => (
                <li className="blu-list-row" key={beat.time}>
                  <div>
                    <h3 className="blu-display text-[clamp(1.35rem,1.9vw,1.9rem)]">
                      {beat.title}
                    </h3>
                    <p className="blu-body mt-2 max-w-[46ch] text-[0.95rem]">{beat.detail}</p>
                  </div>
                  <span className="blu-num blu-label text-[#C7A66A]">{beat.time}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ============================ come for dinner, stay for the turn === */}
      <section className="blu-turnwrap" aria-labelledby="blu-turn-title">
        <div className="blu-turnstage">
          <div className="blu-turn-layer blu-turn-warm">
            <div className="blu-lite" aria-hidden />
          </div>
          <div className="blu-turn-layer blu-turn-blue">
            <div className="blu-lite" aria-hidden />
          </div>
          <div className="blu-turn-seam" aria-hidden />
          <div className="blu-grain" aria-hidden />

          <div className="blu-turn-copy blu-shell flex min-h-[68svh] flex-col justify-center py-24 lg:min-h-[100svh]">
            <div className="max-w-[52ch]" data-blu-reveal>
              <Label>The turn</Label>
              <h2 id="blu-turn-title" className="blu-display blu-h2 mt-6">
                <span className="blu-mask">
                  <span>Come for dinner.</span>
                </span>
                <span className="blu-mask">
                  <span style={{ transitionDelay: "90ms" }}>Stay for the turn.</span>
                </span>
              </h2>
              <p className="blu-body mt-8 max-w-[40ch]" data-blu-rise>
                At eleven the same room changes temperature. The candles stay, the
                warm light goes, and the second set plays to a floor that has stopped
                sitting down.
              </p>
              <p className="blu-label mt-10 text-[#BEBAB2]" data-blu-rise>
                Second set · Lights lower · The floor opens
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================ behind the bar === */}
      <section className="blu-section" data-blu-reveal>
        <div className="blu-shell grid gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-6">
            <BlueFrame
              frame={{
                src: null,
                alt: "A clarified negroni poured tableside at BLUE",
                light: "candle",
              }}
              className="aspect-[4/5] w-full"
              sizes="(max-width: 900px) 90vw, 44vw"
            >
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-[linear-gradient(0deg,rgba(6,71,217,0.32),rgba(3,8,18,0))]"
                data-blu-drift="14"
                aria-hidden
              />
            </BlueFrame>
          </div>

          <div className="lg:col-span-6 lg:pt-16">
            <Label>Behind the bar</Label>
            <Lines className="blu-h2 mt-6" lines={["Poured", "in the dark."]} />
            <p className="blu-body mt-8 max-w-[40ch]" data-blu-rise>
              A short list, kept short on purpose. Six things the bar does better than
              anyone on Collins, and a cellar that answers the rest.
            </p>
            <ul className="blu-hair mt-12">
              {BAR.map((item) => (
                <li className="blu-list-row" key={item.name}>
                  <div>
                    <h3 className="blu-display text-[clamp(1.2rem,1.6vw,1.6rem)]">
                      {item.name}
                    </h3>
                    <p className="blu-body mt-2 max-w-[44ch] text-[0.92rem]">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ========================================= a room few people know === */}
      <section id="membership" className="blu-section bg-[#071427]" data-blu-reveal>
        <div className="blu-shell grid gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5">
            <Label>Membership</Label>
            <Lines className="blu-h2 mt-6" lines={["A room few", "people know."]} />
            <p className="blu-body mt-8 max-w-[38ch]" data-blu-rise>
              Membership at BLUE is by invitation and application. It is not a faster
              line. It is a bottle with your name on it, a glass kept for you, and a
              table on the nights everyone else is calling about.
            </p>
            <ul className="mt-12 space-y-4">
              {MEMBER_RIGHTS.map((right) => (
                <li key={right} className="blu-body flex gap-4 text-[0.98rem] text-[#F1EDE4]">
                  <span aria-hidden className="mt-[0.7em] h-px w-6 shrink-0 bg-[#C7A66A]" />
                  {right}
                </li>
              ))}
            </ul>
            <a href="#reserve" className="blu-btn blu-label mt-12">
              Request membership
            </a>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:col-span-7 lg:gap-5">
            {MEMBERSHIP_FRAMES.map((frame, i) => (
              <BlueFrame
                key={frame.alt}
                frame={frame}
                className={i % 3 === 0 ? "aspect-[3/4] w-full" : "aspect-[4/5] w-full"}
                sizes="(max-width: 900px) 44vw, 26vw"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================ private, completely === */}
      <section id="private" className="blu-section" data-blu-reveal>
        <div className="blu-shell">
          <div className="flex flex-wrap items-end justify-between gap-10">
            <div>
              <Label>Private events</Label>
              <Lines className="blu-h2 mt-6" lines={["Private,", "completely."]} />
            </div>
            <p className="blu-body max-w-[38ch]" data-blu-rise>
              The whole room, the stage, the terrace and the band, for one night and
              one guest list. Buyouts run from ninety seated to four hundred standing.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {PRIVATE.map((event) => (
              <article key={event.title} data-blu-reveal>
                <BlueFrame
                  frame={event.frame}
                  className="aspect-[4/5] w-full"
                  sizes="(max-width: 900px) 90vw, 22vw"
                />
                <h3 className="blu-display blu-h3 mt-6 text-[clamp(1.3rem,1.7vw,1.7rem)]">
                  {event.title}
                </h3>
                <p className="blu-body mt-3 max-w-[32ch] text-[0.92rem]">{event.detail}</p>
              </article>
            ))}
          </div>

          <a href="#reserve" className="blu-link blu-label mt-14">
            Plan your event
          </a>
        </div>
      </section>

      <div className="blu-seam" aria-hidden />

      {/* ====================================================== the room === */}
      <section className="blu-section" data-blu-reveal>
        <div className="blu-shell grid gap-16 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-7">
            <BlueFrame
              frame={{
                src: null,
                alt: "The BLUE room from the back of house, stage lit",
                light: "cobalt",
              }}
              className="aspect-[16/10] w-full"
              sizes="(max-width: 900px) 90vw, 54vw"
            />
          </div>
          <div className="lg:col-span-5 lg:pt-10">
            <Label>The room</Label>
            <Lines className="blu-h2 mt-6" lines={["One room,", "built around", "the stage."]} />
            <dl className="blu-hair mt-12">
              {[
                ["Seats", "112 at one seating"],
                ["Stage", "Live, every night the room is open"],
                ["Floor", "Opens at the second set"],
                ["Terrace", "Champagne from seven, weather permitting"],
                ["Dress", "Evening. No sportswear, no exceptions"],
              ].map(([term, detail]) => (
                <div className="blu-list-row" key={term}>
                  <dt className="blu-label text-[#BEBAB2]">{term}</dt>
                  <dd className="blu-body text-right text-[0.95rem] text-[#F1EDE4]">{detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ============================== beneath the gale, beyond expected === */}
      <section className="blu-section" data-blu-reveal>
        <div className="blu-shell">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <Label>Finding it</Label>
              <Lines className="blu-h2 mt-6" lines={["Beneath the Gale.", "Beyond the", "expected."]} />
              <p className="blu-body mt-8 max-w-[34ch]" data-blu-rise>
                A discreet descent from the Gale lobby, one floor down, behind a door
                that is not marked. Valet on Collins; the doorman knows.
              </p>
              <address className="blu-body mt-10 not-italic text-[#F1EDE4]">
                {VENUE.street}
                <br />
                {VENUE.city}
                <br />
                <a href={VENUE.phoneHref} className="blu-link blu-label mt-4">
                  {VENUE.phone}
                </a>
              </address>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-8">
              {DESCENT.map((frame) => (
                <BlueFrame
                  key={frame.alt}
                  frame={frame}
                  className="aspect-[3/4] w-full"
                  sizes="(max-width: 900px) 90vw, 24vw"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================ the first note is at 9 === */}
      <section id="reserve" className="blu-final blu-section" data-blu-reveal>
        <div className="blu-final-figure" aria-hidden>
          {/* A performer's silhouette, faint behind the copy — suggested,
              never a stock photograph of a nightclub. */}
          <svg viewBox="0 0 200 520" fill="none" preserveAspectRatio="xMidYMax meet">
            <g fill="#030812">
              {/* a singer at a stand: head, shoulders, a long line down */}
              <ellipse cx="100" cy="52" rx="21" ry="25" />
              <path d="M100 80c-25 0-42 15-48 41l-9 40c-2 11 3 17 13 17h88c10 0 15-6 13-17l-9-40c-6-26-23-41-48-41Z" />
              <path d="M74 178h52l16 342H58l16-342Z" />
              {/* the stand in front of them */}
              <rect x="150" y="150" width="4" height="370" />
              <rect x="140" y="132" width="24" height="26" rx="11" />
            </g>
          </svg>
        </div>

        <div className="blu-shell text-center">
          <Label>Tonight</Label>
          <h2 className="blu-display blu-h2 mx-auto mt-8 max-w-[16ch]">
            <span className="blu-mask">
              <span>The first note</span>
            </span>
            <span className="blu-mask">
              <span style={{ transitionDelay: "90ms" }}>is at nine.</span>
            </span>
          </h2>
          <p className="blu-body mx-auto mt-8 max-w-[44ch] text-[#F1EDE4]" data-blu-rise>
            Dinner is served at eight, once. Book the table, and the evening takes
            care of the rest.
          </p>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <a href={VENUE.phoneHref} className="blu-btn blu-btn-primary blu-label">
              Reserve the experience
            </a>
            <a href="#calendar" className="blu-btn blu-label">
              See the calendar
            </a>
          </div>
          <hr className="blu-rule-champagne mx-auto mt-16 max-w-[280px]" />
        </div>
      </section>

      {/* ======================================================= footer === */}
      <footer className="bg-[#030812] pb-16 pt-24">
        <div className="blu-shell grid gap-14 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="blu-display text-[26px] tracking-[0.4em]">BLUE</p>
            <p className="blu-label mt-3 text-[#BEBAB2]">At the Gale South Beach</p>
            <address className="blu-body mt-8 not-italic text-[0.95rem]">
              {VENUE.street}
              <br />
              {VENUE.city}
              <br />
              <a href={VENUE.phoneHref} className="hover:text-[#F1EDE4]">
                {VENUE.phone}
              </a>
              <br />
              <a href={`mailto:${VENUE.email}`} className="hover:text-[#F1EDE4]">
                {VENUE.email}
              </a>
            </address>
          </div>

          {FOOTER_NAV.map((column) => (
            <nav className="md:col-span-3" key={column.heading} aria-label={column.heading}>
              <p className="blu-label text-[#BEBAB2]">{column.heading}</p>
              <ul className="mt-6 space-y-1">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#top"
                      className="blu-label flex min-h-[40px] items-center text-[#F1EDE4]/80 transition-colors hover:text-[#F1EDE4]"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="md:col-span-2 md:text-right">
            <p className="blu-label text-[#BEBAB2]">Site by</p>
            <Link href="/" className="blu-label mt-6 inline-flex min-h-[40px] items-center">
              The Pass
            </Link>
          </div>
        </div>

        <div className="blu-shell mt-16">
          <hr className="blu-rule" />
          <p className="blu-label mt-6 text-[#BEBAB2]">
            A concept room from The Pass Test Kitchen · Not a real venue
          </p>
        </div>
      </footer>
    </main>
  );
}
