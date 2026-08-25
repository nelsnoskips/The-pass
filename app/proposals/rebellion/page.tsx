import type { Metadata } from "next";
import "../proposal.css";

/**
 * A one-off quote, not a page of the studio's own site — hence the
 * shared proposal stylesheet and the noindex it inherits from the
 * /proposals layout rather than the marketing chrome.
 *
 * Simpler than the Orravan quote deliberately: that one had to weigh
 * two options against an incumbent, this one is a single number. Every
 * line a reader does not need is a line that makes the number harder
 * to find.
 *
 * The three values below are the only things that change per client.
 */
const CLIENT = {
  company: "Rebellion",
  contact: "",           // first name for the greeting; blank omits it
  date: "25 August 2026",
  validFor: "30 days",
};

export const metadata: Metadata = {
  title: "Proposal for Rebellion | The Pass by Madison Four",
  description:
    "A new site and ongoing care — a proposal prepared for Rebellion.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/proposals/rebellion" },
};

export default function RebellionProposalPage() {
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
            <span className="orv-label">Date · Valid</span>
            {CLIENT.date} · {CLIENT.validFor}
          </div>
        </div>
      </header>

      <section className="orv-intro" style={{ marginTop: 0 }}>
        <p className="orv-label" style={{ color: "var(--wine)" }}>Proposal</p>
        <h1>A new site,<br />and someone to run it</h1>

        <p className="orv-greeting" style={{ marginTop: "1.8rem" }}>
          {CLIENT.contact ? `Hi ${CLIENT.contact},` : "Hi,"}
        </p>
        <div className="orv-prose">
          <p>Here&rsquo;s the whole thing on one page, so you have a number without having to dig for it.</p>
        </div>

        <div className="orv-context">
          <p className="orv-label">A note on the numbers</p>
          <div className="orv-prose">
            <p>The studio lists at <strong>$3,000&ndash;$4,000</strong> for a custom build and <strong>$900 a month</strong> for ongoing care. That&rsquo;s public on our site, and I&rsquo;d rather tell you myself than have you find it and wonder which number is real. What&rsquo;s below is a partner rate &mdash; what I&rsquo;d charge <em>you</em>, not what the work lists at.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="orv-options">
          <div className="orv-option orv-b" style={{ gridColumn: "1 / -1" }}>
            <p className="orv-kicker">The offer</p>
            <h2>Everything, one number</h2>
            <p className="orv-rate">$200<span className="orv-cadence"> / month</span></p>

            <table className="orv-pricing">
              <caption>Pricing: list price versus your rate</caption>
              <thead>
                <tr><th scope="col">Item</th><th scope="col">List</th><th scope="col">Yours</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>The new site build</td>
                  <td className="orv-list-price">$3,000&ndash;$4,000</td>
                  <td className="orv-your-price"><span className="orv-incl">Included</span></td>
                </tr>
                <tr>
                  <td>Ongoing management</td>
                  <td className="orv-list-price">$900/mo</td>
                  <td className="orv-your-price">$200/mo</td>
                </tr>
              </tbody>
            </table>

            <div className="orv-includes">
              <p>Hosting, security, menu and hours updates, content changes, and ongoing search work so the pages actually get found.</p>
              <p style={{ marginTop: ".7rem" }}>Additional pages beyond the site as built are <strong>$100 each</strong>, one&nbsp;time.</p>
            </div>

            <p className="orv-fine">Month to month, nothing upfront.</p>
          </div>
        </div>

        <div className="orv-pullquote">
          <p>Put plainly: the build costs you nothing, and keeping it running costs less each month than a single night&rsquo;s covers.</p>
        </div>
      </section>

      <section>
        <div className="orv-section-head">
          <p className="orv-label">Next</p>
          <div className="orv-hr"></div>
        </div>
        <div className="orv-prose">
          <p>If the number works, say so and I&rsquo;ll start. Happy to get on a call first if you&rsquo;d rather see it before you decide.</p>
        </div>

        <div className="orv-cta-row">
          <a className="orv-btn" href="mailto:nelson.schnebelen@gmail.com?subject=Re%3A%20Proposal%20%E2%80%94%20a%20new%20site%20and%20ongoing%20care">
            Reply to this quote
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          <a className="orv-btn orv-ghost" href="https://madisonfour.com/book" target="_blank" rel="noopener">
            Or book a call
          </a>
        </div>

        <div className="orv-sign">
          <p className="orv-name">Nelson</p>
          <p className="orv-role">The Pass by Madison Four</p>
          <p className="orv-contact">
            <a href="mailto:nelson.schnebelen@gmail.com">nelson.schnebelen@gmail.com</a>
            &nbsp;&middot;&nbsp;
            <a href="https://madisonfour.com" target="_blank" rel="noopener">madisonfour.com</a>
          </p>
        </div>
      </section>

      <footer>
        <span>The Pass by Madison Four</span>
        <span>Prepared for {CLIENT.company} &middot; not a binding invoice</span>
      </footer>

    </div>
  );
}
