import { Hero } from "@/components/marketing/Hero";
import { Disciplines } from "@/components/marketing/Disciplines";
import { DigitalExperiences } from "@/components/marketing/DigitalExperiences";
import { PassStory } from "@/components/marketing/PassStory";
import { Consultation } from "@/components/marketing/Consultation";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Disciplines />
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
            slogan: "Restaurant websites, crafted.",
            description:
              "The Pass by Madison Four is a design studio for restaurants, building custom websites engineered to be found on Google and in AI answers and to turn lookers into guests.",
            knowsAbout: [
              "Restaurant web design",
              "Restaurant websites",
              "Web development",
              "SEO",
              "Answer engine optimization",
              "Hospitality digital experiences",
            ],
          }),
        }}
      />
    </>
  );
}
