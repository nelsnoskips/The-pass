import { Footer, TopBar } from "@/components/chrome";
import { Hero, S1Building, S2Equipment, S3Briefing } from "@/components/sections-a";
import { S4Response, S5Verified, S6Services, S7Flow } from "@/components/sections-b";
import { S8Team, S9Record, S10Close } from "@/components/sections-c";

/**
 * Orravan, in one continuous thread.
 *
 * The page is a single service incident told start to finish: a signal
 * enters the building at 6:42 AM and leaves as a verified, documented
 * record by 9:23. The blue line the visitor draws with their scroll is
 * that incident — it turns green the moment the work is verified, and
 * every section holds a piece of the same story, so the motion is the
 * message rather than decoration on top of it.
 */
export default function Page() {
  return (
    <>
      <TopBar />
      <main>
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
