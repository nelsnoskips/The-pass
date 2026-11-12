import Link from "next/link";
import { PassMark } from "@/components/marketing/PassMark";

/**
 * The platform's homepage. The Pass is one agent; its stations and the
 * products it runs are named here only if they exist in the codebase, or
 * are marked as coming. The screens in the hero are the real interface,
 * drawn in HTML. Positioning: docs/company/08-positioning-the-one-agent.md.
 */

const GROUPS: { name: string; items: { n: string; title: string; does: string; live: boolean }[] }[] = [
  {
    name: "Storefront",
    items: [
      { n: "01", title: "Website", does: "A fast, beautiful site on your own design: menus, hours, story. Edit it yourself, or just tell The Pass.", live: true },
      { n: "02", title: "Reservations", does: "Booking built into your site. No account, no app, no per-cover fee. Guests move or cancel from one link.", live: true },
      { n: "03", title: "Host stand", does: "Tonight's book on a tablet: seat, no-show, walk-ins, phone bookings, guest history at a glance.", live: true },
      { n: "04", title: "Deposits", does: "Hold the tables that matter. Refunds follow your policy automatically.", live: true },
      { n: "05", title: "Online ordering & catering", does: "Pickup and catering orders from your own site, paid online, texted when ready. No marketplace commission.", live: true },
      { n: "06", title: "Gift cards", does: "Sold on your site, emailed as a code, spent across as many visits as it takes.", live: true },
    ],
  },
  {
    name: "Marketing",
    items: [
      { n: "07", title: "Texts", does: "Confirmations, reminders and campaigns, with consent tracked for every guest.", live: true },
      { n: "08", title: "Waitlist", does: "“Text me if a table opens.” A cancellation fills itself.", live: true },
      { n: "09", title: "Reviews", does: "Your Google reviews in one place, answered from one place.", live: true },
      { n: "10", title: "Ads reporting", does: "Google and Meta spend, results and cost per result, refreshed nightly, beside your real bookings.", live: true },
      { n: "11", title: "Loyalty", does: "Every few visits earns a reward, counted automatically from bookings and your point of sale.", live: true },
      { n: "12", title: "Email", does: "Campaigns to guests who asked for them, with one-click unsubscribe built in.", live: true },
      { n: "13", title: "Mobile app", does: "Your own app on your guests' home screens: order, book, rewards. App-store versions and push notifications coming next.", live: true },
    ],
  },
  {
    name: "Data",
    items: [
      { n: "14", title: "Guest list", does: "Every guest, visit, no-show and dollar spent, from your bookings and your point of sale. Yours, not a network's.", live: true },
      { n: "15", title: "Reporting", does: "Covers, guests, messages and marketing in one view.", live: true },
      { n: "16", title: "Import & export", does: "Bring your guests and bookings in from a CSV export. Take everything out in one click, any time.", live: true },
    ],
  },
];

/** The stations of the one agent, each with its approval rule. */
const STATIONS = [
  { name: "Reservations", does: "Spots the quiet nights ahead and drafts a text to regulars who haven’t been in, with every name and their consent.", rule: "Every text waits for your approval.", live: true },
  { name: "Host stand", does: "Seats a walk-in at the table that won’t collide with the next booking, and puts late parties at the top.", rule: "Your host has the final say on every table.", live: true },
  { name: "Ordering", does: "Pickup and catering from your own site, priced on the server, texted when ready. The kitchen pauses or 86s a dish in one tap.", rule: "Prices, tax and pauses are yours.", live: true },
  { name: "Guest marketing", does: "Texts and emails to the right guests — only the ones who said yes, never more than once a week.", rule: "Nothing sends until you press Send.", live: true },
  { name: "Reviews", does: "Drafts a reply to every new Google review in your voice.", rule: "Replies post only after you approve them.", live: true },
  { name: "Website", does: "“The lamb chops are $52 now.” It drafts the change and lists exactly what changed.", rule: "Nothing goes live until you publish.", live: true },
  { name: "Paid ads", does: "Every week, finds spend that isn’t bringing guests and searches that waste money, with the numbers behind each call.", rule: "Changes go to Google only after your yes.", live: true },
  { name: "Guest support", does: "Answers questions about hours, parking and allergens by text, day and night.", rule: "", live: false },
];

