import type { Metadata } from "next";
import Link from "next/link";
import { PassMark } from "@/components/marketing/PassMark";
import { PricingCalculator } from "@/components/marketing/PricingCalculator";
import { ADDITIONAL_LOCATION_DISCOUNT_PCT, dollars, FEE_PROMISES, FOUNDING_OFFER, PLANS } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Pricing — The Pass",
  description: "One flat price per location. No per-cover, per-order or guest fees. Host for the dining room; The Pass for everything on the guest side.",
};

/**
 * Pricing. Every number comes from lib/billing/plans.ts (hypotheses, see
 * docs/company/04). Plans are framed as the stations The Pass runs —
 * one agent, never sold one station at a time. Only what's built is listed.
 */

const HOST = {
  stations: ["Reservations", "Website"],
  items: [
    "Bookings on your own website — no widget, no per-cover fee",
    "The host stand: tonight's book, seating, walk-ins, the waitlist",
    "Deposits for the tables that matter, refunded by your policy",
    "Your guest list and guest profiles, with import and one-click export",
    "Your website, built here and edited by asking",
    "Ask The Pass about your bookings, guests and website",
    "The morning pass: last night, today and what needs you",
  ],
};
const PASS = {
  stations: ["Reservations", "Website", "Reviews", "Paid ads"],
  items: [
    "Everything in Host, plus:",
    "Online ordering and catering from your own site, commission-free",
    "Promotions, campaigns and guest segments, by text and email",
    "Loyalty, counted from bookings and your point of sale",
    "Gift cards sold on your site — no expiry, no fees",
    "Google reviews, with replies drafted in your voice",
    "Google and Meta ads reporting, with spend changes on your approval",
    "Your own guest app on guests' home screens",
    "Financials and full reporting",
  ],
};

