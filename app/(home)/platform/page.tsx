import Link from "next/link";

/**
 * The platform's homepage. Every product and agent named here exists in
 * the codebase, or is marked as coming; the screens in the hero are the
 * real interface, drawn in HTML, not a mock-up of something else.
 */

const GROUPS: { name: string; items: { n: string; title: string; does: string; live: boolean }[] }[] = [
  {
    name: "Storefront",
    items: [
      { n: "01", title: "Website", does: "A fast, beautiful site on your own design: menus, hours, story. Edit it yourself, or just tell the Website Agent.", live: true },
      { n: "02", title: "Reservations", does: "Booking built into your site. No account, no app, no per-cover fee. Guests move or cancel from one link.", live: true },
      { n: "03", title: "Host stand", does: "Tonight's book on a tablet: seat, no-show, walk-ins, phone bookings, guest history at a glance.", live: true },
      { n: "04", title: "Deposits", does: "Hold the tables that matter. Refunds follow your policy automatically.", live: true },
      { n: "05", title: "Online ordering & catering", does: "Pickup, delivery and catering orders from your own site, with no marketplace commission.", live: false },
      { n: "06", title: "Gift cards", does: "Sold on your site, emailed as a code, spent across as many visits as it takes.", live: true },
    ],
  },
  {
    name: "Marketing",
    items: [
      { n: "07", title: "Texts", does: "Confirmations, reminders and campaigns, with consent tracked for every guest.", live: true },
      { n: "08", title: "Waitlist", does: "“Text me if a table opens.” A cancellation fills itself.", live: true },
      { n: "09", title: "Reviews", does: "Your Google reviews in one place, answered from one place.", live: true },
      { n: "10", title: "Ads", does: "Google and Meta reporting in plain language, with agents that flag waste.", live: false },
      { n: "11", title: "Loyalty", does: "Every few visits earns a reward, counted automatically from bookings and your point of sale.", live: true },
      { n: "12", title: "Email", does: "Campaigns to guests who asked for them, with one-click unsubscribe built in.", live: true },
      { n: "13", title: "Mobile app & push", does: "Your own app for your regulars.", live: false },
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

const AGENTS = [
  { name: "Website Agent", does: "“The lamb chops are $52 now.” It drafts the change, lists exactly what changed, and waits for your Publish.", live: true },
  { name: "Reservations Agent", does: "Spots the quiet nights ahead and drafts a text to regulars who haven’t been in. You approve before anyone hears from you.", live: true },
  { name: "Paid Ads Agent", does: "Finds spend that isn’t bringing guests and budget that should move, with the numbers behind each call.", live: false },
  { name: "Search Terms Agent", does: "Reads what people actually searched to find you, and blocks the searches that waste money.", live: false },
  { name: "Reviews Agent", does: "Drafts a reply to every new Google review in your voice. You approve it, it posts.", live: true },
  { name: "Guest Support Agent", does: "Answers questions about hours, parking and allergens by text, day and night.", live: false },
];

const PROMISES = [
  { t: "No per-cover fees", d: "One flat monthly price per location. A busy Saturday costs you nothing extra." },
  { t: "Month to month", d: "No annual contract. Stay because it works." },
  { t: "Your guests are yours", d: "We never market another restaurant to them. Export the whole list in one click." },
  { t: "Nothing goes out without you", d: "Agents propose; you approve anything that spends money or messages a guest." },
  { t: "No account for your guests", d: "A name and a mobile number. No app, no password, no code that never arrives." },
  { t: "Fair to the people who show up", d: "A seated party can never be charged as a no-show. Deposits come back on time, by policy." },
];

export default function PlatformHome() {
  return (
    <>
      <header className="hm-nav">
        <div className="hm-wrap">
          <Link href="/platform" className="hm-logo"><i aria-hidden />The Pass</Link>
          <nav className="hm-links" aria-label="Main">
            <a href="#products">Products</a>
            <a href="#agents">Agents</a>
            <a href="#promises">Why us</a>
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
            <span className="hm-eyebrow"><b aria-hidden />The restaurant platform, run by agents</span>
            <h1>Your restaurant, run by agents <em>you can see.</em></h1>
            <p className="lead">
              Website, reservations, guest list, texts, reviews and ads — one platform, with AI agents that do the work
              and show you every move before it happens. No per-cover fees. Your guests stay yours.
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
                  <span className="tabs"><span>Overview</span><span className="on">Host stand</span><span>Guests</span><span>Website</span><span>Agents</span><span>Reviews</span></span>
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
                    <span className="hm-pill info">Reservations Agent</span>
                    <p style={{ margin: "10px 0 0", fontSize: 14, fontWeight: 600 }}>Tuesday is quiet. Text 18 regulars?</p>
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

        <section className="hm-sec" id="products">
          <div className="hm-wrap">
            <p className="hm-kicker">One platform</p>
            <h2>Everything a restaurant runs on, working together.</h2>
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

        <section className="hm-sec" id="agents">
          <div className="hm-wrap">
            <p className="hm-kicker">Agents</p>
            <h2>Agents that do the work, and show their work.</h2>
            <p className="sub">Each agent watches one part of the business and proposes what to do, with the numbers behind it. Anything that spends money or reaches a guest waits for your yes — and every action is in the log.</p>
            <div className="hm-grid c3">
              {AGENTS.map((a) => (
                <div key={a.name} className={`hm-tile hm-agent hm-reveal${a.live ? "" : " hm-soon"}`}>
                  <span className="tag">{a.live ? "✦ Working" : "Coming"}</span>
                  <h3>{a.name}</h3>
                  <p>{a.does}</p>
                </div>
              ))}
            </div>
            <div className="hm-steps">
              {[
                ["It watches", "Your book, your guests, your reviews and your ads, every day."],
                ["It proposes", "One clear change, with why and the numbers."],
                ["You approve", "Or dismiss. Money and guest messages always wait for you."],
                ["It's recorded", "Who did what and when, for every change — person or agent."],
              ].map(([b, s]) => <div key={b} className="hm-step hm-reveal"><b>{b}</b><span>{s}</span></div>)}
            </div>
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
            <h2>Run the room. Let the agents run the rest.</h2>
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
            <Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/login">Sign in</Link>
          </span>
        </div>
      </footer>
    </>
  );
}
