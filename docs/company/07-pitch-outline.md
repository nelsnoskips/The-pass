# The Pass — Investor Pitch Outline

*13 slides. Each slide: the title, the one point it makes, and what to
show. Figures must match `01-business-plan.md` and
`04-pricing-unit-economics.md`. Re-check competitor prices before
presenting; several come from third-party write-ups.*

---

### 1. Title

**Point:** The Pass runs the dining room and the guest relationship for
independent restaurants, with agents that propose and owners who approve.

**Show:** Logo, "a Madison Four company", one line: *Reservations, guests
and marketing for independent restaurants — owned by the restaurant.*
Presenter name **[TO FILL]**.

---

### 2. The problem

**Point:** Independent full-service restaurants pay a stack of tools that
charge per cover, lock them in, and keep part of their guest list.

**Show:** The stacked monthly bill:

| Tool | Monthly |
|---|---|
| OpenTable Core + 400 network covers | ≈ $699 |
| Owner Flat Rate | $499 |
| Toast Marketing Essentials | ≈ $185 |
| Marqii Scale | $180 |
| **Total** | **≈ $1,560** (≈ $2,460 with voice AI and an agency) |

Plus 2% on deposits (OpenTable). Sources: [Eat App](https://restaurant.eatapp.co/blog/opentable-pricing);
[Owner pricing](https://owner.com/pricing);
[Restaurant Bottom Line](https://restaurantbottomline.com/2026/08/20/punchh-vs-thanx-vs-toast-loyalty-restaurant-loyalty-2026/);
[Marqii pricing](https://www.marqii.com/pricing). Cover count is
illustrative.

---

### 3. Who owns the reservation book

**Point:** The three leaders each belong to a company with another
business to protect, so none is neutral.

**Show:** Three boxes — OpenTable / Booking Holdings (≈60,000
restaurants); Resy + Tock / American Express (≈25,000 venues);
SevenRooms / DoorDash ($1.2B, now inside DashOS). Sources:
[Entrepreneur](https://www.entrepreneur.com/business-news/doordash-buys-12b-reservation-platform-to-battle-opentable/502986);
[DoorDash 8-K](https://www.sec.gov/Archives/edgar/data/1792789/000162828025022396/q12025dashex991-pressrelea.htm);
[DoorDash IR](https://ir.doordash.com/news/news-details/2026/DoorDash-Introduces-DashOS-One-Platform-to-Help-Restaurants-Grow/default.aspx).
Footnote: DoorDash pays diners $10–12 per booking, building loyalty to its
network ([Food On Demand](https://foodondemand.com/05122026/doordash-ramps-up-reservations-with-largest-expansion-yet/)).

---

### 4. Why now

**Point:** Five 2026 events give restaurants a dated reason to switch.

**Show:** A timeline:

- Mar 2026 — OpenTable "system of record" terms, 100% of remaining fees to
  leave early ([Restaurant Business](https://www.restaurantbusinessonline.com/technology/opentable-will-require-restaurants-make-it-their-primary-reservations-system); [Yahoo Finance](https://finance.yahoo.com/sectors/technology/articles/why-restaurants-anxious-opentable-terms-105500851.html))
- Aug 2026 — Tock venues move to Resy; Tock app retired ([The Points Guy](https://thepointsguy.com/news/amex-resy-credit-tock-restaurants/?utm_section=ts))
- Sep 30, 2026 — SevenRooms folded into DashOS ([DoorDash IR](https://ir.doordash.com/news/news-details/2026/DoorDash-Introduces-DashOS-One-Platform-to-Help-Restaurants-Grow/default.aspx))
- Oct 6, 2026 — Uber agrees to buy ezCater for $2.3B, pending ([FastCasual](https://www.fastcasual.com/articles/ubers-ezcater-deal-puts-catering-growth-margins-and-customer-loyalty-in-focus/))
- Oct 29, 2026 — FTC and seven states sue Toast over hidden fees and cancellation traps ([DLA Piper](https://www.dlapiper.com/en/insights/publications/2026/11/ftc-and-seven-states-sue-toast))

---

### 5. The solution

**Point:** One platform where agents do the routine work and the owner
approves anything that spends money or messages guests.

**Show:** The loop from `docs/AGENTIC-PLATFORM.md`: trigger → agent →
policy check in code (auto / approve / never) → change log and approval
queue. A screenshot of the approval queue **[TO FILL: screenshot]**.

---

### 6. Product: built today vs next

**Point:** Most of the reservations wedge already exists; the remaining
gaps are known and short.

**Show:** Two columns.

- **Built:** reservations engine (no double bookings), host stand, guest
  list with consent records, import/export, Square visit sync, pickup
  ordering; Reservations, Paid Ads, Search Terms, Website and Reviews
  agents.
- **Next:** live Stripe deposits at cost, import that keeps notes and
  history, offline host stand, Reserve with Google, coexistence mode,
  leak audit.

---

### 7. Why we win: the seated-guest record

**Point:** We hold the data ordering-first and POS-bound rivals lack —
who booked, who sat, when and how often — and we are neutral.

**Show:** Three examples:

- Review reply that knows "your 7:30 table seated at 7:55".
- Quiet-Thursday fill texted to lapsed regulars, measured against a
  holdout group.
- Ad spend reported as cost per seated cover.

Plus the trust row: month to month, no guest fees, export any time, every
action logged — against the Toast FTC allegations.

---

### 8. Market

**Point:** A $3.0B flat-fee market in US independents, with about $1.4B
in our full-service segment.

**Show:**

| | Locations | At our prices |
|---|---|---|
| TAM — all independents, full suite | 412,500 | ≈ $3.0B |
| SAM — full-service independents | ≈ 200,000 *(assumption: half)* | ≈ $1.4B |
| SOM — 1% of SAM in ~5 years | ≈ 2,000 | ≈ $9.6M ARR |

Source for the count: [Restaurant Business / Technomic](https://www.restaurantbusinessonline.com/operations/number-independent-restaurants-declined-23-2025).
Note the base shrinks about 2.3% a year.

---

### 9. Business model

**Point:** Flat, per location, month to month — we earn when the
restaurant stays, not when it grows its covers.

**Show:** Reservations $199; The Pass $599; additional locations 20% off;
founding 50 at $149 / $449 locked 24 months. No per-cover, per-order or
guest fees; no cut of deposits; 2,000 texts included. Cost to serve:
SMS ≈ $25 per location ([Twilio](https://www.twilio.com/en-us/sms/pricing))
plus model calls; target gross margin 70–85% (detail in
`04-pricing-unit-economics.md`). Toast's subscription ARR per location,
≈ $564 a month, as a reference ([Toast 8-K](https://www.sec.gov/Archives/edgar/data/0001650164/000165016426000214/tost-20260930xexhibit991.htm)).

---

### 10. Go-to-market

**Point:** A free leak audit and dated switch kits, sold first through the
founder's own network.

**Show:** Funnel: founder network **[TO FILL: size]** → leak audit →
Reservations plan → full suite. Switch-kit calendar: Tock now; OpenTable
60–90 days before spring-2027 anniversaries; SevenRooms; Toast; caterers.
Precedent: Owner's free Grader funnel ([First Round Review](https://review.firstround.com/inside-owners-zigzag-path-to-a-billion-dollar-business)).
Detail in `02-go-to-market.md`.

---

### 11. Competition

**Point:** Funded all-in-ones chase ordering; the dining-room leaders are
captive. Nobody offers a neutral, flat-priced reservations-plus-agents
platform for independents.

**Show:** 2×2 — axes: *dine-in depth* (low → high) and *neutral, flat,
month to month* (no → yes). Owner.com and Open: ordering-first. OpenTable,
Resy, DashOS: dine-in but captive. Toast: POS-tied. The Pass: top right.
Sources: [PR Newswire (Owner)](https://www.prnewswire.com/news-releases/owner-raises-240m-led-by-goldman-sachs-alternatives-to-build-the-ai-native-platform-for-every-local-business-302862420.html);
[Open](https://getopen.com/company); full table in
`reports/Restaurant platform competitive gaps.md`.

---

### 12. Traction, team and milestones

**Point:** A working platform, a founder with the network to fill 50
founding restaurants, and a dated 18-month plan.

**Show:**

- Traction: paying customers **none yet [TO FILL if this changes]**;
  pilots / waitlist **[TO FILL]**.
- Team: **[TO FILL: founder background]**, **[TO FILL: team]**.
- Milestones: Feb 2027 15–25 founding restaurants signed, 10–15 live →
  Aug 2027
  all 50 founding locations and first holdout-measured case study →
  May 2028 150 paying locations (target).

---

### 13. The ask

**Point:** What we are raising and what it buys.

**Show:** **[TO FILL: amount and instrument]**. Use of funds:
product (deposits, import, offline host stand, Reserve with Google),
onboarding staff, leak-audit marketing, legal and compliance — **[TO FILL:
split]**. Category context: Owner.com $240M at $2.3B (Aug 2026,
[PR Newswire](https://www.prnewswire.com/news-releases/owner-raises-240m-led-by-goldman-sachs-alternatives-to-build-the-ai-native-platform-for-every-local-business-302862420.html));
exits for Tock ($400M), SevenRooms ($1.2B) and Olo (≈ $2.0B)
([Restaurant Business](https://www.restaurantbusinessonline.com/technology/american-express-acquiring-tock-squarespace-400m);
[Restaurant Dive](https://www.restaurantdive.com/news/DoorDash-acquires-sevenrooms-1-billion/747226/);
[SaaStr](https://www.saastr.com/pe-loves-saas-again-thoma-bravo-buys-olo-for-2-billion)).

---

### Appendix slides (if asked)

- **Risks:** network-cover loss, OpenTable terms, unvalidated pricing,
  agent errors, SMS compliance — and mitigations (business plan §13).
- **Unit economics:** from `04-pricing-unit-economics.md`.
- **Product demo:** booking flow, host stand, approval queue.
