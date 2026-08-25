import type { Metadata } from "next";
import "./hals.css";

/**
 * A one-off quote, not a page of the studio's own site — hence its own
 * scoped stylesheet and its own noindex rather than reusing the
 * marketing chrome. Ported from the artifact draft; every number and
 * word here is what was actually sent, not a template.
 */
export const metadata: Metadata = {
  title: "Proposal for Orravan Mechanical | The Pass by Madison Four",
  description:
    "Private events pages, the pop-up, and ongoing care — a proposal prepared for Orravan Mechanical, Inc.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/proposals/hals" },
};

export default function OrravanProposalPage() {
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
            Orravan Mechanical, Inc. — Attn: Sam Janco
          </div>
          <div className="orv-row">
            <span className="orv-label">Date · Valid</span>
            24 August 2026 · 30 days
          </div>
        </div>
      </header>

      <section className="orv-intro" style={{ marginTop: 0 }}>
        <p className="orv-label" style={{ color: "var(--wine)" }}>Proposal</p>
        <h1>Private events, the pop-up,<br />and ongoing care</h1>

        <p className="orv-greeting" style={{ marginTop: "1.8rem" }}>Hi Sam,</p>
        <div className="orv-prose">
          <p>No apology needed, and thank you for being straight with me about where it stands. Here&rsquo;s the simple version, so you have numbers for Sunday.</p>
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

          <div className="orv-option orv-a">
            <p className="orv-kicker">Option 1</p>
            <h2>Keep it simple</h2>
            <p className="orv-rate">$150<span className="orv-cadence"> / month</span> &mdash; exactly what you pay now</p>

            <table className="orv-pricing">
              <caption>Option 1 pricing: list price versus your rate</caption>
              <thead>
                <tr><th scope="col">Item</th><th scope="col">List</th><th scope="col">Yours</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Private dining pages<br />+ the pop&#8209;up</td>
                  <td className="orv-list-price">$2,300</td>
                  <td className="orv-your-price"><span className="orv-incl">Included</span></td>
                </tr>
                <tr>
                  <td>Ongoing care</td>
                  <td className="orv-list-price">$900/mo</td>
                  <td className="orv-your-price">$150/mo</td>
                </tr>
              </tbody>
            </table>

            <div className="orv-includes">
              <p>Hosting, security, menu and hours updates, content changes, and ongoing search work so the pages actually get found.</p>
            </div>

            <p className="orv-fine">Month to month, nothing upfront.</p>
          </div>

          <div className="orv-option orv-b">
            <p className="orv-kicker">Option 2</p>
            <h2>Launch the new site</h2>
            <p className="orv-rate">$300<span className="orv-cadence"> / month</span></p>
            <p className="orv-gift-note">Already built &mdash; yours either way, no obligation.</p>

            <table className="orv-pricing">
              <caption>Option 2 pricing: list price versus your rate</caption>
              <thead>
                <tr><th scope="col">Item</th><th scope="col">List</th><th scope="col">Yours</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>The new site</td>
                  <td className="orv-list-price">$3,000&ndash;$4,000</td>
                  <td className="orv-your-price"><span className="orv-incl">Free</span></td>
                </tr>
                <tr>
                  <td>Ongoing care</td>
                  <td className="orv-list-price">$900/mo</td>
                  <td className="orv-your-price">$300/mo</td>
                </tr>
                <tr>
                  <td>One new page<br />each month</td>
                  <td className="orv-list-price">$150 ea.</td>
                  <td className="orv-your-price"><span className="orv-incl">Included</span></td>
                </tr>
              </tbody>
            </table>

            <div className="orv-includes">
              <p>Additional pages or pop&#8209;ups beyond the monthly one are $150 each.</p>
            </div>

            <p className="orv-fine">Covers bringing the new site live and keeping it running. Nothing upfront.</p>
          </div>

        </div>

        <div className="orv-pullquote">
          <p>Put plainly: the new site is already done. Bringing it live and keeping it running costs less each month than a single service call.</p>
        </div>
      </section>

      <section>
        <div className="orv-section-head">
          <p className="orv-label">On Bemir</p>
          <div className="orv-hr"></div>
        </div>
        <div className="orv-prose">
          <p>Either option works alongside him if that&rsquo;s simpler &mdash; I&rsquo;d only want a short conversation so we&rsquo;re not editing the same files. If you&rsquo;d rather move everything across, I&rsquo;d ask for two weeks of overlap so nothing gets lost.</p>
        </div>
      </section>

      <section>
        <div className="orv-section-head">
          <p className="orv-label">Next</p>
          <div className="orv-hr"></div>
        </div>
        <div className="orv-prose">
          <p>Happy to get on a call this week outside the Dineline meetings, whatever suits you and Sammy.</p>
        </div>

        <div className="orv-cta-row">
          <a className="orv-btn" href="mailto:nelson.schnebelen@gmail.com?subject=Re%3A%20Quote%20%E2%80%94%20private%20events%2C%20the%20pop-up%2C%20and%20ongoing%20care">
            Reply to this quote
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          <a className="orv-btn orv-ghost" href="https://cal.com/the-pass-team-ht7tto/book" target="_blank" rel="noopener">
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
        <span>Prepared for Orravan Mechanical, Inc. &middot; not a binding invoice</span>
      </footer>

    </div>
  );
}
