import { Hero } from "@/components/marketing/Hero";
import { Disciplines } from "@/components/marketing/Disciplines";
import { DigitalExperiences } from "@/components/marketing/DigitalExperiences";
import { Packages } from "@/components/marketing/Packages";
import { PassStory } from "@/components/marketing/PassStory";
import { Consultation } from "@/components/marketing/Consultation";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Disciplines />
      <DigitalExperiences />
      <Packages />
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
            makesOffer: [
              {
                "@type": "Offer",
                name: "The Opening",
                description:
                  "A complete custom restaurant website, designed and built from nothing, with full SEO and AEO setup included.",
                priceSpecification: {
                  "@type": "PriceSpecification",
                  minPrice: 4000,
                  priceCurrency: "USD",
                },
              },
              {
                "@type": "Offer",
                name: "The Refresh",
                description:
                  "A full redesign of an existing restaurant website on a custom foundation, with full SEO and AEO setup included.",
                priceSpecification: {
                  "@type": "PriceSpecification",
                  minPrice: 3000,
                  priceCurrency: "USD",
                },
              },
              {
                "@type": "Offer",
                name: "The Residency",
                description:
                  "Ongoing care for restaurant websites: hosting, updates, and continuous SEO and AI-visibility tuning, billed monthly.",
                priceSpecification: {
                  "@type": "UnitPriceSpecification",
                  minPrice: 900,
                  priceCurrency: "USD",
                  unitText: "month",
                },
              },
            ],
          }),
        }}
      />
    </>
  );
}