export default function Pricing() {
  const host = PLANS.host;
  const pass = PLANS.the_pass;
  return (
    <>
      <header className="hm-nav">
        <div className="hm-wrap">
          <Link href="/platform" className="hm-logo"><PassMark size={22} />The Pass</Link>
          <nav className="hm-links" aria-label="Main">
            <Link href="/platform#stations">Stations</Link>
            <Link href="/platform#products">What it runs</Link>
            <Link href="/platform/pricing" aria-current="page">Pricing</Link>
            <Link href="/s/santorini">Live demo</Link>
          </nav>
          <div className="hm-nav-cta">
            <Link href="/login" className="hm-btn">Sign in</Link>
            <Link href="/book" className="hm-btn primary">Book a demo</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hm-hero hm-price-hero">
          <div className="hm-wrap">
            <span className="hm-eyebrow"><b aria-hidden />Pricing</span>
            <h1 className="hm-h1-long">One flat price per location. <em>Nothing on top.</em></h1>
            <p className="lead">
              No per-cover fees, no per-order fees, no fees on your guests, and no cut of your deposits or ad spend.
              Pick the stations you want The Pass to run. Month to month.
            </p>
          </div>
        </section>

        <section className="hm-sec hm-price-sec" id="plans" aria-label="Plans">
          <div className="hm-wrap">
            <div className="hm-plans">
              <article className="hm-plan">
                <p className="hm-kicker">{host.name}</p>
                <h2 className="hm-plan-h">The dining room</h2>
                <p className="hm-plan-price"><b>{dollars(host.listCents)}</b><span>a location a month</span></p>
                <p className="hm-plan-found">Founding: {dollars(host.foundingCents)}, locked {FOUNDING_OFFER.lockMonths} months</p>
                <p className="hm-plan-st"><span>Stations The Pass runs</span>{HOST.stations.map((s) => <i key={s}>{s}</i>)}</p>
                <ul className="hm-plan-list">{HOST.items.map((x) => <li key={x}>{x}</li>)}</ul>
                <p className="hm-plan-texts">{host.textsIncluded.toLocaleString("en-US")} texts a location a month included</p>
                <Link href="/book" className="hm-btn lg">Book a demo</Link>
              </article>
              <article className="hm-plan hm-plan-main">
                <p className="hm-kicker">{pass.name}</p>
                <h2 className="hm-plan-h">Everything on the guest side</h2>
                <p className="hm-plan-price"><b>{dollars(pass.listCents)}</b><span>a location a month</span></p>
                <p className="hm-plan-found">Founding: {dollars(pass.foundingCents)}, locked {FOUNDING_OFFER.lockMonths} months</p>
                <p className="hm-plan-st"><span>Stations The Pass runs</span>{PASS.stations.map((s) => <i key={s}>{s}</i>)}</p>
                <ul className="hm-plan-list">{PASS.items.map((x, i) => <li key={x} className={i === 0 ? "lead" : ""}>{x}</li>)}</ul>
                <p className="hm-plan-texts">{pass.textsIncluded.toLocaleString("en-US")} texts a location a month included</p>
                <Link href="/book" className="hm-btn primary lg">Book a demo</Link>
              </article>
            </div>
            <div className="hm-group-line">
              <p><b>Group</b> — The Pass for {PLANS.group.minLocations} or more locations. Same price, same stations; group-level reporting is coming.</p>
              <p>Every plan: each location after the first is {ADDITIONAL_LOCATION_DISCOUNT_PCT}% off.</p>
            </div>
            <p className="hm-honest hm-price-honest">One agent on every plan. Plans differ by which stations it runs — we don&rsquo;t sell stations one at a time. The Pass doesn&rsquo;t touch your kitchen, payroll or point of sale.</p>
          </div>
        </section>

        <section className="hm-sec" id="fees">
          <div className="hm-wrap">
            <p className="hm-kicker">The fine print, without the fine print</p>
            <h2>What you won&rsquo;t pay for.</h2>
            <div className="hm-list">
              {FEE_PROMISES.map((p) => (
                <div key={p.t} className="hm-li"><i aria-hidden>✓</i><div><b>{p.t}</b><span>{p.d}</span></div></div>
              ))}
            </div>
          </div>
        </section>

        <section className="hm-sec" id="calculator">
          <div className="hm-wrap">
            <p className="hm-kicker">Your monthly cost</p>
            <h2>Work it out.</h2>
            <PricingCalculator />
          </div>
        </section>

        <section className="hm-sec" id="founding">
          <div className="hm-wrap hm-pass">
            <div>
              <p className="hm-kicker">Founding restaurants</p>
              <h2>The first {FOUNDING_OFFER.restaurants} restaurants pay less, for {FOUNDING_OFFER.lockMonths} months.</h2>
            </div>
            <div className="hm-pass-copy">
              <p>{host.name} at {dollars(host.foundingCents)} instead of {dollars(host.listCents)}, and {pass.name} at {dollars(pass.foundingCents)} instead of {dollars(pass.listCents)}, a location a month — locked for {FOUNDING_OFFER.lockMonths} months from the day you start.</p>
              <p>Still month to month. If it stops earning its place, you leave and take your guest list with you.</p>
            </div>
          </div>
        </section>

        <section className="hm-sec" id="compare">
          <div className="hm-wrap hm-pass">
            <div>
              <p className="hm-kicker">An honest comparison</p>
              <h2>What one flat price replaces.</h2>
            </div>
            <div className="hm-pass-copy">
              <p>A typical stack of reservations, website, ordering, marketing and reviews tools runs <b>$1,500–$2,500 a month</b> for one restaurant — before per-cover fees on your own guests, a percentage on deposits, or a fee added to every online order.</p>
              <p className="hm-honest">That range is our estimate from published list prices in November 2026 (a reservations plan with network cover fees, a website-and-ordering platform, a marketing tool and a reviews tool; the top of the range adds voice answering and a small agency retainer). Your stack will differ — bring your invoices to a demo and we&rsquo;ll compare line by line.</p>
            </div>
          </div>
        </section>

        <section className="hm-final">
          <div className="hm-wrap">
            <h2>One agent. One price. Nothing leaves the pass without you.</h2>
            <div className="ctas">
              <Link href="/book" className="hm-btn primary lg">Book a demo</Link>
              <Link href="/platform" className="hm-btn lg">How The Pass works</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="hm-foot">
        <div className="hm-wrap">
          <span>© {new Date().getFullYear()} The Pass by Madison Four</span>
          <span style={{ display: "flex", gap: 18 }}>
            <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/login">Sign in</Link>
          </span>
        </div>
      </footer>
    </>
  );
}
