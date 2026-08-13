import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { FloatingReserve } from "@/components/site/FloatingReserve";
import { Hero } from "@/components/home/Hero";
import { TonightStrip } from "@/components/home/TonightStrip";
import { ChooseYourRebellion } from "@/components/home/ChooseYourRebellion";
import { FeatureTriptych } from "@/components/home/FeatureTriptych";
import { HappeningsRail } from "@/components/home/HappeningsRail";
import { Marquee } from "@/components/home/Marquee";
import { EditorialSplit } from "@/components/home/EditorialSplit";
import { PrivateEventsReveal } from "@/components/home/PrivateEventsReveal";
import { BottleShopFeature } from "@/components/home/BottleShopFeature";
import { SocialProof } from "@/components/home/SocialProof";
import { VisitBand } from "@/components/home/VisitBand";

/**
 * Homepage sequence — blueprint §07, "a homepage that behaves like a host."
 * 01 hero · 02 choose your Rebellion · 03 tonight/this week · 04 food + wine
 * editorial · 05 private events · 06 bottle shop · 07 social proof · 08 visit.
 */
export default function HomePage() {
  return (
    <>
      <Header overlay />
      <main id="main">
        <Hero />
        <TonightStrip />
        <ChooseYourRebellion />
        <FeatureTriptych />
        <HappeningsRail />
        <Marquee />
        <EditorialSplit />
        <PrivateEventsReveal />
        <BottleShopFeature />
        <SocialProof />
        <VisitBand />
      </main>
      <Footer />
      <FloatingReserve />
    </>
  );
}
