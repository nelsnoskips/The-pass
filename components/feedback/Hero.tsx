"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  FEEDBACK,
  FEEDBACK_POINT,
  PRESSURE_MAX,
  STAGES,
  SURFACE,
  pressureForStage,
} from "@/lib/feedback";
import { DrawnBurger } from "./DrawnBurger";
import { Knob, PressureGauge } from "./Knob";
import { Plate } from "./Plate";
import { Wordmark } from "./Wordmark";
import { scrollToY } from "./SmoothScroll";
import { Waveform } from "./Waveform";
import { usePressure, useSound } from "./state";

/**
 * The hero: a layered stage that is pinned while a tall track is
 * scrolled through, and the position inside that track is the pressure.
 *
 *   1  griddle
 *   2  steam and heat
 *   3  the burger, transparent, being cooked
 *   4  the wordmark
 *   5  the panel: knob, gauge, frame strip, live CTA
 *
 * Three inputs move the same number and none of them is privileged:
 * scrolling (which on a phone is a swipe up), dragging the knob, and
 * clicking one of the five numbered frames. Whichever the visitor
 * reaches for, the scroll position is reconciled afterwards so the page
 * never disagrees with itself.
 */

/** How much scroll buys the full 0—10 sweep. */
const TRACK_VH = 320;

