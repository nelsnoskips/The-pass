import { Footer, TopBar } from "@/components/chrome";
import { Entrance } from "@/components/entrance";
import { LessDashboard, OneView, Resolution, ToDecision } from "@/components/sections-a";
import { Difference, Industries, Record, Services, Team } from "@/components/sections-b";

/**
 * Orravan, direction 2 — "The building knows. Now you do."
 *
 * The page opens on the blue plate and enters on one short scroll: the
 * mark lifts away, the building and the facility leader separate into
 * depth planes, the headline lands and the navigation takes over. From
 * there it follows a single signal — Zone 4B running warm on 4/23 —
 * from detection through a plain-language recommendation, the people
 * who acted on it, verification, and the record that closes it.
 */
export default function Page() {
  return (
    <>
      <TopBar />
      <main>
        <Entrance />
        <OneView />
        <LessDashboard />
        <ToDecision />
        <Resolution />
        <Services />
        <Difference />
        <Team />
        <Industries />
        <Record />
      </main>
      <Footer />
    </>
  );
}
