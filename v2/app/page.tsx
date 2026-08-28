import { Footer, TopBar } from "@/components/chrome";
import { ScrollRail } from "@/components/rail";
import { ServiceClock } from "@/components/clock";
import { ServiceThread } from "@/components/thread";
import { Hero, S1Building, S2Equipment, S3Briefing } from "@/components/sections-a";
import { S4Response, S5Verified, S6Services, S7Flow } from "@/components/sections-b";
import { S8Team, S9Record, S10Close } from "@/components/sections-c";

/**
 * Orravan, in one continuous thread.
 *
 * The page is a single service incident told start to finish: a signal
 * enters the building at 6:42 AM and leaves as a verified, documented
 * record by 9:23. The thread is the rail on the left edge — filling as
 * the visitor descends, blue through the working sections and emerald
 * once the work is verified — and the motion inside each section is
 * typesetting and photography, not lines drawn over them.
 */
export default function Page() {
  return (
    <>
      <TopBar />
      <ScrollRail />
      <ServiceClock />
      <main className="relative">
        <ServiceThread />
        <Hero />
        <S1Building />
        <S2Equipment />
        <S3Briefing />
        <S4Response />
        <S5Verified />
        <S6Services />
        <S7Flow />
        <S8Team />
        <S9Record />
        <S10Close />
      </main>
      <Footer />
    </>
  );
}