/** "A Tuesday with The Pass": only the parts that are built. */
const TUESDAY = [
  { t: "9:00 am", d: "The morning pass arrives: last night’s covers and no-shows, today’s book against your usual Tuesday, and what’s waiting for you." },
  { t: "9:02", d: "“Tuesday’s quiet. Text 18 regulars who haven’t been in?” The text is there word for word, with every name and when each said yes to texts. She approves." },
  { t: "9:03", d: "“Lamb kleftiko is back tonight — put it on the website.” A draft shows exactly what changed. She publishes." },
  { t: "6:40 pm", d: "A walk-in for four. The host stand seats them at the one table that won’t collide with the 7:30. A party twenty minutes late is flagged at the top." },
  { t: "7:15", d: "Online orders spike. The kitchen pauses pickup for 15 minutes, and the order page tells guests why." },
  { t: "Next morning", d: "Two reviews came in overnight; replies are drafted in her voice, waiting for her yes. The morning pass has how Tuesday finished, and everything The Pass did is in one log." },
];

const PROMISES = [
  { t: "No per-cover fees", d: "One flat monthly price per location. A busy Saturday costs you nothing extra." },
  { t: "Month to month", d: "No annual contract. Stay because it works." },
  { t: "Your guests are yours", d: "We never market another restaurant to them. Export the whole list in one click." },
  { t: "Nothing leaves the pass without you", d: "The Pass proposes; you approve anything that spends money, goes public or messages a guest." },
  { t: "No account for your guests", d: "A name and a mobile number. No app, no password, no code that never arrives." },
  { t: "Fair to the people who show up", d: "A seated party can never be charged as a no-show. Deposits come back on time, by policy." },
];

