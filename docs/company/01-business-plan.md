# The Pass — Business Plan

*The Pass, a Madison Four company. Draft of November 2026.*

Companion documents: `00-one-pager.md`, `02-go-to-market.md` (go-to-market
plan), `04-pricing-unit-economics.md` (pricing and financial model),
`07-pitch-outline.md`. The competitive detail lives in
`reports/Restaurant platform competitive gaps.md`.

Placeholders marked **[TO FILL: …]** are facts we have not confirmed.
Prices are hypotheses to test with restaurants, not settled.

---

## 1. Executive summary

**What it is.** The Pass is one platform for an independent restaurant's
guest-facing business: reservations, the guest list, website, SMS and
email, loyalty, reviews and paid ads. Software agents do the routine work.
They propose anything that spends money or messages guests, the owner
approves it, and every action is written to a log.

**Who it is for.** Full-service independent restaurants and small groups
(1–20 locations) in the US.

**Where we start.** Reservations. We enter through a free "leak audit"
that shows a restaurant what its Google profile, website, review replies
and current reservation stack are costing it, then expand from
reservations into the full suite.

**Why us.** The three reservation leaders now belong to companies with
other businesses to protect: Booking Holdings (OpenTable), American
Express (Resy and Tock) and DoorDash (SevenRooms)
([Entrepreneur](https://www.entrepreneur.com/business-news/doordash-buys-12b-reservation-platform-to-battle-opentable/502986)).
The well-funded all-in-one platforms, such as Owner.com, are built around
online ordering, not the dining room
([PR Newswire](https://www.prnewswire.com/news-releases/owner-raises-240m-led-by-goldman-sachs-alternatives-to-build-the-ai-native-platform-for-every-local-business-302862420.html)).
The Pass is neutral: no marketplace, no delivery business and no card
business behind it. The restaurant owns its guests.

**Why now.** Five events in 2026 give restaurants a reason to switch
(section 4): OpenTable's new contract terms, Tock's forced move to Resy,
DoorDash folding SevenRooms into DashOS, the FTC suit against Toast, and
Uber's pending purchase of ezCater.

**Pricing (hypotheses).** Reservations plan $199 per location per month;
The Pass (full suite) $599 per location per month. No per-cover,
per-order or guest fees and no cut of deposits. Month to month.

**Status.** A working platform in development. No paying customers yet
**[TO FILL if this changes]**.

**The ask.** **[TO FILL: amount, instrument and timing — see section 14
for options]**.

---

## 2. The problem

Independent full-service restaurants run on thin margins and a stack of
separate tools, each billed separately and each holding part of the guest
record.

| Problem | Evidence |
|---|---|
| **Fees that grow with the restaurant's success.** OpenTable charges per network cover and, since January 2026, 2% on deposits, no-show fees and prepaid bookings. | $149 / $299 / $499 a month plus $1.00–$1.50 per network cover ([Eat App](https://restaurant.eatapp.co/blog/opentable-pricing); [TableHelm](https://www.tablehelm.com/blog/opentable-2-percent-service-fee-explained)) |
| **Lock-in.** OpenTable's March 2026 agreement makes it the restaurant's required "system of record", requires all tables on its marketplace, and charges 100% of remaining subscription and cover fees for leaving mid-term. | [Restaurant Business](https://www.restaurantbusinessonline.com/technology/opentable-will-require-restaurants-make-it-their-primary-reservations-system); [Yahoo Finance](https://finance.yahoo.com/sectors/technology/articles/why-restaurants-anxious-opentable-terms-105500851.html). Washington's antitrust division agreed to look at the terms ([Washington State Standard](https://washingtonstatestandard.com/2026/04/15/opentables-new-rules-have-a-seattle-business-leader-calling-foul/)) |
| **Billing and cancellation traps.** The FTC and seven states allege Toast used hidden fees, a $150-per-remaining-month termination fee and phone-only cancellation. Toast disputes the claims. | [DLA Piper](https://www.dlapiper.com/en/insights/publications/2026/11/ftc-and-seven-states-sue-toast); one merchant was charged $5,318.87 to leave ([Quartz](https://qz.com/ftc-states-sue-toast-hidden-fees-subscriptions-102926)). Popmenu customers report paying out 24-month contracts ([BBB](https://www.bbb.org/us/ga/atlanta/profile/marketing-software/popmenu-0443-28164736/complaints)) |
| **Too many tools.** An illustrative full-service stack costs about $1,560 a month, or about $2,460 with voice AI and an agency. | Built from list prices in the competitive analysis (section 7 below) |
| **Who owns the guest.** Networks pay diners with credits that build loyalty to the network. DoorDash gives $10–12 in credit per booking. | [Food On Demand](https://foodondemand.com/05122026/doordash-ramps-up-reservations-with-largest-expansion-yet/) |
| **Marketing nobody measures.** 37% of operators are dissatisfied with their loyalty program; a reported 40% do no ROI measurement. | [Restaurant Business](https://www.restaurantbusinessonline.com/technology/why-so-many-restaurant-chains-are-revamping-their-loyalty-programs); [PepperHQ](https://www.pepperhq.com/blog/state-of-loyalty-report-2025) |
| **Ad spend not tied to seated guests.** Agencies charge 10–20% of media spend, often with a $500+ minimum, so their pay rises with spend, not results. | [Stackmatix](https://www.stackmatix.com/blog/restaurant-marketing-agency); [ALM Corp](https://almcorp.com/blog/google-ads-management-pricing-2026/) |

Switching is also risky. When Union Square Cafe moved reservation
systems, guest notes did not come across
([Caper](https://caper.media/p/union-square-hospitality-group-reservation-move-sevenrooms-opentable)).

---

## 3. Solution and product

### How it works

Every agent follows the same pattern (`docs/AGENTIC-PLATFORM.md`):

1. **Trigger** — a schedule, a new booking, a guest message.
2. **Agent** — a model with instructions picks the next tool to call.
3. **Policy check in code** — each action is *auto*, *needs approval* or
   *never*. The model cannot change the tier. Ad spend, marketing
   messages, discounts and review replies always need a person's approval.
   Marketing texts without recorded consent are refused.
4. **Record** — every proposed or taken action goes into a change log
   with the actor, the reason and the numbers behind it.

### What is built today

| Area | State |
|---|---|
| Reservations engine | Built. Refuses overlapping holds on a table from any source; one live booking per phone per service; rate limits |
| Host stand | Built (offline mode still to build) |
| Guest self-service | Built: one-tap cancel, change day/time/party in place, notify list when a table opens, no account or app needed |
| Guest list (CRM) | Built: per-restaurant guests with SMS consent records |
| Import and export | Built: import guests and future bookings with a dry run; one-click export of guests, consent history and bookings |
| Deposits | Recorded with the policy shown before booking; live Stripe deposits still to finish |
| Loyalty and visits | Built: visit counts from bookings and Square checks |
| Reservations Agent | Built: fills quiet shifts by texting lapsed regulars, with consent checked and owner approval |
| Paid Ads and Search Terms agents | Built on real Google Ads and Meta data; Google changes (budget, pause, negative keywords) run on approval; Meta is read-only |
| Website Agent | Built: describe a change, get a draft and preview (saves drafts only today) |
| Reviews Agent | Built: drafts replies, owner approves, reply posts to Google |
| SMS | Sender and consent rules built; dry run until production messaging keys are set |
| Pickup ordering and catering orders | Built: menu, server-side pricing, tax, tips, Stripe, kitchen board |
| Approval queue | Built |

### What comes next (in order)

| Priority | Item | Why |
|---|---|---|
| 1 | Live Stripe deposits at processing cost | The pitch is $0 platform cut vs OpenTable's 2% |
| 1 | Import that carries guest notes, tags, allergies and visit history, plus a "nothing lost" report | The known failure in switching |
| 1 | Host-stand offline mode | Hosts need it when the connection drops |
| 1 | Reserve with Google certification | The native "Reserve a table" button requires certified partner status ([Google Actions Center](https://developers.google.com/actions-center/verticals/reservations/e2e/overview)) |
| 1 | Coexistence mode | Take direct bookings only while a restaurant is still under an OpenTable contract (subject to legal review) |
| 2 | Leak audit (public tool) | Lead generation |
| 2 | Holdout groups on every campaign | Report incremental covers, not claimed results |
| 2 | Listing-drift guard for Google Business Profile | Protects reservation traffic from edited hours, phone or booking link |
| 2 | Done-for-you SMS registration (10DLC) | Removes a compliance step owners struggle with |
| 3 | Seated-cover attribution for Google and Meta ads | Report cost per seated cover |
| 3 | Gift cards, catering quotes and invoices, AI phone answering | Full-suite value; phone answering is now table stakes (DashOS ships it) |
| Later | Ordering modifiers, POS hand-off, delivery | Where Owner and Open are strongest; not our fight first |

---

## 4. Why now

| Trigger | What happened | Source |
|---|---|---|
| OpenTable 2026 terms | March 2026 contract: "system of record", all tables on the marketplace, heavy early-termination liability, fees changeable after the first term | [Restaurant Business](https://www.restaurantbusinessonline.com/technology/opentable-will-require-restaurants-make-it-their-primary-reservations-system); [Yahoo Finance](https://finance.yahoo.com/sectors/technology/articles/why-restaurants-anxious-opentable-terms-105500851.html) |
| Tock folded into Resy | Amex is retiring the Tock app and exploretock.com; every Tock venue must re-platform. Tock had about 7,000 venues at its 2024 sale | [The Points Guy](https://thepointsguy.com/news/amex-resy-credit-tock-restaurants/?utm_section=ts); [ABC/AP](https://abcnews.go.com/Business/wireStory/amex-buys-dining-reservation-company-tock-squarespace-400m-111312492) |
| DoorDash owns SevenRooms | $1.2B purchase; on September 30, 2026 SevenRooms became part of DashOS, whose marketing uses "blinded, aggregated DoorDash Marketplace insights" | [DoorDash 8-K](https://www.sec.gov/Archives/edgar/data/1792789/000162828025022396/q12025dashex991-pressrelea.htm); [DoorDash IR](https://ir.doordash.com/news/news-details/2026/DoorDash-Introduces-DashOS-One-Platform-to-Help-Restaurants-Grow/default.aspx) |
| FTC sues Toast | October 29, 2026: FTC, seven states, LA County and San Francisco allege hidden fees and cancellation traps | [DLA Piper](https://www.dlapiper.com/en/insights/publications/2026/11/ftc-and-seven-states-sue-toast) |
| Uber buying ezCater | $2.3B, agreed October 6, 2026, pending. ezCater charges about 15% commission plus 2.99% payment fee; caterers expect higher commissions | [FastCasual](https://www.fastcasual.com/articles/ubers-ezcater-deal-puts-catering-growth-margins-and-customer-loyalty-in-focus/); [ezCater help](https://catering.ezcater.com/en/help/what-is-the-commission/-payment-breakdown) |

Two longer trends help. Operators are cutting vendors: multi-unit
operators average 11.4 tech vendors, down from 13.8, and 54% are
consolidating ([FSRI](https://foodserviceresearchinstitute.com/blog/restaurant-technology-trends);
vendor-adjacent survey). And agents now do work that used to need staff or
an agency, which is why investors are funding the category (section 14).

---

## 5. Market size

### Sourced inputs

| Input | Figure | Source |
|---|---|---|
| US independent restaurants, end 2025 | 412,498 (down 2.3% from 422,001) | [Restaurant Business](https://www.restaurantbusinessonline.com/operations/number-independent-restaurants-declined-23-2025) (Technomic) |
| Full-service independents | Weakest segment: net loss of about 6,400 units in 2025 | Same source |
| US chain restaurant units | 263,000+ | Same source |
| US restaurant and foodservice sales, 2026 | $1.55T projected | [NRA](https://restaurant.org/research-and-media/media/press-releases/persistent-cost-increases-and-enduring-demand-will-shape-the-restaurant-industry-in-2026/) |

### Assumptions (not sourced)

- About **half** of independents are full-service. No sourced split was
  found; this gives roughly **200,000** locations. To validate.
- Prices are the list prices in section 6, before multi-location
  discounts.
- SOM assumes **1% of SAM locations** in about five years and a blended
  price of **$399** per location per month (an even split between the two
  plans). Both are assumptions.

### Sizing

| Level | Definition | Locations | Annual revenue at our prices |
|---|---|---|---|
| **TAM** | All US independents on the full suite ($599/mo) | 412,500 | **≈ $3.0B** (412,498 × $7,188) |
| TAM, reservations only | All independents on the Reservations plan ($199/mo) | 412,500 | ≈ $985M |
| **SAM** | Full-service independents on the full suite | ≈ 200,000 *(assumption)* | **≈ $1.4B** |
| SAM, reservations only | Full-service independents on the Reservations plan | ≈ 200,000 | ≈ $478M |
| **SOM (5 years)** | 1% of SAM locations at a blended $399/mo | ≈ 2,000 | **≈ $9.6M ARR** |

The competitive analysis puts the flat-fee TAM at roughly $2.5–5B ARR at
$499–$1,000 per location; our $3.0B sits inside that range. The base is
shrinking about 2.3% a year, which also sets a floor under customer churn
from closures.

Not found: a credible figure for tech spend per independent location, and
a count of small groups (2–20 units).

---

## 6. Business model

**Subscription per location, flat.** Pricing below is a hypothesis to
validate in 20–30 discovery interviews.

| Plan | Price per location per month | Includes |
|---|---|---|
| **Reservations** | **$199** | Booking page, host stand, targeted deposits, waitlist and notify list, guest list, import (notes kept), export, Reservations Agent |
| **The Pass** (full suite) | **$599** | Everything in Reservations, plus website, SMS and email marketing, loyalty, reviews, listings and paid-ads agents |
| Additional locations | 20% off | $159.20 / $479.20 |
| **Founding restaurants** (first 50) | **$149 / $449**, locked for 24 months | Still month to month; in exchange for feedback and a case study |

Terms on every plan:

- No per-cover, per-order or guest fees. No cut of deposits; Stripe
  processing (2.9% + 30¢ online, [Stripe](https://stripe.com/us/pricing))
  is passed through at cost.
- 2,000 SMS a month included per location, then charged at cost.
- Month to month. Cancel online.
- No exclusivity, no inventory requirements, export any time — written
  into the contract.

**What we give up.** Passing payments through at cost means no payments
revenue. Toast earns about half its ARR from payments
([Toast 8-K](https://www.sec.gov/Archives/edgar/data/0001650164/000165016426000214/tost-20260930xexhibit991.htm)).
We trade that for a clear position against the 2% deposit cut and hidden
fees.

**Where revenue grows.** Upgrades from Reservations to the full suite,
and added locations within groups.

Full model, cost per location and margins: `04-pricing-unit-economics.md`.

---

## 7. Competition

Detail: `reports/Restaurant platform competitive gaps.md`. Summary:

| Competitor | Strength | Gap we use |
|---|---|---|
| OpenTable (Booking Holdings) | Largest diner network; about 60,000 restaurants ([Entrepreneur](https://www.entrepreneur.com/business-news/doordash-buys-12b-reservation-platform-to-battle-opentable/502986)) | Per-cover fees, 2% deposit cut, 2026 lock-in terms |
| Resy + Tock (Amex) | Card credits steer premium diners; about 25,000 venues after Tock | Forced Tock migration |
| SevenRooms / DashOS (DoorDash) | Deep guest CRM, voice AI | Owned by a delivery marketplace; no public pricing; loyalty not until 2027 |
| Owner.com | $2.3B valuation, $100M+ ARR, free "Grader" funnel ([PR Newswire](https://www.prnewswire.com/news-releases/owner-raises-240m-led-by-goldman-sachs-alternatives-to-build-the-ai-native-platform-for-every-local-business-302862420.html)) | Built for ordering; no reservations or host stand found; 5% guest fee ([Owner pricing](https://owner.com/pricing)) |
| Open (Sequoia-backed) | Agents for ordering, marketing, ads, support ([Open](https://getopen.com/company)) | No evidence of reservations, host stand or review replies |
| Toast | About 189,000 locations ([Motley Fool](https://www.fool.com/earnings/call-transcripts/2026/11/04/toast-tost-q3-2026-earnings-call-transcript/)) | Tied to its POS; FTC suit; only 40,000 of 171,000 locations used Toast IQ weekly in Q1 2026 ([Toast Q1 remarks](https://s28.q4cdn.com/141746709/files/doc_financials/2026/q1/TOST-1Q26-Prepared-Remarks.pdf)) |
| Point tools (Popmenu, Birdeye, Marqii, Slang, agencies) | Depth in one area | Each adds a bill; several use annual contracts |

**What a restaurant replaces with The Pass** (list prices from the
competitive analysis; cover count is illustrative):

| Tool | Monthly |
|---|---|
| OpenTable Core | $299 |
| Network cover fees (400 covers × $1) | ~$400 |
| Owner Flat Rate | $499 |
| Toast Marketing Essentials | ~$185 |
| Marqii Scale | $180 |
| **Subtotal** | **≈ $1,560** |
| Plus Slang voice AI (~$399) and a minimum agency retainer (~$500) | **≈ $2,460** |
| **The Pass, full suite** | **$599** |

On reservations alone: OpenTable Core plus 400 network covers is about
$699 a month against $199.

**Our edge** is the record of who booked, who sat, when and how often.
POS-bound and ordering-first rivals do not hold it. It makes review
replies specific, marketing measurable against empty tables, and ad
spend accountable to seated covers.

**What we cannot match:** a diner network. Our answer is Reserve with
Google, the restaurant's own site and Instagram, the ads agent, and
coexistence mode so a restaurant can measure how many network covers it
really needs before leaving.

---

## 8. Go-to-market summary

Full plan: `02-go-to-market.md`.

1. **Founder-led selling** through the founder's personal network of
   restaurant contacts **[TO FILL: size and makeup]**.
2. **Free leak audit**: Google profile (drift, missing Reserve button),
   website, review-reply health, and the true monthly cost of the current
   reservation stack. It produces a working site with a booking page. This
   follows Owner's proven free-Grader funnel
   ([First Round Review](https://review.firstround.com/inside-owners-zigzag-path-to-a-billion-dollar-business)).
3. **Switch kits** timed to each trigger, each with its own landing page
   and importer: Tock venues now; OpenTable restaurants 60–90 days before
   their spring-2027 contract anniversaries; SevenRooms customers wary of
   DoorDash; Toast merchants after the FTC case; caterers facing Uber's
   ezCater.
4. **Founding-restaurant offer** for the first 50 locations.
5. **Expand** from Reservations to the full suite once quiet-night fill
   is proven with holdout groups.

Integrate with Toast and Square rather than fight them: 97% of multi-unit
full-service operators use one POS across all venues
([FSR](https://www.fsrmagazine.com/feature/restaurants-reach-a-technology-turning-point-rooted-in-simplicity/)).

---

## 9. Operations

| Function | How it works today | Next |
|---|---|---|
| Product and engineering | **[TO FILL: who builds the platform]** | **[TO FILL: hiring plan]** |
| Onboarding | A person from the Madison Four studio sets up the floor plan and hours and runs the import | Documented switch playbooks per competitor |
| Support | The restaurant is the guest's support; its phone is on every booking page | **[TO FILL: support hours and owner]** |
| Infrastructure | Next.js on Netlify, Postgres (Neon), Stripe, Twilio, Resend; every query scoped to one restaurant group and tested for isolation | — |
| Compliance | SMS consent recorded and checked in code before every marketing send; quiet hours; STOP honored | 10DLC registration as a service; legal review of coexistence mode under OpenTable terms |
| Studio | Madison Four designs and builds restaurant websites. The studio site stays until the platform is ready, then the homepage becomes platform-only | **[TO FILL: studio revenue and how it funds the platform]** |

**Legal entity:** **[TO FILL: entity type, state, ownership between
Madison Four and The Pass]**

---

## 10. Team

| Role | Person | Background |
|---|---|---|
| Founder / CEO | **[TO FILL: name]** | **[TO FILL: founder background]** |
| Engineering | **[TO FILL]** | **[TO FILL]** |
| Design / studio | **[TO FILL]** | **[TO FILL]** |
| Advisors | **[TO FILL]** | **[TO FILL]** |

**Founder advantage:** a large personal list of restaurant contacts
**[TO FILL: size and makeup — number of operators, full-service share,
cities]**.

**First hires (proposed):** an onboarding and switching specialist, then a
founder-led-sales associate. **[TO FILL: confirm]**

---

## 11. Milestones — next 18 months (December 2026 to May 2028)

Customer counts are targets, not forecasts.

| By | Product | Customers and proof |
|---|---|---|
| **Feb 2027** (90-day launch, per `02-go-to-market.md`) | Live Stripe deposits; import with notes, tags, allergies and history; offline host stand in build; Reserve with Google application filed; leak audit in use | 15–25 founding restaurants signed, 10–15 live; 20–30 discovery interviews done; Tock, OpenTable and SevenRooms switch kits live; first case study drafted |
| **May 2027** | Coexistence mode (after legal review); SMS live with 10DLC registration; holdout groups on campaigns; offline host stand shipped | 25+ founding locations live **[TO FILL: actuals]** |
| **Aug 2027** | Listing-drift guard; booking-aware review replies; Website Agent publishes on approval | All 50 founding locations filled; first case study with holdout-measured quiet-night fill |
| **Nov 2027** | Gift cards; catering quotes, deposits and invoices; AI phone answering | First upgrades from Reservations to full suite; Toast and caterer switch kits |
| **May 2028** | Seated-cover attribution for Google and Meta ads | **150 paying locations** (target); homepage switched to platform-only |

---

## 12. Financial plan summary

The model lives in `04-pricing-unit-economics.md`. Headlines, consistent
with the pricing in section 6:

**Cost to serve one location (per month, inference):**

| Cost | Estimate | Basis |
|---|---|---|
| SMS (2,000 included) | ≈ $25 | ≈ $0.0125 per text all-in ([Twilio](https://www.twilio.com/en-us/sms/pricing); [Twilio carrier fees](https://support.twilio.com/hc/en-us/articles/44609260499995-T-Mobile-Messaging-Carrier-Fee-Changes-January-2026)) |
| AI model calls | ≈ $10–40 | Rough, unverified estimate of a few hundred agent runs ([Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)) |
| Hosting, email, phone numbers | **[TO FILL: measure]** | Not researched |
| Card processing | $0 to us | Passed through at cost |

That points to gross margin of roughly 70–85% before support time, in line
with generic SMB SaaS benchmarks of about 75%
([Growth Unhinged](https://kylepoyar.substack.com/p/2025-saas-benchmarks-report)).
Founding prices carry thinner margins by design.

**Illustrative revenue at the 18-month target** (assumes 60% of locations
on Reservations and 40% on the full suite; ignores multi-location
discounts):

| Group | Locations | Monthly revenue |
|---|---|---|
| Founding (30 × $149, 20 × $449) | 50 | $13,450 |
| List price (60 × $199, 40 × $599) | 100 | $35,900 |
| **Total** | **150** | **≈ $49,350 MRR (≈ $592K ARR)** |

The 150-location target sits between the conservative and base cases of the three-year model in [04-pricing-and-unit-economics.md](04-pricing-and-unit-economics.md) (base case: 86 locations at the end of 2027, 337 at the end of 2028). That model, not this table, is the source for ARR, burn and headcount.

**Benchmarks for scale:** Toast earns about $564 per location per month
in subscription ARR
([Toast 8-K](https://www.sec.gov/Archives/edgar/data/0001650164/000165016426000214/tost-20260930xexhibit991.htm),
by inference). Owner reported a 4.5:1 LTV:CAC in 2024
([GetLatka](https://getlatka.com/companies/owner.com/interviews/owner-com-kyle-norton-2024)).
No public churn or CAC benchmarks for restaurant SMB SaaS were found.

**Current financials:** revenue, burn and runway **[TO FILL]**.

---

## 13. Key risks and mitigations

| Risk | Mitigation |
|---|---|
| **Restaurants fear losing network covers** if they leave OpenTable or Resy | Coexistence mode; Reserve with Google; ads agent; measure network covers before switching |
| **OpenTable contract terms** block a restaurant from making us primary | Coexistence mode for direct bookings only, after legal review; time outreach to contract anniversaries |
| **Price is wrong** — no willingness-to-pay data exists for a flat all-in-one at independent scale | Treat prices as hypotheses; 20–30 discovery interviews; founding offer gives early signal |
| **Owner.com or DashOS moves into reservations** with far more capital | Stay focused on dine-in and the seated-guest record; neutrality and month-to-month terms are hard for a marketplace-owned rival to copy |
| **Agent makes a costly mistake** (spend, wrong message) | Policy tiers in code; owner approval for money and guest messages; spend caps; change log and undo; evals before every agent change |
| **SMS compliance** — TCPA exposure of $500–1,500 per message (per `docs/AGENTIC-PLATFORM.md`; **[TO FILL: confirm with counsel]**) | Consent stored and checked in code before every marketing send; quiet hours; STOP honored; one promotion a week at most |
| **Data breach** | Each restaurant group's data isolated and tested; hold only what a booking needs; few vendors |
| **Google dependency** — Reserve with Google certification and Business Profile access | Apply early; plain booking link as fallback; listing-drift guard |
| **Closures** — independents shrink about 2.3% a year | Price month to month so churn is visible early; target groups with several locations |
| **Switching fails** (lost notes, double bookings) | Import with dry run and "nothing lost" report; database refuses overlapping holds; a person runs each move |
| **No payments revenue** lowers revenue per location vs Toast | Deliberate for positioning; revisit only with customer consent and in writing |
| **Small team, founder dependence** | **[TO FILL: hiring and continuity plan]** |

---

## 14. Funding ask and use of funds

**Raised to date:** **[TO FILL]**. **Current runway:** **[TO FILL]**.

Category context: Owner.com raised $240M at $2.3B in August 2026
([PR Newswire](https://www.prnewswire.com/news-releases/owner-raises-240m-led-by-goldman-sachs-alternatives-to-build-the-ai-native-platform-for-every-local-business-302862420.html));
Chowbus raised $81M in March 2026
([Restaurant Technology News](https://restauranttechnologynews.com/2026/03/chowbus-raises-81-million-to-expand-its-ai-powered-platform-for-independent-restaurants/)).
Strategic buyers have paid $400M for Tock
([Restaurant Business](https://www.restaurantbusinessonline.com/technology/american-express-acquiring-tock-squarespace-400m)),
$1.2B for SevenRooms
([Restaurant Dive](https://www.restaurantdive.com/news/DoorDash-acquires-sevenrooms-1-billion/747226/))
and about $2.0B for Olo
([SaaStr](https://www.saastr.com/pe-loves-saas-again-thoma-bravo-buys-olo-for-2-billion)).

### Options

| Option | Amount | What it funds | Trade-off |
|---|---|---|---|
| **A. Self-funded** | $0 raised; funded by Madison Four **[TO FILL: studio capacity]** | Priority-1 gaps and founding restaurants, founder-led | Slower; switch windows (Tock, OpenTable anniversaries) may pass |
| **B. Pre-seed** | **[TO FILL: amount]** | Priority-1 and -2 roadmap; one onboarding hire; leak audit; 50 founding restaurants | Some dilution; reach the 18-month milestones on schedule |
| **C. Seed** | **[TO FILL: amount]** | Option B plus a small sales team, AI phone answering, gift cards and catering in 2027 | More dilution; needs early proof from founding restaurants first |

### Use of funds (for B or C)

| Use | Share |
|---|---|
| Product and engineering (deposits, import, offline host stand, Reserve with Google, coexistence mode) | **[TO FILL: %]** |
| Onboarding and switching staff | **[TO FILL: %]** |
| Sales and leak-audit marketing | **[TO FILL: %]** |
| Legal and compliance (OpenTable terms review, SMS, privacy) | **[TO FILL: %]** |
| Reserve | **[TO FILL: %]** |

**The ask:** **[TO FILL: amount, instrument, valuation or cap, target
close date]**.
