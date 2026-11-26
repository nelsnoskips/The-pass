import { Footer, TopBar } from "@/components/chrome";
import { Entrance } from "@/components/entrance";
import { Pillars } from "@/components/sections-a";
import { Difference, Industries, Services, Controls } from "@/components/sections-b";
import { Story } from "@/components/story";
import { Faq } from "@/components/faq";
import { Assist } from "@/components/assist";

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
      <TopBar waits />
      <main>
        <Entrance />
        {/* A beat before the page starts covering the hero: transparent,
            so the pinned hero simply holds while this scrolls past. */}
        <div className="o-hold" aria-hidden />
        {/* The decade comes first. The reposition is "senior level
            service since 2014", so the proof of the "since 2014" lands
            before the pillars, and before any product story does. */}
        <Story />
        {/* The timeline no longer ends on a hard cut from dark to ivory:
            its blue fades into the pillars' paper (Alex, 25 Nov). */}
        <div className="o-st-fade" aria-hidden />
        <Pillars />
        {/* Round 3 (Alex, 25 Nov) took the homepage down to a minimal
            run: the portal story (One view / Less dashboard / From signal
            to decision), "Build what buildings become" and "Client record.
            Complete. Verified." are gone. The components are kept in
            sections-a/-b so any of them can move to its own page. */}
        <Services />
        <Controls />
        <Difference />
        <Industries />
        <Faq />
      </main>
      <Footer />
      <Assist />
    </>
  );
}
