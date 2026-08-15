import { LegalPage, LegalSection } from "@/components/marketing/LegalPage";

export const metadata = {
  title: "Terms of Service — Madison Four",
  description: "The terms that govern use of madisonfour.com and The Pass.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage label="Legal" title="Terms of Service" updated="August 15, 2026">
      <LegalSection heading="Agreement">
        <p>
          These terms govern your use of madisonfour.com and, where applicable,
          The Pass client platform. By using the site you accept them. Client
          engagements are governed first by the written agreement between
          Madison Four and the client; these terms fill in anything that
          agreement does not cover.
        </p>
      </LegalSection>

      <LegalSection heading="Our services">
        <p>
          Madison Four provides restaurant marketing services — strategy,
          digital experiences, search, media, and reporting through The Pass
          platform. Descriptions on this site are general; the scope of any
          engagement is defined in its written agreement.
        </p>
      </LegalSection>

      <LegalSection heading="Your use of the site">
        <p>
          You agree not to misuse the site — including attempting to access
          accounts or data that are not yours, probing or disrupting our
          systems, scraping at scale, or submitting forms with false or
          unlawful content.
        </p>
      </LegalSection>

      <LegalSection heading="Content and ownership">
        <p>
          The site, its design, text, photography, marks, and The Pass platform
          are owned by Madison Four or its licensors and are protected by
          intellectual property laws. You may not reproduce or use them beyond
          normal browsing without our written permission. Clients own their own
          data; our platform agreements spell out each party&rsquo;s rights in
          detail.
        </p>
      </LegalSection>

      <LegalSection heading="Platform demonstrations">
        <p>
          Publicly accessible demonstrations of The Pass show illustrative
          sample data, not live client information, and may change or be
          withdrawn at any time.
        </p>
      </LegalSection>

      <LegalSection heading="Disclaimers">
        <p>
          The site is provided &ldquo;as is.&rdquo; We work hard to keep it
          accurate and available but make no warranties about uninterrupted
          access or error-free content. Marketing outcomes described on this
          site reflect specific engagements; results vary and are never
          guaranteed.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        <p>
          To the fullest extent permitted by law, Madison Four is not liable
          for indirect, incidental, or consequential damages arising from use
          of the site. Liability connected to client engagements is addressed
          in the applicable written agreement.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p>
          These terms are governed by the laws of the State of California,
          without regard to conflict-of-law rules.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about these terms:{" "}
          <a className="text-[#4B1719] underline" href="mailto:hello@madisonfour.com">
            hello@madisonfour.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
