import type { Metadata } from "next";
import "../proposal.css";

/**
 * Orravan's quote, against the brief Alex sent.
 *
 * They already run booking, payments and ServiceTrade, so none of those
 * is a build — each is a connection to something that exists, priced
 * flat at $500. The redesign is the actual work and carries the actual
 * number. Half of the one-time total falls due on signing.
 */
const CLIENT = {
  company: "Orravan Mechanical",
  contact: "Alex",
  date: "25 August 2026",
  validFor: "30 days",
};

export const metadata: Metadata = {
  title: "Proposal for Orravan Mechanical | The Pass by Madison Four",
  description:
    "The redesign, the portal, and the ServiceTrade connection — prepared for Orravan Mechanical.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/proposals/orravan-redesign" },
};

export default function OrravanRedesignProposal() {
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
            {CLIENT.company} &mdash; Attn: {CLIENT.contact} Jimenez
          </div>
          <div className="orv-row">
            <span className="orv-label">Date · Valid</span>
            {CLIENT.date} · {CLIENT.validFor}
          </div>
        </div>
      </header>

      <section className="orv-intro" style={{ marginTop: 0 }}>
        <p className="orv-label" style={{ color: "var(--wine)" }}>Proposal</p>
        <h1>The redesign, the portal,<br />and the ServiceTrade link</h1>

        <p className="orv-greeting" style={{ marginTop: "1.8rem" }}>Hi {CLIENT.contact},</p>
        <div className="orv-prose">
          <p>Thanks for the detail in the brief &mdash; it answered most of what I&rsquo;d have asked on a call. Here&rsquo;s the shape of it, and a number.</p>
        </div>

        <div className="orv-context">
          <p className="orv-label">A note on the numbers</p>
          <div className="orv-prose">
            <p>The studio lists at <strong>$3,000&ndash;$4,000</strong> for a custom build and <strong>$900 a month</strong> for ongoing care. That&rsquo;s public on our site, and I&rsquo;d rather tell you myself than have you find it and wonder which number is real.</p>
            <p style={{ marginTop: ".8rem" }}>You already run booking, payments and ServiceTrade, so none of those is a build from scratch &mdash; each is a connection to something you already pay for, and each is priced flat. The redesign is the work.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="orv-options">
          <div className="orv-option orv-b" style={{ gridColumn: "1 / -1" }}>
            <p className="orv-kicker">The build</p>
            <h2>What it comes to</h2>
            <p className="orv-rate">$4,000<span className="orv-cadence"> one time</span> &mdash; then $300 / month</p>
            <p className="orv-gift-note">$2,000 due on signing, the balance on launch.</p>

            <table className="orv-pricing">
              <caption>Scope and pricing against list</caption>
              <thead>
                <tr><th scope="col">Item</th><th scope="col">List</th><th scope="col">Yours</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>The redesign &mdash; home, about,<br />services, contact, portal</td>
                  <td className="orv-list-price">$3,000&ndash;$4,000</td>
                  <td className="orv-your-price">$2,500</td>
                </tr>
                <tr>
                  <td>Booking &mdash; connected to<br />what you already use</td>
                  <td className="orv-list-price">$900</td>
                  <td className="orv-your-price">$500</td>
                </tr>
                <tr>
                  <td>Payments &mdash; connected</td>
                  <td className="orv-list-price">$900</td>
                  <td className="orv-your-price">$500</td>
                </tr>
                <tr>
                  <td>ServiceTrade &mdash; connected,<br />portal included</td>
                  <td className="orv-list-price">$900</td>
                  <td className="orv-your-price">$500</td>
                </tr>
                <tr className="orv-total">
                  <td>One time</td>
                  <td className="orv-list-price">$5,700&ndash;$6,700</td>
                  <td className="orv-your-price">$4,000</td>
                </tr>
                <tr>
                  <td>Ongoing care</td>
                  <td className="orv-list-price">$900/mo</td>
                  <td className="orv-your-price">$300/mo</td>
                </tr>
              </tbody>
            </table>

            <div className="orv-includes">
              <p>Care covers hosting, security, content and page updates, and ongoing search work &mdash; including keeping the three connections alive, which is the part that breaks loudly if nobody is watching it.</p>
              <p style={{ marginTop: ".7rem" }}>Additional pages beyond the five are <strong>$250 each</strong>, one&nbsp;time.</p>
            </div>

            <p className="orv-fine">50% deposit on signing, balance on launch. Care is month to month and starts when the site goes live.</p>
          </div>
        </div>

        <div className="orv-pullquote">
          <p>The portal is the part your customers already like. It moves across as it is &mdash; nobody has to learn anything new.</p>
        </div>
      </section>

      <section>
        <div className="orv-section-head">
          <p className="orv-label">On the photography</p>
          <div className="orv-hr"></div>
        </div>
        <div className="orv-prose">
          <p>You said no AI images, and the mock you&rsquo;ve been looking at is full of them &mdash; the building cutaway, the equipment, the team. They were placeholders to prove the layout, and every one comes out.</p>
          <p style={{ marginTop: ".8rem" }}>What replaces them is a half-day shoot: your plant rooms, your rooftop units, your crew. That&rsquo;s the one thing I&rsquo;d push you on, because the Therma page you flagged works entirely on the strength of real faces.</p>
          <p style={{ marginTop: ".8rem" }}>If you have a photographer who can shoot it and send the files over, that costs you nothing extra and is the fastest route. If not, I&rsquo;ll arrange one and come back with a figure &mdash; I&rsquo;d rather price it against a real shot list than guess at one here.</p>
        </div>
      </section>

      <section>
        <div className="orv-section-head">
          <p className="orv-label">Next</p>
          <div className="orv-hr"></div>
        </div>
        <div className="orv-prose">
          <p>If the shape is right, I&rsquo;ll send a review link to the updated mock so you and Don can mark it up directly &mdash; click anything, leave a note, press submit. Faster than a call and it comes back to me in one piece.</p>
        </div>

        <div className="orv-cta-row">
          <a className="orv-btn" href="mailto:nelson.schnebelen@gmail.com?subject=Re%3A%20Proposal%20%E2%80%94%20Orravan%20redesign%2C%20portal%20and%20ServiceTrade">
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
