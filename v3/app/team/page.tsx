import type { Metadata } from "next";
import { Footer, TopBar } from "@/components/chrome";
import { Careers, Org, TeamIntro } from "@/components/team-page";

export const metadata: Metadata = {
  title: "Meet the team — Orravan Mechanical",
  description:
    "Founded in 2014, a union shop of fifty across mechanical, retrofit, automation and the office. Meet the people behind the work.",
};

/**
 * Who we are: the people. The company history lives on the homepage
 * timeline; Orravan asked for it off this page on the 2 Oct call.
 */
export default function TeamPage() {
  return (
    <>
      <TopBar />
      <main>
        <TeamIntro />
        <Org />
        <Careers />
      </main>
      <Footer />
    </>
  );
}
