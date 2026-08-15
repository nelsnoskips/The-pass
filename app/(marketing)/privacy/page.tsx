import { LegalPage, LegalSection } from "@/components/marketing/LegalPage";

export const metadata = {
  title: "Privacy Policy — Madison Four",
  description: "How Madison Four collects, uses, and protects your information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage label="Legal" title="Privacy Policy" updated="August 15, 2026">
      <LegalSection heading="Who we are">
        <p>
          Madison Four (&ldquo;we,&rdquo; &ldquo;us&rdquo;) is a restaurant
          growth agency. This policy describes how we handle information
          collected through madisonfour.com and in the course of providing our
          services. Questions are welcome at{" "}
          <a className="text-[#4B1719] underline" href="mailto:hello@madisonfour.com">
            hello@madisonfour.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What we collect">
        <p>
          <strong>Consultation requests.</strong> When you submit the form on
          this site, we receive the details you provide: your name, restaurant,
          number of locations, email address, and message.
        </p>
        <p>
          <strong>Correspondence.</strong> If you email us, we keep the
          correspondence and your contact details to respond and maintain the
          relationship.
        </p>
        <p>
          <strong>Technical basics.</strong> Our hosting provider records
          standard server logs (IP address, browser type, pages requested) to
          operate and secure the site. We do not run advertising trackers on
          this site.
        </p>
      </LegalSection>

      <LegalSection heading="How we use it">
        <p>
          To respond to your inquiry, provide and improve our services,
          maintain client relationships, and meet legal obligations. We do not
          sell your personal information, and we do not share it with third
          parties for their own marketing.
        </p>
      </LegalSection>

      <LegalSection heading="Service providers">
        <p>
          We rely on a small set of processors to run our business: Netlify
          (website hosting and form handling) and Google Workspace (email).
          Each processes data on our behalf under its own security and privacy
          commitments.
        </p>
      </LegalSection>

      <LegalSection heading="Cookies">
        <p>
          The public site uses no advertising or cross-site tracking cookies.
          The client platform (The Pass) uses functional cookies strictly to
          operate the product — for example, keeping you signed in.
        </p>
      </LegalSection>

      <LegalSection heading="Retention and your choices">
        <p>
          We keep inquiry and client information for as long as needed to serve
          you and meet our obligations, then delete it. You may request a copy
          of the personal information we hold about you, or ask us to correct
          or delete it, by emailing{" "}
          <a className="text-[#4B1719] underline" href="mailto:hello@madisonfour.com">
            hello@madisonfour.com
          </a>
          . We respond to every request.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>
          Our site and services are for businesses and are not directed to
          children under 13. We do not knowingly collect information from
          children.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          If this policy changes, we will post the updated version here with a
          new &ldquo;last updated&rdquo; date. Material changes affecting
          existing clients will be communicated directly.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
