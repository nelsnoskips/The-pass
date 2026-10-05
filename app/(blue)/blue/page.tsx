import Link from "next/link";
import Image from "next/image";
import { BlueFrame } from "@/components/blue/BlueFrame";
import {
  BLUE_LIST,
  BLUE_LIST_SHOT,
  DESCENT,
  DINNER,
  EVENING_STATES,
  EVENTS,
  FINALE,
  FOOTER_NAV,
  HERO,
  MEMBER_RIGHTS,
  MEMBER_SHOTS,
  TONIGHT,
  TURN,
  VENUE,
} from "@/lib/blue";

/**
 * A headline that arrives a line at a time out of overflow-hidden masks.
 * Without the engine the same markup is simply a headline: the mask is a
 * wrapper, never a condition of the words existing. Source case stays
 * natural and the caps are CSS, so a screen reader reads a sentence
 * rather than an acronym.
 */
function Lines({
  lines,
  as: Tag = "h2",
  className = "",
  id,
}: {
  lines: string[];
  as?: "h1" | "h2";
  className?: string;
  id?: string;
}) {
  return (
    <Tag id={id} className={`blu-display ${className}`}>
      {lines.map((line, i) => (
        <span className="blu-mask" key={line}>
          <span style={{ transitionDelay: `${i * 85}ms` }}>{line}</span>
        </span>
      ))}
    </Tag>
  );
}

/**
 * BLUE at the Gale South Beach — a concept room from The Pass Test Kitchen.
 *
 * The room doesn't start blue. It becomes Blue.
 *
 * The page opens on a stage the curtains are still drawing back from,
 * runs an evening across three panels, brings the house lights up in
 * ivory for the week's billing, drops back into the room for dinner and
 * the turn, pauses bright at the bar, and closes on a singer in full
 * cobalt. Blue is not applied to everything here. It arrives.
 */
