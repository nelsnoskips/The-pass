import type { Metadata } from "next";
import { Footer, TopBar } from "@/components/chrome";
import { Timeline } from "@/components/timeline";
import { Careers, Org, TeamIntro } from "@/components/team-page";

export const metadata: Metadata = {
  title: "Meet the team — Orravan Mechanical",
  description:
    "Founded in 2014, a union shop of fifty across mechanical, automation, service and operations. The people behind the work, and the ten years that built them.",
};

/**
 * Who we are: the history, then the people.
 *
 * The order is the argument. Orravan's positioning is senior-level
 * service since 2014, so the ten years come first and the roster reads
 * as what those years produced — rather than a staff list with a date
 * at the bottom.
 */
export default function TeamPage() {
  return (
    <>
      <TopBar />
      <main>
        <Timeline />
        <TeamIntro />
        <Org />
        <Careers />
      </main>
      <Footer />
    </>
  );
}
