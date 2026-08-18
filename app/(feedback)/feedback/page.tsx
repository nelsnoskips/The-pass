import { AllAges } from "@/components/feedback/AllAges";
import { ChannelMenu } from "@/components/feedback/ChannelMenu";
import { FindTheNoise } from "@/components/feedback/FindTheNoise";
import { Hero } from "@/components/feedback/Hero";
import { NowPlaying } from "@/components/feedback/NowPlaying";
import { Pedalboard } from "@/components/feedback/Pedalboard";
import { SignalSection } from "@/components/feedback/SignalSection";

/**
 * FEEDBACK, in seven numbered sections.
 *
 * The page has a rhythm rather than a feature list: it opens quiet,
 * hands the visitor a knob and lets them cook the burger with it, then
 * stays restrained through the set list and the release so that the two
 * loud moments — maximum feedback in the hero, and the pedal board
 * changing the room's signal — actually land.
 */
/**
 * The hero's bottom edge, ripped.
 *
 * A photographed tear — charcoal stock torn across its full width, the
 * fiber flaring along the rip — laid over the boundary so the hero
 * reads as a poster torn off the page, with section 02's paper showing
 * beneath. The gradient melts the strip's body into the hero's black,
 * so only the tear itself reads as new information.
 */
function PhotoTear() {
  return (
    <div aria-hidden className="pointer-events-none relative z-[6] -mb-6 -mt-14 h-24 sm:-mb-8 sm:-mt-20 sm:h-32 lg:h-36">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/feedback/tear-edge.png"
        alt=""
        className="h-full w-full select-none object-fill"
        loading="lazy"
        decoding="async"
      />
      <div
        className="absolute inset-x-0 top-0 h-[55%] bg-gradient-to-b from-[#0b0908] via-[#0b0908]/85 to-transparent"
      />
    </div>
  );
}

/**
 * A strip ripped out of the page between two dark acts. The stock is the
 * photographed bone paper, so the tear reads as the same sheet the menu
 * card and the loyalty pass are printed on.
 */
function Tear({ tilt }: { tilt: number }) {
  return (
    <div aria-hidden className="fbk-tear-strip" style={{ transform: `rotate(${tilt}deg)` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/feedback/tear-strip-bone.png"
        alt=""
        className="h-full w-full select-none object-fill"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <>
      <Hero />
      <PhotoTear />
      <SignalSection />
      <Tear tilt={-0.4} />
      <div className="grid lg:grid-cols-2">
        <ChannelMenu />
        <Pedalboard />
      </div>
      <Tear tilt={0.4} />
      <div className="grid lg:grid-cols-2">
        <NowPlaying />
        <AllAges />
      </div>
      <FindTheNoise />
    </>
  );
}
