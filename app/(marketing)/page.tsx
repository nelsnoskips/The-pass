import { Hero } from "@/components/marketing/Hero";
import { Disciplines } from "@/components/marketing/Disciplines";
import { PlatformPreview } from "@/components/marketing/PlatformPreview";
import { Formats } from "@/components/marketing/Formats";
import { DigitalExperiences } from "@/components/marketing/DigitalExperiences";
import { PassStory } from "@/components/marketing/PassStory";
import { Consultation } from "@/components/marketing/Consultation";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Disciplines />
      <PlatformPreview />
      <Formats />
      <DigitalExperiences />
      <PassStory />
      <Consultation />
      <script
        type="application/ld+json"
        // Organization schema: practicing the structured-data discipline we sell.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Madison Four",
            url: "https://madisonfour.com",
            email: "hello@madisonfour.com",
            brand: { "@type": "Brand", name: "The Pass by Madison Four" },
            slogan: "Restaurant growth, conducted.",
            description:
              "Madison Four connects restaurant strategy, websites, search, media, and conversion into one complete guest experience — powered by The Pass, its proprietary reporting and restaurant intelligence platform.",
            knowsAbout: [
              "Restaurant marketing",
              "SEO",
              "Answer engine optimization",
              "Google Ads",
              "Meta Ads",
              "Restaurant websites",
            ],
          }),
        }}
      />
    </>
  );
}