export default function BluePage() {
  return (
    <main id="top">
      {/* ==================================================== hero === */}
      <section className="blu-herowrap" aria-label="BLUE at the Gale South Beach">
        <div className="blu-stage">
          {/* The room. One photograph, settling from 1.04 about the
              microphone so the anchor of the frame never moves. */}
          <div className="blu-room">
            <Image
              src={HERO.src}
              alt={HERO.alt}
              fill
              sizes="100vw"
              quality={88}
              priority
              style={{ objectPosition: HERO.pos }}
            />

            {/* The curtains: the same frame, clipped to the velvet at
                each edge and drawn outward. Copies of one photograph
                cannot mis-register against each other. */}
            <div className="blu-curtain blu-curtain-l" aria-hidden>
              <div className="blu-curtain-inner">
                <Image src={HERO.src} alt="" fill sizes="30vw" quality={88} priority style={{ objectPosition: HERO.pos }} />
              </div>
            </div>
            <div className="blu-curtain blu-curtain-r" aria-hidden>
              <div className="blu-curtain-inner">
                <Image src={HERO.src} alt="" fill sizes="30vw" quality={88} priority style={{ objectPosition: HERO.pos }} />
              </div>
            </div>

            {/* The glassware in front, moving a shade faster than the
                room, and only ever downward — the strip it uncovers is
                the identical photograph a few pixels higher. */}
            <div className="blu-fore" aria-hidden>
              <div className="blu-fore-inner">
                <Image src={HERO.src} alt="" fill sizes="100vw" quality={88} priority style={{ objectPosition: HERO.pos }} />
              </div>
            </div>
          </div>

          <div className="blu-wash" aria-hidden />

          <div className="blu-projection" aria-hidden>
            <span>Blue</span>
            <small>At the Gale South Beach</small>
          </div>

          <div className="blu-hero-shade" aria-hidden />
          <div className="blu-grain" aria-hidden />

          {/* The destination: real heading, real actions, in the first
              frame and the last. */}
          <div className="blu-hero-copy">
            <div className="blu-shell" data-blu-reveal>
              <Lines as="h1" className="blu-h1 max-w-[13ch]" lines={["The room", "is waiting."]} />
              <p className="blu-body mt-7 max-w-[42ch] text-[#F1EDE4]/80">
                Dinner, live music and the night that follows—beneath the Gale South Beach.
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <a href="#tonight" className="blu-btn blu-btn-primary blu-label">
                  View tonight
                </a>
                <a href="#reserve" className="blu-btn blu-label">
                  Reserve the experience
                </a>
              </div>
            </div>
          </div>

          <p className="blu-hero-eyebrow blu-label">Beneath the Gale · {VENUE.street}</p>
          <div className="blu-hero-exit" aria-hidden />
        </div>
      </section>

      {/* ========================= from blue hour to after hours === */}
      <section id="experiences" aria-labelledby="blu-band-title">
        <div className="blu-band">
          {EVENING_STATES.map((state, i) => (
            <div className="blu-band-panel" key={state.caption} data-blu-reveal>
              <Image
                src={state.src}
                alt={state.alt}
                fill
                sizes="(max-width: 760px) 100vw, 34vw"
                quality={86}
                style={{ objectPosition: state.pos }}
              />
              {i === 0 ? (
                <h2 id="blu-band-title" className="blu-band-head blu-display blu-h3">
                  From blue hour to after hours.
                </h2>
              ) : null}
              <p className="blu-band-cap blu-label text-[#F1EDE4]">{state.caption}</p>
              {/* The velvet parts a beat later on each panel, so three
                  stills read as one evening passing. */}
              <div className="blu-velvet" style={{ transitionDelay: `${i * 110}ms` }} aria-hidden />
            </div>
          ))}
        </div>
      </section>

      {/* ============================================ tonight, in one view === */}
      <section id="tonight" className="blu-light blu-section" data-blu-reveal>
        <div className="blu-shell">
          <div className="blu-bills">
            {TONIGHT.map((bill, i) => (
              <article className="blu-bill" key={bill.artist}>
                <div className="col-span-2 mb-8 min-h-[4.5rem]">
                  {bill.date ? (
                    <div className="flex items-baseline gap-4">
                      <span className="blu-num text-[clamp(2.4rem,3.6vw,4rem)]">{bill.date}</span>
                      <span className="blu-label !text-[rgba(3,8,18,0.72)]">
                        {bill.billing}
                        <span className="sr-only">, {bill.day}</span>
                      </span>
                    </div>
                  ) : i === 0 ? (
                    <Lines className="blu-h2" lines={["Tonight,", "in one view."]} />
                  ) : null}
                </div>

                <div className="blu-bill-shot">
                  <Image
                    src={bill.shot.src}
                    alt={bill.shot.alt}
                    fill
                    sizes="(max-width: 1000px) 42vw, 17vw"
                    quality={86}
                    style={{ objectPosition: bill.shot.pos }}
                  />
                </div>

                <div className="blu-bill-meta">
                  <h3 className="blu-display text-[clamp(0.95rem,1.05vw,1.15rem)] leading-[1.35]">
                    {bill.artist}
                  </h3>
                  <p className="blu-label mt-5 !text-[rgba(3,8,18,0.78)]">
                    <time>{bill.sets}</time>
                  </p>
                  <a href="#reserve" className="blu-link blu-label mt-6">
                    View details
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================== dinner, scored live === */}
      <section className="blu-act" aria-labelledby="blu-dinner-title">
        <div className="blu-act-img" data-blu-push>
          <Image
            src={DINNER.src}
            alt={DINNER.alt}
            fill
            sizes="100vw"
            quality={86}
            style={{ objectPosition: DINNER.pos }}
          />
        </div>
        <div className="blu-act-shade" aria-hidden />
        <div className="blu-act-copy blu-shell" data-blu-reveal>
          <Lines id="blu-dinner-title" className="blu-h2 max-w-[14ch]" lines={["Dinner,", "scored live."]} />
          <p className="blu-body mt-7 max-w-[26ch] text-[#F1EDE4]/85" data-blu-rise>
            One seating. Four courses. Two sets.
          </p>
          <a href="#reserve" className="blu-link blu-label mt-9 self-start" data-blu-rise>
            View menu
          </a>
        </div>
      </section>

      {/* A seam of light at the join. Dinner is warm and the turn is
          blue: the two frames back to back are the transformation. */}
      <div className="blu-seam" aria-hidden />

      {/* ======================================= and then the room turns === */}
      <section className="blu-act" aria-labelledby="blu-turn-title">
        <div className="blu-act-img" data-blu-push>
          <Image
            src={TURN.src}
            alt={TURN.alt}
            fill
            sizes="100vw"
            quality={86}
            style={{ objectPosition: TURN.pos }}
          />
        </div>
        <div className="blu-act-shade" aria-hidden />
        <div className="blu-act-copy blu-shell" data-blu-reveal>
          <Lines id="blu-turn-title" className="blu-h2 max-w-[11ch]" lines={["And then", "the room", "turns."]} />
          <p className="blu-body mt-7 max-w-[24ch] text-[#F1EDE4]/85" data-blu-rise>
            Second set. Lights lower. The dance floor opens.
          </p>
          <a href="#experiences" className="blu-link blu-label mt-9 self-start" data-blu-rise>
            Experiences
          </a>
        </div>
      </section>

      {/* ================================================ the blue list === */}
      {/* The page's pause: bright, wide, and lit by nothing but daylight. */}
      <section className="blu-powder blu-section" data-blu-reveal>
        <div className="blu-shell grid gap-10 lg:grid-cols-[minmax(240px,27%)_1fr] lg:gap-12">
          <div>
            <Lines className="blu-h2" lines={["The", "Blue List."]} />
            <p className="blu-body mt-7 max-w-[24ch]" data-blu-rise>
              Signature cocktails. Champagne. Refined bites.
            </p>
            <a href="#reserve" className="blu-link blu-label mt-8" data-blu-rise>
              View all
            </a>
          </div>

          <div>
            <div className="blu-list-shot">
              <Image
                src={BLUE_LIST_SHOT.src}
                alt={BLUE_LIST_SHOT.alt}
                fill
                sizes="(max-width: 900px) 100vw, 74vw"
                quality={88}
                style={{ objectPosition: BLUE_LIST_SHOT.pos }}
              />
            </div>
            <ul className="blu-list-labels">
              {BLUE_LIST.map((item) => (
                <li key={item.name} className="text-center">
                  <p className="blu-label !text-[rgba(3,8,18,0.8)]">{item.name}</p>
                  {item.note ? (
                    <p className="blu-label mt-1 !text-[rgba(3,8,18,0.45)]">{item.note}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============================================ your name, kept here === */}
      <section id="membership" className="blu-member" data-blu-reveal>
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(280px,32%)_1fr] lg:gap-16">
          <div className="py-[var(--gap)] pl-[var(--pad)] pr-[var(--pad)] lg:pr-0">
            <Lines className="blu-h2" lines={["Your name,", "kept here."]} />
            <p className="blu-body mt-7 max-w-[28ch]" data-blu-rise>
              Membership at Blue is by invitation and application.
            </p>
            <ul className="mt-10 space-y-3">
              {MEMBER_RIGHTS.map((right) => (
                <li key={right} className="blu-label text-[#F1EDE4]">
                  {right}
                </li>
              ))}
            </ul>
            <a href="#reserve" className="blu-btn blu-label mt-10">
              Request membership
            </a>
          </div>

          <div className="blu-member-shots pb-[var(--gap)] pl-[var(--pad)] pr-[var(--pad)] lg:py-[var(--gap)] lg:pl-0">
            {MEMBER_SHOTS.map((shot) => (
              <BlueFrame
                key={shot.src}
                shot={shot}
                className="blu-member-shot"
                sizes="(max-width: 760px) 50vw, 18vw"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ========================================== one room. any occasion === */}
      <section id="private" className="blu-light blu-section" data-blu-reveal>
        <div className="blu-shell grid gap-12 lg:grid-cols-[minmax(280px,32%)_1fr] lg:gap-14">
          <div>
            <Lines className="blu-h2" lines={["One room.", "Any occasion."]} />
            <p className="blu-body mt-7 max-w-[26ch]" data-blu-rise>
              Private events and buyouts for every kind of night.
            </p>
            <a href="#reserve" className="blu-link blu-label mt-8" data-blu-rise>
              Plan your event
            </a>
          </div>

          <div className="blu-events">
            {EVENTS.map((event) => (
              <figure key={event.title}>
                <BlueFrame
                  shot={event}
                  className="blu-event-shot"
                  sizes="(max-width: 900px) 46vw, 18vw"
                />
                <figcaption className="blu-label mt-4 text-center !text-[rgba(3,8,18,0.7)]">
                  {event.title}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================= below the surface === */}
      <section className="blu-light" data-blu-reveal>
        <div className="grid gap-10 lg:grid-cols-[minmax(260px,26%)_1fr] lg:gap-0">
          <div className="py-[var(--gap)] pl-[var(--pad)] pr-[var(--pad)] lg:pr-10">
            <Lines className="blu-h2" lines={["Below the", "surface."]} />
            <p className="blu-body mt-7 max-w-[24ch]" data-blu-rise>
              A discreet descent from the Gale into Blue.
            </p>
            <address className="blu-label mt-9 not-italic !text-[rgba(3,8,18,0.7)]">
              {VENUE.street}
              <br />
              Miami Beach
            </address>
            <a href="#reserve" className="blu-link blu-label mt-7" data-blu-rise>
              Directions
            </a>
          </div>

          <div className="blu-descent">
            {DESCENT.map((shot) => (
              <BlueFrame
                key={shot.src}
                shot={shot}
                className="blu-descent-shot"
                sizes="(max-width: 760px) 34vw, 25vw"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ================================================= the finale === */}
      <section id="reserve" className="blu-finale" aria-labelledby="blu-finale-title">
        <div className="blu-finale-img" data-blu-push>
          <Image
            src={FINALE.src}
            alt={FINALE.alt}
            fill
            sizes="100vw"
            quality={86}
            style={{ objectPosition: FINALE.pos }}
          />
        </div>
        <div className="blu-finale-shade" aria-hidden />
        <div className="blu-finale-copy blu-shell" data-blu-reveal>
          <p className="blu-label text-[#BEBAB2]">Tonight</p>
          <Lines id="blu-finale-title" className="blu-h2 mt-6 max-w-[18ch]" lines={["The first note", "is at nine."]} />
          <p className="blu-body mt-7 max-w-[38ch] text-[#F1EDE4]/85" data-blu-rise>
            Dinner is served at eight, once. Book the table, and the evening takes care
            of the rest.
          </p>
          <div className="mt-10 flex flex-wrap gap-4" data-blu-rise>
            <a href={VENUE.phoneHref} className="blu-btn blu-btn-primary blu-label">
              Reserve the experience
            </a>
            <a href="#tonight" className="blu-btn blu-label">
              See the calendar
            </a>
          </div>
        </div>
      </section>

      {/* ==================================================== footer === */}
      <footer className="bg-[#030812] pb-14 pt-20">
        <div className="blu-shell grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="blu-display text-[24px] tracking-[0.4em]">Blue</p>
            <p className="blu-label mt-3 text-[#BEBAB2]">At the Gale South Beach</p>
            <address className="blu-body mt-7 not-italic text-[0.92rem]">
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
              <ul className="mt-6">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#top"
                      className="blu-label flex min-h-[38px] items-center text-[#F1EDE4]/80 transition-colors hover:text-[#F1EDE4]"
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
            <Link href="/" className="blu-label mt-6 inline-flex min-h-[38px] items-center">
              The Pass
            </Link>
          </div>
        </div>

        <div className="blu-shell mt-14">
          <hr className="blu-rule" />
          <p className="blu-label mt-6 text-[#BEBAB2]">
            A concept room from The Pass Test Kitchen · Not a real venue
          </p>
        </div>
      </footer>
    </main>
  );
}
