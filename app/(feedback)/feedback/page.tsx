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
 * A strip ripped out of the page between two dark acts. The stock is the
 * photographed bone paper, so the tear reads as the same sheet the menu
 * card and the loyalty pass are printed on.
 */
function Tear({ tilt }: { tilt: number }) {
  return (
    <div aria-hidden className="fbk-tear-strip" style={{ transform: `rotate(${tilt}deg)` }}>
      {/* The fiber inside the sheet shows along both ripped edges. */}
      <div
        className="fbk-torn-tb fbk-tear-fiber absolute inset-0"
        style={{ transform: "scaleY(1.16)" }}
      />
      <div className="fbk-torn-tb fbk-stock absolute inset-0" />
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <>
      <Hero />
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