export function Hero() {
  const pressure = usePressure();
  const sound = useSound();
  const track = useRef<HTMLDivElement>(null);
  const stageEl = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const settling = useRef(0);
  const centre = useRef<HTMLDivElement>(null);

  /* ------------------------------------- scroll drives the cook --- */

  useEffect(() => {
    if (pressure.reduced) return;
    const node = track.current;
    const stage = stageEl.current;
    if (!node || !stage) return;

    let frame = 0;
    let queued = false;

    const read = () => {
      queued = false;
      const distance = node.offsetHeight - stage.offsetHeight;
      if (distance <= 0) return;
      const travelled = -node.getBoundingClientRect().top;
      const progress = Math.min(1, Math.max(0, travelled / distance));
      if (!dragging.current) pressure.set(progress * PRESSURE_MAX, "scroll");
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pressure]);

  /** Put the page where a given pressure lives, so scroll agrees again. */
  const seek = useCallback(
    (value: number) => {
      const node = track.current;
      const stage = stageEl.current;
      if (!node || !stage) return;
      const distance = node.offsetHeight - stage.offsetHeight;
      const top = node.offsetTop + (value / PRESSURE_MAX) * distance;
      scrollToY(top);
    },
    [],
  );

  const turn = useCallback(
    (value: number) => {
      dragging.current = true;
      window.clearTimeout(settling.current);
      pressure.set(value, "input");
    },
    [pressure],
  );

  /**
   * Letting go hands the value back to the scroll — but not instantly.
   * The page is still smooth-scrolling to the position that matches, and
   * if the scroll listener were live during that travel it would drag
   * the knob back down to wherever the page happened to be. So scroll
   * stays muted until the seek has landed, which is also what makes the
   * arrow keys able to reach 10 one press at a time.
   */
  const release = useCallback(
    (value: number) => {
      dragging.current = true;
      seek(value);
      window.clearTimeout(settling.current);
      settling.current = window.setTimeout(() => {
        dragging.current = false;
      }, 800);
    },
    [seek],
  );

  /* ----------------------------------------- the loud moment ----- */

  useEffect(() => {
    if (!pressure.maxed || pressure.reduced) return;
    sound.swell();
    // The blow-out is one class for 170ms. Held on the node rather than
    // in state, so the loudest moment on the page does not also cause
    // the largest React render on the page.
    const node = centre.current;
    node?.classList.add("fbk-blowout");
    const id = window.setTimeout(() => node?.classList.remove("fbk-blowout"), 170);
    return () => {
      window.clearTimeout(id);
      node?.classList.remove("fbk-blowout");
    };
  }, [pressure.maxed, pressure.reduced, sound]);

  /* The smash. The photographs carry the press itself, so all this has
     to do is put the thump under the frame where the patty lands — once,
     the first time the knob crosses into it. */
  const smashed = useRef(false);
  useEffect(
    () =>
      pressure.subscribe((p) => {
        const landed = p >= STAGES[1].at;
        if (landed && !smashed.current) sound.thump();
        smashed.current = landed;
      }),
    [pressure, sound],
  );

  return (
    <div ref={track} className="fbk-track" style={{ height: `${TRACK_VH}vh` }}>
      <div ref={stageEl} className="fbk-stage fbk-griddle">
        {/* 1 — the cook, full bleed.

            The five frames are photographs of the same flat top, each
            carrying its own griddle, light and smoke, so the cook is the
            stage rather than a cut-out floating over one. They cut
            rather than cross-fade: `key` forces a fresh element, which
            is what fires the change-of-track. */}
        <CookFrame />

        {/* 2 — heat and steam, keyed to pressure by the shared level
            variable. These sit over the photograph and open up as the
            knob comes round, so the frames read hotter than they were
            shot without any of them being re-touched. */}
        <div className="fbk-heat" />
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="fbk-steam fbk-steam-a absolute left-[34%] top-[42%] h-[46%] w-[34%]" />
          <div className="fbk-steam fbk-steam-b absolute left-[52%] top-[38%] h-[52%] w-[30%]" />
        </div>

        {/* 3 — the scrim. The panel and the wordmark now sit over a
            photograph rather than over near-black, and type over
            photography is only ever as good as what is under it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,9,8,0.88)_0%,rgba(11,9,8,0.34)_32%,rgba(11,9,8,0.3)_62%,rgba(11,9,8,0.9)_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(11,9,8,0.9)_0%,rgba(11,9,8,0.25)_26%,transparent_50%)] lg:block"
        />

        <div className="relative z-10 mx-auto grid h-full max-w-[1400px] grid-rows-[1fr_auto] px-5 pb-20 pt-28 sm:px-8 lg:grid-cols-[240px_1fr_150px] lg:grid-rows-1 lg:gap-8 lg:pb-16 lg:pt-24">
          {/* ------------------------------------------ left panel --- */}
          <div className="hidden flex-col justify-center gap-7 lg:flex">
            <div>
              <h1 className="fbk-display text-[46px] leading-[0.86]">
                {FEEDBACK.motto}
              </h1>
              <p className="fbk-label mt-3 whitespace-nowrap text-[var(--fb-amber)]">
                Griddle {FEEDBACK.griddleTemp} · Channel live
              </p>
            </div>

            <div>
              <p className="fbk-display text-[22px] tracking-wide">Turn it up</p>
              <Knob onChange={turn} onCommit={release} className="mt-3 w-[176px]" />
            </div>

            <div>
              <p className="fbk-display text-[18px] tracking-wide">Apply pressure</p>
              <PressureGauge className="mt-1 w-[176px]" />
            </div>
          </div>

          {/* --------------------------------------- centre column --- */}
          {/* The photograph behind is the subject, so this column holds
              only what has to be read over it: which frame the knob is
              on, and the order once it is earned. */}
          <div className="flex flex-col items-center justify-between py-1">
            {/* The mark sits in the top of the frame and the burger runs
                under it, which is the poster this room is built from. */}
            <div ref={centre} className="w-full max-w-[900px]">
              <Wordmark trace className="w-full text-[var(--fb-bone)]" title="FEEDBACK" />
            </div>

            {/* The photograph behind is the subject, so the rest of this
                column holds only what has to be read over it: which
                frame the knob is on, and the order once it is earned. */}
            <div className="flex w-full flex-col items-center gap-2">
              <Resolve />
              <HeroCta />
            </div>
          </div>

          {/* ------------------------------------- the frame strip --- */}
          <div className="lg:contents">
            <PhonePanel />
            <FrameStrip onSeek={(i) => seek(pressureForStage(i))} />
          </div>
        </div>

        {/* The signal, running under the whole stage. */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-0 h-12 opacity-70 sm:h-16">
          <Waveform
            fromPressure
            personality="aggressive"
            className="h-full w-full text-[var(--fb-red)]"
            cycles={26}
            height={64}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ the cook --- */

/**
 * The frame the knob is currently on, full bleed.
 *
 * Everything up to the last frame is a photograph of the flat top. The
 * last frame *resolves*: the cook stops, the stage cuts back to the bare
 * griddle, and the finished burger is presented isolated in the centre —
 * which is both the payoff and the thing that becomes the order button.
 */
function CookFrame() {
  const pressure = usePressure();
  const stage = STAGES[pressure.stage];
  const resolved = stage.resolves === true;

  return (
    <div key={stage.n} className="fbk-track-change absolute inset-0">
      <Plate
        src={resolved ? SURFACE.griddle : stage.image}
        alt={resolved ? "The griddle" : `${stage.name} — ${stage.caption}`}
        className="absolute inset-0"
        imgClassName="fbk-push h-full w-full object-cover"
        fallback={<div className="fbk-griddle h-full w-full" />}
      />
    </div>
  );
}

/**
 * The resolve: the finished burger, isolated, once the cook is done.
 *
 * Before that it is the frame's caption that holds this space — the
 * photograph behind is already the burger, and putting a second one on
 * top of it would only read as two burgers.
 */
function Resolve() {
  const pressure = usePressure();
  const stage = STAGES[pressure.stage];
  const resolved = stage.resolves === true;

  return (
    <div className="relative mt-2 flex w-full max-w-[680px] flex-col items-center">
      {resolved && (
        <div className="fbk-track-change fbk-push w-full">
          <Plate
            src={SURFACE.hero}
            alt="The Feedback: double smash, American, onions, pickles, house sauce"
            className="w-full"
            imgClassName="mx-auto max-h-[44svh] w-full object-contain drop-shadow-[0_36px_48px_rgba(0,0,0,0.8)]"
            fallback={
              <DrawnBurger stage={4} progress={1} className="mx-auto max-h-[44svh] w-full" />
            }
          />
        </div>
      )}
      <p className="fbk-label mt-2 text-center text-[rgba(232,225,211,0.6)]">
        {String(stage.n).padStart(2, "0")} · {stage.name}
      </p>
    </div>
  );
}

/**
 * The order button, handed over at maximum feedback. It is real markup
 * from the first paint — the reveal is presentational — and the nav
 * carries a permanent ORDER besides, so nobody is ever more than one tap
 * from the register regardless of where the knob sits.
 */
function HeroCta() {
  const pressure = usePressure();
  const on = pressure.maxed || pressure.reduced;

  return (
    <div className="text-center">
      <div className="fbk-reveal" data-on={on}>
        <a href="/feedback/order" className="fbk-btn text-[13px]">
          Order now
        </a>
        <p className="fbk-label mt-2 text-[rgba(232,225,211,0.55)]">
          Smash burgers · Fries · Shakes
        </p>
      </div>
      {!on && (
        <p className="fbk-label text-[rgba(232,225,211,0.45)]">
          Turn it up — past{" "}
          <span className="fbk-mono">{FEEDBACK_POINT}</span> of {PRESSURE_MAX}{" "}
          the order opens
        </p>
      )}
    </div>
  );
}

/**
 * On a phone there is no knob: the scroll *is* the knob, and a swipe up
 * applies pressure. So the panel reduces to the readout and the meter,
 * which is the part that tells the visitor the page is listening.
 */
function PhonePanel() {
  const pressure = usePressure();
  const readout = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      pressure.subscribe((p) => {
        if (readout.current) readout.current.textContent = p.toFixed(1);
      }),
    [pressure],
  );

  return (
    <div className="flex items-center justify-between gap-4 lg:hidden">
      <p className="fbk-label text-[rgba(232,225,211,0.55)]">
        Swipe up to apply pressure
      </p>
      <p className="fbk-label flex items-baseline gap-1.5 text-[rgba(232,225,211,0.5)]">
        <span ref={readout} className="fbk-mono text-[15px] text-[var(--fb-bone)]">
          0.0
        </span>
        / 10
      </p>
    </div>
  );
}

/**
 * Five numbered frames down the right edge — the same still strip in
 * the comp, made functional. Clicking one scrubs the cook to that
 * frame, so anyone who would rather jump than drag can.
 */
function FrameStrip({ onSeek }: { onSeek: (index: number) => void }) {
  const pressure = usePressure();

  return (
    <div className="mt-4 flex items-end justify-center gap-2 lg:mt-0 lg:flex-col lg:justify-center">
      {STAGES.map((stage, i) => (
        <button
          key={stage.n}
          type="button"
          onClick={() => onSeek(i)}
          data-active={pressure.stage === i}
          className="fbk-frame h-[54px] w-[54px] shrink-0 overflow-hidden lg:h-[62px] lg:w-full"
          aria-label={`Frame ${stage.n}: ${stage.name}`}
          aria-current={pressure.stage === i}
        >
          <Plate
            src={stage.image}
            alt=""
            className="h-full w-full"
            imgClassName="h-full w-full object-cover"
            fallback={
              <DrawnBurger stage={i} progress={1} className="h-full w-full" />
            }
          />
          <span className="fbk-mono absolute left-1 top-0.5 text-[10px] text-[rgba(232,225,211,0.75)]">
            {stage.n}
          </span>
        </button>
      ))}
    </div>
  );
}
