import { Footer, TopBar } from "@/components/chrome";
import { ScrollRail } from "@/components/rail";
import { ServiceClock } from "@/components/clock";
import { Hero, S1Building, S2Equipment, S3Briefing } from "@/components/sections-a";
import { S4Response, S5Verified, S6Services, S7Flow } from "@/components/sections-b";
import { S8Team, S9Record, S10Close } from "@/components/sections-c";

/**
 * Orravan, direction 2.
 *
 * Same client, same service story — a signal enters the building at
 * 6:42 AM and leaves as a verified, documented record by 9:23 — told
 * in a second visual direction. The sections below start from v2's
 * composition and get reshaped to the approved layout for this
 * direction.
 */
export default function Page() {
  return (
    <>
      <TopBar />
      <ScrollRail />
      <ServiceClock />
      <main className="relative">
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
