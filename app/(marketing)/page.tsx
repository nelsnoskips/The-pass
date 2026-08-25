import { Hero } from "@/components/marketing/Hero";
import { Disciplines } from "@/components/marketing/Disciplines";
import { DigitalExperiences } from "@/components/marketing/DigitalExperiences";
import { Packages } from "@/components/marketing/Packages";
import { TestKitchen } from "@/components/marketing/TestKitchen";
import { Faq } from "@/components/marketing/Faq";
import { PassStory } from "@/components/marketing/PassStory";
import { Consultation } from "@/components/marketing/Consultation";
import { FAQS } from "@/lib/faq";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Disciplines />
      <DigitalExperiences />
      <TestKitchen />
      <Packages />
      <PassStory />
      <Faq />
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
            // The profile that carries the studio's work in public. A
            // search engine only ties the account to the business if
            // the site claims it here.
            sameAs: ["https://www.instagram.com/thepass_madisonfour/"],
            // The studio is remote and national. Without this a search
            // engine has to infer the service area from an address it
            // does not have, and infers local.
            areaServed: { "@type": "Country", name: "United States" },
            brand: { "@type": "Brand", name: "The Pass by Madison Four" },
            slogan: "Restaurant websites, crafted.",
            description:
              "The Pass by Madison Four is a design studio for restaurants across the United States, building custom websites engineered to be found on Google and in AI answers and to turn lookers into guests.",
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
      <script
        type="application/ld+json"
        /* Generated from the same array the section renders, because
           Google requires the markup to match the visible copy and two
           hand-kept copies of nine answers drift the first time a price
           moves. */
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
      <script
        type="application/ld+json"
        /* The offers sit on the Organization above; this says what the
           service *is* and how far it reaches. Restaurant web design is
           a service with a geography, and that is the shape of the
           query. A studio that only claims to be an Organization is
           left to be inferred as local to an address it never gives. */
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Restaurant web design and development",
            serviceType: "Restaurant website design, development, SEO and AEO",
            description:
              "Custom restaurant websites designed and built from nothing, with search and AI-answer visibility, reservations and ordering wired in. Worked remotely with restaurants across the United States.",
            provider: {
              "@type": "Organization",
              name: "Madison Four",
              url: "https://madisonfour.com",
            },
            areaServed: { "@type": "Country", name: "United States" },
            availableChannel: {
              "@type": "ServiceChannel",
              serviceUrl: "https://madisonfour.com/#consultation",
            },
            audience: {
              "@type": "BusinessAudience",
              audienceType: "Restaurants, cafes, bars and hospitality groups",
            },
          }),
        }}
      />
    </>
  );
}
