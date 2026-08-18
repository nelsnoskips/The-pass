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
export default function FeedbackPage() {
  return (
    <>
      <Hero />
      <SignalSection />
      <div className="grid lg:grid-cols-2">
        <ChannelMenu />
        <Pedalboard />
      </div>
      <NowPlaying />
      <AllAges />
      <FindTheNoise />
    </>
  );
}
