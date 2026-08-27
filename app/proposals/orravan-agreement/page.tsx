import type { Metadata } from "next";
import "../proposal.css";
import { SignBlock } from "./SignBlock";

/**
 * The scope & agreement for Orravan, hosted like the proposal so Alex
 * gets a link, not an attachment. Terms mirror the accepted proposal
 * exactly ($4,000 · $2,000/$2,000 · $300/mo care); the page prints
 * cleanly for signature. Three revision rounds included, $125 per
 * round after — set with Nelson on 26 Aug 2026. Scope covers all nine
 * live pages found in the 27 Aug audit of orravan.ai, held at $4,000.
 */
const CLIENT = {
  company: "Orravan Mechanical",
  date: "August 2026",
};

export const metadata: Metadata = {
  title: "Project Scope & Agreement — Orravan Mechanical | The Pass by Madison Four",
  description: "The scope, terms, and schedule for the Orravan Mechanical website redesign.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/proposals/orravan-agreement" },
};

function SectionHead({ n, title }: { n: string; title: string }) {
  return (
    <div className="orv-section-head" style={{ marginTop: "3rem" }}>
      <span className="orv-label">{n}</span>
      <h2 style={{ fontSize: 22, margin: 0 }}>{title}</h2>
      <span className="orv-hr" />
    </div>
  );
}