export default function PlatformHome() {
  return (
    <>
      <header className="hm-nav">
        <div className="hm-wrap">
          <Link href="/platform" className="hm-logo"><PassMark size={22} />The Pass</Link>
          <nav className="hm-links" aria-label="Main">
            <a href="#the-pass">The pass</a>
            <a href="#stations">Stations</a>
            <a href="#products">What it runs</a>
            <a href="#promises">Why us</a>
            <Link href="/platform/pricing">Pricing</Link>
            <Link href="/s/santorini">Live demo</Link>
          </nav>
          <div className="hm-nav-cta">
            <Link href="/login" className="hm-btn">Sign in</Link>
            <Link href="/book" className="hm-btn primary">Book a demo</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hm-hero">
          <div className="hm-wrap">
            <span className="hm-eyebrow"><b aria-hidden />One agent for the front of house</span>
            <h1 className="hm-h1-long">One agent runs your front of house. <em>Nothing leaves the pass without you.</em></h1>
            <p className="lead">
              Bookings, the floor, online orders, texts, reviews, your website and your ads — The Pass does the work and
              shows you every move before it reaches a guest. No per-cover fees. Your guests stay yours.
            </p>
            <div className="ctas">
              <Link href="/book" className="hm-btn primary lg">Book a demo</Link>
              <Link href="/s/santorini" className="hm-btn lg">See a live restaurant site →</Link>
            </div>
            <p className="hm-note mono">Month to month · Import your guests from the system you use today</p>

            <div className="hm-shot hm-reveal" aria-label="The Pass, as a restaurant sees it">
              <div className="hm-shot-in">
                <div className="hm-shot-bar">
                  <span className="dots" aria-hidden><i /><i /><i /></span>
                  <span className="tabs"><span>Home</span><span className="on">Host stand</span><span>Ask The Pass</span><span>Stations</span><span>Guests</span><span>Website</span></span>
                </div>
                <div className="hm-shot-grid">
                  <div className="hm-card">
                    <h4>Tonight · 34 covers</h4>
                    {[
                      ["6:30 PM", "Helena Markou ×4", "Seated", "go", "6 visits"],
                      ["7:00 PM", "Nikos Pappas ×2", "Booked", "info", "Anniversary"],
                      ["7:15 PM", "Ana Perez ×2", "Booked", "info", "$20 deposit paid"],
                      ["7:30 PM", "Sam Ellis ×6", "Booked", "info", "First visit"],
                      ["8:00 PM", "Walk-in ×3", "Seated", "go", "T12"],
                    ].map(([t, n, s, tone, note]) => (
                      <div key={t + n} className="hm-row">
                        <span className="t mono">{t}</span>
                        <span>{n} <span className="hm-pill" style={{ marginLeft: 6 }}>{note}</span></span>
                        <span className={`hm-pill ${tone}`}>{s}</span>
                      </div>
                    ))}
                  </div>
                  <div className="hm-card">
                    <h4>Waiting for you</h4>
                    <span className="hm-pill info">The Pass · Reservations</span>
                    <p style={{ margin: "10px 0 0", fontSize: 14, fontWeight: 600 }}>The Pass wants to text 18 regulars about Tuesday.</p>
                    <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>6 of 58 seats booked, against 41 on recent Tuesdays. These regulars haven&rsquo;t been in for 45+ days.</p>
                    <div className="hm-quote">Tuesday at Santorini: the lamb kleftiko is back and the terrace is open. We&rsquo;d love to see you. <span style={{ color: "var(--faint)" }}>Reply STOP to opt out.</span></div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span className="hm-btn ai hm-mini" aria-hidden>✦ Approve &amp; send</span>
                      <span className="hm-btn hm-mini" aria-hidden>Dismiss</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="hm-sec" id="the-pass">
          <div className="hm-wrap hm-pass">
            <div>
              <p className="hm-kicker">The pass</p>
              <h2>Every plate stops at the pass. Now every move does too.</h2>
            </div>
            <div className="hm-pass-copy">
              <p>In a kitchen, the pass is the counter between the line and the dining room. The expo calls the tickets, keeps every station in time and checks each plate before it goes out. The chef has the final word.</p>
              <p>The Pass works the same way: one agent across every station of your front of house, and every text, change and dollar stops with you before it reaches a guest.</p>
              <ul className="hm-station-chips" aria-label="Stations">
                {["Reservations", "Host stand", "Ordering", "Guest marketing", "Reviews", "Website", "Ads"].map((x) => <li key={x}>{x}</li>)}
              </ul>
              <p className="hm-honest">The Pass doesn&rsquo;t touch your kitchen, payroll or point of sale.</p>
            </div>
          </div>
        </section>

        <section className="hm-sec" id="stations">
          <div className="hm-wrap">
            <p className="hm-kicker">One agent, every station</p>
            <h2>One agent does the work, and shows its work.</h2>
            <p className="sub">Not a roster of bots to supervise. One agent with one memory of every guest, working every station — and anything that spends money, goes public or reaches a guest waits for your yes.</p>
            <div className="hm-grid c3">
              {STATIONS.map((a) => (
                <div key={a.name} className={`hm-tile hm-agent hm-reveal${a.live ? "" : " hm-soon"}`}>
                  <span className="tag">{a.live ? "✦ Working" : "Coming"}</span>
                  <h3>{a.name}</h3>
                  <p>{a.does}</p>
                  {a.rule && <p className="hm-rule">{a.rule}</p>}
                </div>
              ))}
            </div>
            <div className="hm-steps">
              {[
                ["It watches", "Your book, your guests, your orders, your reviews and your ads, every day."],
                ["It proposes", "One clear change, with why and the numbers."],
                ["You approve", "Or dismiss. Money and guest messages always wait for you."],
                ["It's recorded", "Who did what and when, for every change — a person or The Pass."],
              ].map(([b, s]) => <div key={b} className="hm-step hm-reveal"><b>{b}</b><span>{s}</span></div>)}
            </div>
          </div>
        </section>

        <section className="hm-sec" id="tuesday">
          <div className="hm-wrap">
            <p className="hm-kicker">A Tuesday with The Pass</p>
            <h2>A day with one agent on the front of house.</h2>
            <ol className="hm-day">
              {TUESDAY.map((x) => (
                <li key={x.t} className="hm-reveal"><span className="mono">{x.t}</span><p>{x.d}</p></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="hm-sec" id="products">
          <div className="hm-wrap">
            <p className="hm-kicker">What The Pass runs</p>
            <h2>Everything on the guest side, from one memory of every guest.</h2>
            <p className="sub">Reservations feed the guest list. The guest list feeds your texts and loyalty. Your site, Google and your ads all read the same hours and the same menu. Change it once.</p>
            {GROUPS.map((g) => (
              <div key={g.name} className="hm-group">
                <h3>{g.name}</h3>
                <div className="hm-prod">
                  {g.items.map((p) => (
                    <div key={p.n} className={`hm-tile hm-reveal${p.live ? "" : " hm-soon"}`}>
                      <h3><span className="hm-num">{p.n}</span>{p.title}{!p.live && <span className="hm-pill">Coming</span>}</h3>
                      <p>{p.does}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="hm-sec" id="promises">
          <div className="hm-wrap">
            <p className="hm-kicker">Built against what restaurants put up with</p>
            <h2>The parts of booking platforms nobody likes, removed.</h2>
            <div className="hm-list">
              {PROMISES.map((p) => (
                <div key={p.t} className="hm-li hm-reveal"><i aria-hidden>✓</i><div><b>{p.t}</b><span>{p.d}</span></div></div>
              ))}
            </div>
          </div>
        </section>

        <section className="hm-final">
          <div className="hm-wrap">
            <h2>Run the room. The Pass runs the rest, and checks with you first.</h2>
            <div className="ctas">
              <Link href="/book" className="hm-btn primary lg">Book a demo</Link>
              <Link href="/s/santorini" className="hm-btn lg">See a live site</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="hm-foot">
        <div className="hm-wrap">
          <span>© {new Date().getFullYear()} The Pass by Madison Four</span>
          <span style={{ display: "flex", gap: 18 }}>
            <Link href="/platform/pricing">Pricing</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/login">Sign in</Link>
          </span>
        </div>
      </footer>
    </>
  );
}