export default function OrravanAgreement() {
  return (
    <div className="orv-wrap">
      <header className="orv-masthead">
        <div className="orv-brandmark">
          <svg viewBox="0 0 34 30" width="30" height="27" aria-hidden="true">
            <path d="M2 15 V2 H32 V15" fill="none" stroke="#b79a68" strokeWidth="2.3" strokeLinejoin="round" strokeLinecap="round"/>
            <circle cx="6.4" cy="23.5" r="1.9" fill="#b79a68"/>
            <circle cx="13" cy="23.5" r="1.9" fill="#b79a68"/>
            <circle cx="19.6" cy="23.5" r="1.9" fill="#b79a68"/>
            <circle cx="26.2" cy="23.5" r="1.9" fill="#b79a68"/>
          </svg>
          <div>
            <div className="orv-name">The Pass</div>
            <div className="orv-sub">by Madison Four</div>
          </div>
        </div>
        <div className="orv-meta">
          <div className="orv-row">
            <span className="orv-label">Prepared for</span>
            {CLIENT.company}
          </div>
          <div className="orv-row">
            <span className="orv-label">Date</span>
            {CLIENT.date}
          </div>
        </div>
      </header>

      <section className="orv-intro" style={{ marginTop: 0 }}>
        <p className="orv-label" style={{ color: "var(--wine)" }}>Project Scope &amp; Agreement</p>
        <h1>The website redesign,<br />in writing</h1>
        <div className="orv-prose" style={{ marginTop: "1.4rem" }}>
          <p>
            This Project Scope &amp; Agreement (the &ldquo;Agreement&rdquo;) is made between{" "}
            <strong>Nelson Schnebelen, an individual doing business as Madison Four</strong>{" "}
            (&ldquo;Designer&rdquo;), of Torrance, California, and{" "}
            <strong>Orravan Mechanical</strong> (&ldquo;Client&rdquo;). It covers everything in
            the proposal, with the terms both sides can point to later. Designer and Client
            agree as follows.
          </p>
        </div>
      </section>

      <SectionHead n="01" title="Project and scope" />
      <div className="orv-prose">
        <p>Designer will redesign, design, and develop Client&rsquo;s website (the &ldquo;Project&rdquo;), consisting of:</p>
        <p><strong>Nine pages</strong> &mdash; Home, About, Team, Services, Building Automation Systems, HVAC Systems, Support, Contact (with the request-a-quote form folded in), and Service Portal. This covers every live page on the current site; pages beyond these are $250 each, one time, by written request.</p>
        <p><strong>Redirects</strong> &mdash; every current URL (including /request-quote) will permanently redirect to its new home, so existing search standing carries over. The current Inventory page is a &ldquo;coming soon&rdquo; placeholder and is not part of the redesign &mdash; it will redirect to Services, and a future product catalog, if Client builds one, is a separate project. Client will confirm whether the Account page can be retired or pointed at the Service Portal.</p>
        <p><strong>Three integrations</strong> &mdash; connection of Client&rsquo;s existing booking, payments, and ServiceTrade services into the new website. Each integration connects a service Client already operates; new service subscriptions or accounts are Client&rsquo;s responsibility.</p>
        <p><strong>Three design concepts</strong> &mdash; Designer will present three initial design concepts (homepage-level compositions). Client selects one, which Designer develops into the full website. Additional concepts beyond three are $500 each. Unselected concepts remain Designer&rsquo;s property (Section 6).</p>
        <p><strong>Three rounds of revisions</strong> to the selected concept are included. Additional revision rounds are $125 per round. Requests outside the scope above proceed by written change order agreed before the work begins.</p>
        <p>The Project does not include: copywriting beyond light editing of Client-supplied text; photography or videography (Client supplies all photography, including headshots); paid advertising or ongoing marketing services; or any guarantee of search-engine rankings, traffic, or revenue.</p>
      </div>

      <SectionHead n="02" title="Fees and payment" />
      <div className="orv-prose">
        <p>The total fee for the Project is <strong>$4,000</strong>, comprising $2,500 for design and development of the nine pages and $500 for each of the three integrations.</p>
        <p><strong>$2,000 is due on signing.</strong> Work begins when this deposit is received. The deposit is non-refundable once concept work has been presented, except as provided in Section 9.</p>
        <p><strong>$2,000 is due at launch</strong>, payable when the completed website is made live or delivered for Client hosting, whichever occurs first.</p>
        <p>Invoices are due within 15 days. Overdue amounts accrue interest at 1.5% per month, and Designer may suspend work and withhold launch or delivery of files while any amount is overdue.</p>
      </div>

      <SectionHead n="03" title="Timeline and client responsibilities" />
      <div className="orv-prose">
        <p>Designer&rsquo;s target timeline is <strong>three to four weeks to launch</strong>, measured from the later of receipt of the deposit and receipt of Client&rsquo;s content and photography.</p>
        <p>Designer&rsquo;s ability to meet all schedules depends entirely on Client&rsquo;s prompt delivery of content, materials, and written approvals. Delays caused by Client extend the timeline day-for-day and are not a breach by Designer.</p>
        <p><strong>Deemed approval</strong> &mdash; if Client provides no written feedback on a presented deliverable within five business days, the deliverable is deemed accepted.</p>
        <p><strong>Dormancy</strong> &mdash; if Client is unresponsive for ten or more business days, the Project pauses; resuming requires a $250 reactivation fee and rescheduling at Designer&rsquo;s availability. If Client remains unresponsive for ninety days, the Project is deemed terminated by abandonment and fees for all work performed become due.</p>
      </div>

      <SectionHead n="04" title="Client content" />
      <div className="orv-prose">
        <p>Client warrants that it owns or has all necessary rights to all content it supplies &mdash; including text, logos, photography, headshots, and any AI-generated material Client provides &mdash; and that such content is accurate and lawful. Client will indemnify and hold Designer harmless from claims arising out of Client-supplied content.</p>
      </div>

      <SectionHead n="05" title="AI tools" />
      <div className="orv-prose">
        <p>Designer may use AI-assisted tools in the ordinary course of design and development. Designer will not submit Client&rsquo;s confidential information to public AI models. Client acknowledges that raw, purely AI-generated material may not be eligible for copyright protection; the assignment in Section 6 applies to all protectable elements of the Final Deliverables.</p>
      </div>

      <SectionHead n="06" title="Intellectual property" />
      <div className="orv-prose">
        <p>Upon Designer&rsquo;s receipt of payment in full, Designer assigns to Client all of Designer&rsquo;s rights in the final delivered website design and the site-specific code and content created for the Project (the &ldquo;Final Deliverables&rdquo;). Client&rsquo;s ownership of the Final Deliverables is expressly conditioned on payment in full.</p>
        <p>All preliminary works &mdash; including the two unselected design concepts, sketches, drafts, and alternate designs &mdash; remain the exclusive property of Designer. Third-party and open-source components remain governed by their own licenses.</p>
        <p>Designer may display the completed work in Designer&rsquo;s portfolio and marketing and be credited as its author. Client will own and hold the account credentials for its own domain and hosting.</p>
      </div>

      <SectionHead n="07" title="Launch, warranty, and support" />
      <div className="orv-prose">
        <p>For thirty days after launch, Designer will fix defects in the delivered work at no charge. This warranty does not cover enhancements or new features, issues caused by Client&rsquo;s changes, or failures of third-party services. After this period, support is provided under the Care Plan (Section 8) or by written change order.</p>
        <p>The delivered website will function correctly on the current and immediately previous major releases of Chrome, Safari, Edge, and Firefox, and will be responsive on modern mobile devices.</p>
      </div>

      <SectionHead n="08" title="Care plan (optional)" />
      <div className="orv-prose">
        <p>Client may subscribe to ongoing care at <strong>$300 per month</strong>, month to month, beginning at launch. Care covers hosting, security, content and page updates, ongoing search work, and maintenance of the three integrations. Either party may cancel the Care Plan with thirty days&rsquo; written notice. The Care Plan is separate from the Project; Client&rsquo;s ownership of the website does not depend on subscribing.</p>
      </div>

      <SectionHead n="09" title="Termination" />
      <div className="orv-prose">
        <p>Client may terminate the Project at any time by written notice. On termination by Client, Client will pay for all work completed through the termination date plus twenty-five percent of the remaining unbilled balance, and in no event less than the deposit. If Client rejects all three design concepts, Client may terminate and owes only the deposit.</p>
        <p>Designer may terminate for Client&rsquo;s material breach, including nonpayment, if the breach is not cured within ten days of written notice.</p>
      </div>

      <SectionHead n="10" title="Limitation of liability" />
      <div className="orv-prose">
        <p style={{ textTransform: "uppercase", fontSize: "13px", letterSpacing: ".01em" }}>
          Designer&rsquo;s total liability under this Agreement shall not exceed the fees actually paid by Client. Neither party shall be liable for any indirect, incidental, special, consequential, or punitive damages, including lost profits. Except as expressly stated in this Agreement, the work is provided without warranties of any kind, and Designer makes no guarantee of search-engine rankings, website traffic, or business results.
        </p>
      </div>

      <SectionHead n="11" title="General" />
      <div className="orv-prose">
        <p>Designer is an independent contractor, not an employee, and this is not a work-for-hire arrangement except as expressly assigned in Section 6. Neither party is liable for delay caused by events beyond its reasonable control. This Agreement is the entire agreement between the parties regarding the Project and may be amended only in writing. If any provision is unenforceable, the remainder stands. This Agreement is governed by California law; venue is Los Angeles County. The parties will attempt to mediate any dispute before litigation, and the prevailing party in any action is entitled to reasonable attorneys&rsquo; fees. This Agreement may be signed in counterparts, including by electronic signature &mdash; a signed PDF or a written email confirmation of acceptance from an authorized representative counts.</p>
      </div>

      <div style={{ marginTop: "3.5rem", display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "3rem", alignItems: "start" }}>
        <div>
          <div style={{ borderTop: "1px solid var(--ink)", paddingTop: ".6rem", marginTop: ".4rem" }}>
            <strong>Nelson Schnebelen</strong>
            <div style={{ fontSize: 13, color: "var(--ink-soft)" }}>an individual dba Madison Four</div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: ".5rem" }}>
              Countersigns by email on receipt of Client&rsquo;s signature.
            </div>
          </div>
        </div>
        <SignBlock slug="orravan-agreement" />
      </div>

      <div className="orv-sign" style={{ marginTop: "3rem" }}>
        <div className="orv-contact">
          Questions before signing? <a href="mailto:nelson.schnebelen@gmail.com">Email Nelson</a> &mdash; happy to walk through any line.
        </div>
      </div>
    </div>
  );
}
