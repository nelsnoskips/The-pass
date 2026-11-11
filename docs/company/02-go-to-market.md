# 02 · Go-to-market

How The Pass finds, signs, switches and keeps its first restaurants.
Written 2026-11-11 for the founder and early team.

**Read with:** `reports/Restaurant platform competitive gaps.md` (market
facts and sources), `docs/AGENTIC-PLATFORM.md` (what is built),
`docs/FRICTION.md` (what operators complain about), and the business
plan and pricing docs, which use the same numbers as this one.

**How to read the numbers.** Market facts carry a source link. Prices
and targets for The Pass are hypotheses to test in discovery
interviews, not results. Competitor prices conflict between sources;
re-check before quoting one to a prospect. Anything we do not know yet
is marked **[TO FILL: ...]**.

---

## 1. The plan in one page

| | |
|---|---|
| **Who first** | Full-service independent restaurants, 1–20 locations, that take reservations |
| **Way in** | A free "leak audit": Google profile, website, review replies, and the true monthly cost of their current reservation stack |
| **First sale** | Reservations, $199/month per location |
| **Expansion** | The Pass full suite, $599/month per location: website, guest list, SMS/email, loyalty, reviews, ads |
| **Why now** | OpenTable's 2026 contract terms, Tock being folded into Resy, DoorDash owning SevenRooms, the FTC suit against Toast, Uber buying ezCater |
| **Why us** | Neutral (no marketplace, delivery or card business), flat price, month to month, the restaurant owns its guests, agents propose and owners approve, every action logged |
| **First channel** | The founder's personal list of restaurant contacts **[TO FILL: size and makeup]** |
| **First 90 days** | Sign and go live with founding restaurants; prove a switch loses nothing; collect case studies |

---

## 2. Ideal customer profile and segments

### Who first

| Attribute | Fits | Why |
|---|---|---|
| Service style | Full-service, table service, takes reservations | Reservations, deposits and guest records matter here. Owner.com and Open are built for ordering, not the dining room (report, "Agent-run rivals") |
| Size | 1–20 locations | Big enough to feel stacked tool bills; small enough that the owner decides |
| Decision maker | Owner, operating partner, or GM with budget authority | One or two people can say yes |
| Current stack | OpenTable, Resy, Tock, SevenRooms, or a POS add-on (Toast Tables, Yelp Guest Manager) | Each has a dated reason to re-evaluate (section 5) |
| POS | Square or Toast | We sync visits from Square today. Toast integration is not built **[TO FILL: Toast integration date]** |
| Signals of pain | Pays per-cover fees; uses deposits; unhappy with contract terms; has a stale Google profile or unanswered reviews | The leak audit shows these in numbers |
| Relationship | In or one step from the founder's network | Founder-led selling converts warm contacts first |

### Segments in order

| Order | Segment | Entry offer | Notes |
|---|---|---|---|
| 1 | Tock venues facing the forced move to Resy | Tock switch kit | Tock's app and exploretock.com are being retired as Tock folds into Resy ([The Points Guy](https://thepointsguy.com/news/amex-resy-credit-tock-restaurants/?utm_section=ts)). They have to re-platform anyway |
| 2 | OpenTable restaurants approaching renewal under the March 2026 terms | OpenTable switch kit, timed 60–90 days before renewal | Renewals cluster around spring 2027 (inference in [reservations notes](../../research_notes/Restaurant%20platform%20competitive%20gaps/reservations_crm.md)). Contract review required (section 5.2) |
| 3 | SevenRooms customers uneasy about DoorDash | SevenRooms switch kit | DoorDash folded SevenRooms into DashOS on Sep 30, 2026 ([DoorDash IR](https://ir.doordash.com/news/news-details/2026/DoorDash-Introduces-DashOS-One-Platform-to-Help-Restaurants-Grow/default.aspx)) |
| 4 | Full-service Toast merchants reconsidering vendors after the FTC suit | Leak audit plus "no contract" pitch | We sit beside Toast, not replace it |
| 5 | Restaurants with a catering line on ezCater | Catering add-on (later) | Catering quotes and invoices are not built yet |

### Who later

- **Groups of 21+ locations.** Need SSO, multi-venue reporting and
  procurement. Revisit after 50 live restaurants.
- **Fast casual and counter service.** Ordering is the core need. Owner
  and Open are strong there, and our ordering lacks modifiers, POS
  hand-off and delivery (`docs/AGENTIC-PLATFORM.md`).
- **Bars and venues with ticketed events.** Different booking model.

### Who not

| Not now | Reason |
|---|---|
| Restaurants mid-way through an OpenTable initial term who want to leave now | Early exit costs 100% of remaining subscription and cover fees ([Yahoo Finance](https://finance.yahoo.com/sectors/technology/articles/why-restaurants-anxious-opentable-terms-105500851.html)). Book a call for 90 days before their renewal instead |
| Restaurants whose covers mostly come from a diner network and who will not test direct channels | We have no diner network. We will lose that argument |
| Chains outside the independent definition | Wrong buyer, wrong product |
| Anyone wanting a guaranteed revenue lift in writing | We do not promise outcomes we cannot measure |
| Delivery-only or ghost kitchens | No dining room |

---

## 3. The wedge and the expansion path

```
 Leak audit (free)  ──▶  Reservations ($199/loc)  ──▶  Full suite ($599/loc)
 Google profile           booking page, host stand,     + website, guest marketing
 website                  guest list, waitlist and      (SMS/email), loyalty, reviews
 review replies           notify list, import, export,  agent, paid ads agent,
 cost of current stack    reminders, Reservations Agent listing upkeep
```

| Step | What the restaurant gets | What has to be true first | Typical move |
|---|---|---|---|
| Audit | A one-page report of money and covers leaking today | Audit built (not yet) | Week 0 |
| Reservations | Booking, host stand, guest list, import with notes, one-click export, reminders, notify list | Import keeps notes; deposits live on Stripe | Go-live in 2–3 weeks |
| Full suite | Agents that fill quiet nights, reply to reviews, keep the Google profile right, run ads inside caps | 30 days of clean booking data in The Pass | Day 30–90 after go-live |

**Expansion triggers to watch** (the account owner raises the suite when
one appears):

- The restaurant asks for a website change or redesign.
- Thursday or Sunday covers are low and the guest list has lapsed regulars.
- Unanswered Google reviews pile up, or Google rejects replies.
- They pay an agency a percentage of ad spend. An agency at 15% of $3,000 spend costs $450/month before minimums ([Stackmatix](https://www.stackmatix.com/blog/restaurant-marketing-agency); [ALM Corp](https://almcorp.com/blog/google-ads-management-pricing-2026/)).
- They open a second location.

**Be honest about what is not built.** Sales must not promise these
before they ship:

| Not yet | Status | What to say |
|---|---|---|
| Live Stripe deposits | Deposits recorded, policy shown; Stripe to plug in | "Deposits at processing cost are in build. Date: **[TO FILL]**" |
| Host-stand offline mode | To build | "Not yet. Keep a printed book for outages until it ships" |
| Reserve with Google native button | Needs Google certification ([Google Actions Center](https://developers.google.com/actions-center/verticals/reservations/e2e/overview)) | "Your Google profile links to your booking page. The native button needs certification we are working on" |
| AI phone answering | Not built | "Not today" |
| Import of tags, allergies as a field, and full visit history | Importer carries notes, visit count and last visit (`lib/platform/importer.ts`) | "We bring notes and visit counts. We check every record with you before go-live" |
| Toast integration | Not built; Square visit sync is built | "Square today; Toast **[TO FILL]**" |
| Meta ad changes | Meta is read-only; Google writes on approval | "We report on Meta; changes there are manual for now" |
| Leak audit tool | Not built | Founder runs audits by hand until it is (section 4) |
| Live marketing SMS | Sender and consent rules built; dry run until Twilio keys and 10DLC registration | "SMS goes live after carrier registration, which takes up to five business days" ([Twilio](https://support.twilio.com/hc/en-us/articles/11587910480155-A2P-10DLC-Campaign-Vetting-FAQ)) |

---

## 4. The leak-audit funnel

Owner.com grew past founder door-knocking with a free "Grader" that
checks about 90 SEO and conversion factors and builds a site before the
prospect pays ([First Round Review](https://review.firstround.com/inside-owners-zigzag-path-to-a-billion-dollar-business)).
Ours does the same job for a dining room.

### What it checks

| Check | What we look at | What a "leak" looks like |
|---|---|---|
| **Google profile** | Hours, phone, website, booking link, holiday hours, recent edits | Hours that differ from the restaurant's real hours; no booking link; a wrong phone number. Anyone can suggest edits and the feature cannot be turned off ([Synup](https://synup.com/how-to/prevent-suggested-edits-unauthorized-changes-on-your-google-business-profile/)) |
| **Website** | Mobile load, booking button above the fold, menu as text, hours match Google | Booking is three taps deep; menu is a PDF; hours conflict |
| **Review replies** | Reply rate and speed over 90 days; templated replies | Unanswered reviews; late replies. In one study of 12,752 rejected Google replies, 92.6% answered 5-star reviews with templated language, posted about 50 days after the review ([SE Roundtable](https://www.seroundtable.com/rejected-google-review-replies-analysis-41457.html)) |
| **True cost of the reservation stack** | Monthly plan, network cover fees, % taken on deposits and no-show fees, contract term and exit terms | e.g. OpenTable Core $299 + 400 network covers at $1.00 + 2% of deposits ([Eat App](https://restaurant.eatapp.co/blog/opentable-pricing); [TableHelm](https://www.tablehelm.com/blog/opentable-2-percent-service-fee-explained)) |

The cost line uses the restaurant's own invoice, not list prices. We
ask for one recent invoice. If they will not share it, we show list
prices and label them as such.

### How it is delivered

| Phase | How | Owner |
|---|---|---|
| Now (manual) | Founder or team member runs the checks by hand from public data plus the invoice. One-page PDF and a 15-minute walk-through, in person where possible | Founder |
| Next (assisted) | A form takes the restaurant's name and Google listing; our agents draft the profile, website and review sections; a person checks and sends | Product **[TO FILL: build date]** |
| Later (self-serve) | Runs on the site in minutes and offers a draft booking page and site, like Owner's Grader | Product |

**Rules for the audit:**

- Show the numbers and their source. Missing data shows `—`, never `$0`.
- No scare claims. If their stack is fine, say so.
- Give them something useful even if they never buy: the list of fixes.
- Do not contact their guests or change anything on their profile.

### What converts (hypotheses to test)

| Hypothesis | How we will know |
|---|---|
| A dollar figure for "what your reservation stack costs per year" moves owners more than feature lists | Compare conversion on audits with and without an invoice-based figure |
| The walk-through in person converts better than a sent PDF | Track audit → trial by delivery method |
| The "nothing lost" import check (section 8) removes the main fear | Count how often "switching is risky" is the stated reason for no |
| A named switch trigger with a date (renewal, Tock retirement) speeds the decision | Days from audit to signature, with and without a trigger |

---

## 5. Switch-kit campaigns

Each kit has: a landing page, an importer preset for that system's
export, a one-page comparison, a script, and a timeline. Dates are from
the research; re-check before each send.

| Kit | Trigger and date | Who | Timing | Core message |
|---|---|---|---|---|
| **Tock** | Tock folded into Resy; Tock venues bookable on Resy from Aug 11, 2026; Tock app and site to be retired ([AwardWallet](https://awardwallet.com/news/amex-membership-rewards/resy-credit-tock-venues/); [The Points Guy](https://thepointsguy.com/news/amex-resy-credit-tock-restaurants/?utm_section=ts)) | Tock venues | Now through Q1 2027 | "You are moving anyway. Move to a system you own, with your notes intact" |
| **OpenTable** | March 2026 agreement: 12-month auto-renew; exit costs 100% of remaining fees in the initial term, 50% of subscription plus 100% of cover fees in renewal; fees changeable after the initial term; 2% on deposits, no-show fees and prepaid since Jan 2026 ([Yahoo Finance](https://finance.yahoo.com/sectors/technology/articles/why-restaurants-anxious-opentable-terms-105500851.html); [TableHelm](https://www.tablehelm.com/blog/opentable-2-percent-service-fee-explained)) | OpenTable restaurants | 60–90 days before each renewal; first wave Dec 2026–Feb 2027 for spring 2027 renewals | "Know your renewal date and your exit cost. Then decide" |
| **SevenRooms** | DoorDash bought SevenRooms ($1.2B) and folded it into DashOS on Sep 30, 2026; marketing tools use "blinded, aggregated DoorDash Marketplace insights"; no published price ([DoorDash IR](https://ir.doordash.com/news/news-details/2026/DoorDash-Introduces-DashOS-One-Platform-to-Help-Restaurants-Grow/default.aspx)) | SevenRooms venues | Now; again at each contract anniversary **[TO FILL: typical term]** | "Your guest list should not sit inside a delivery company" |
| **Toast** | FTC, seven states, LA County and San Francisco sued Toast on Oct 29, 2026 over hidden fees, termination fees and phone-only cancellation. Toast disputes the claims ([DLA Piper](https://www.dlapiper.com/en/insights/publications/2026/11/ftc-and-seven-states-sue-toast)) | Full-service Toast merchants using Toast Tables or Toast marketing | Now through the news cycle | "Keep your POS. Add a guest system you can cancel online" |
| **Catering (later)** | Uber agreed Oct 6, 2026 to buy ezCater for $2.3B (pending); ezCater charges about 15% commission plus 2.99% payment fee ([FastCasual](https://www.fastcasual.com/articles/ubers-ezcater-deal-puts-catering-growth-margins-and-customer-loyalty-in-focus/); [ezCater help](https://catering.ezcater.com/en/help/what-is-the-commission/-payment-breakdown)) | Full-service restaurants with a catering line | When catering quotes and invoices ship **[TO FILL: date]** | "Keep your catering regulars direct" |

### 5.1 Rules for every kit

- State facts about competitors with a source. Never call a pending
  lawsuit a finding. Say "the FTC alleges" and "Toast disputes".
- Do not disparage. Name what the competitor does well (see
  `03-positioning-and-messaging.md`).
- The restaurant reads its own contract. We do not give legal advice.

### 5.2 OpenTable: contract review before coexistence

OpenTable's 2026 terms require it to be the restaurant's "system of
record" for reservations, table and guest management, and require all
tables to be offered on its marketplace ([Restaurant Business](https://www.restaurantbusinessonline.com/technology/opentable-will-require-restaurants-make-it-their-primary-reservations-system)).
Running The Pass alongside OpenTable may therefore be a contract issue.

- **Do not recommend running both systems** until our counsel has
  reviewed OpenTable's agreement and the restaurant has checked its own.
  **[TO FILL: legal review owner and date]**
- Until then, the default offer to a restaurant under contract is: find
  the renewal date, model the exit cost, and schedule the switch for
  renewal.
- A "coexistence mode" that takes only direct bookings (website, Google,
  Instagram) is a product idea pending that review, not a sales promise.
- An older report says restaurants running a second system beside
  OpenTable paid about $250/month per location; it is unverified
  ([WebProNews](https://www.webpronews.com/opentables-grip-tightens-restaurants-rebel-against-primary-system-mandate/)).

---

## 6. Working the founder's contact list

The list is our first and cheapest channel. Owner.com started the same
way, with founder door-knocking and cold email ([First Round Review](https://review.firstround.com/inside-owners-zigzag-path-to-a-billion-dollar-business)).

**List size and makeup: [TO FILL: number of contacts; how many are
owners/GMs vs chefs, vendors, investors; cities; current reservation
systems if known].**

### 6.1 Tiers

| Tier | Who | Approach | Goal |
|---|---|---|---|
| **A** | Owners or GMs of full-service independents (1–20 locations) the founder knows well | Personal text or call, then visit | Founding restaurant |
| **B** | Owners/GMs the founder knows less well, or restaurants that fit but use a system with no near trigger | Personal email, then audit | Audit, then founding restaurant or a dated follow-up |
| **C** | Connectors: chefs, suppliers, POS reps, agency owners, association staff, investors | Personal email | Two introductions each |
| **D** | Doesn't fit (fast casual, chains, out of industry) | No outreach now | Keep warm with a quarterly note |

Tag each contact in a simple sheet: tier, restaurant, locations,
current reservation system, POS, renewal date if known, last contact,
next step. **[TO FILL: CRM or sheet location]**

### 6.2 Sequence

| Day | Tier A | Tier B | Tier C |
|---|---|---|---|
| 0 | Personal text | Personal email | Personal email |
| 2 | Call if no reply | — | — |
| 3–7 | Visit (audit walk-through) | Send audit if they said yes | Follow-up on intros |
| 7 | — | Second email with one finding from their public profile | — |
| 14 | Follow-up text with their audit's top number | Last note: "I'll check back at [renewal month]" | Thank-you and update |
| 30+ | Founding offer decision | Dated reminder before their trigger | Quarterly update |

**Rules:** One-to-one messages written and sent by the founder, not a
bulk tool. Stop on the first "not interested". Commercial email
includes our postal address and a way to opt out; confirm current rules
with counsel before any email volume. Visit Tuesday–Thursday between
lunch and dinner service; never on a Friday or Saturday night.

### 6.3 Scripts

Fill the brackets. Keep the founder's own voice.

**Text (Tier A)**

> Hi [Name], it's [Founder]. I'm building a reservations and guest
> system for independent restaurants: flat price, month to month, your
> guest list stays yours. I'd like to run a free check of your Google
> profile, site, review replies and what your reservations really cost
> you each month. Takes me a day, 15 minutes to walk you through.
> Could I stop by [day] between lunch and dinner?

**Email (Tier B)**

> Subject: What [Restaurant]'s reservations cost per year
>
> [Name],
>
> I'm building The Pass, a reservations and guest system for
> independent restaurants. There is no marketplace, delivery or card
> business behind it, so your guest list is only used for you. It's a
> flat monthly price with no per-cover fees and no cut of deposits, and
> you can cancel online.
>
> I'd like to send you a free one-page audit: your Google profile,
> website, review replies, and the full monthly cost of your current
> reservation setup. If you share a recent invoice I'll use your real
> numbers. No obligation, and the list of fixes is yours either way.
>
> Worth 15 minutes next week?
>
> [Founder]

**Email (Tier C, intro ask)**

> [Name], I'm starting The Pass, a reservations and guest system for
> full-service independents. Who are two owners you know who are on
> OpenTable, Tock or SevenRooms and have opinions about it? I'll offer
> them a free audit, nothing more. A short forwardable note is below.

**Visit (walk-through, 15 minutes)**

1. "Thanks for the time. I'll show you what I found, then ask a few
   questions." (2 min)
2. Walk the four checks, starting with the cost line. Point to the
   source for each number. (6 min)
3. Ask: "Which of these bothers you most?" Listen. (3 min)
4. If there is interest: "We're taking 50 founding restaurants. Here's
   what that means." Explain terms (section 7). (3 min)
5. Agree one next step with a date: send export file, check renewal
   date, or a no. (1 min)

Leave the printed audit behind.

### 6.4 Referral ask

| When | Ask |
|---|---|
| At signature | "Who are two owners you'd want running the same system as you?" |
| After the first good month | "Would you take one call from an owner considering us?" |
| After the case study | "Could I quote you on our site?" (written approval only) |

**Referral reward (hypothesis):** one month free for the referrer per
referred restaurant that stays 60 days. **[TO FILL: approve or change]**
No research found evidence on whether referrals work in this category
([GTM notes](../../research_notes/Restaurant%20platform%20competitive%20gaps/allinone_agents_gtm.md)),
so track it.

---

## 7. Founding-restaurant program

### Criteria

| Must | Nice to have |
|---|---|
| Full-service independent, 1–20 locations | On a system with a near trigger (Tock, OpenTable renewal within 6 months, SevenRooms) |
| Owner or GM with authority to sign | Uses Square (visit sync works today) |
| Takes reservations most nights | Has a guest export with notes |
| Not locked into a contract it would breach by switching, or switches at renewal | In a city where we can visit in person **[TO FILL: launch cities]** |
| Agrees to the asks below | Has 2+ locations (expansion potential) |

### Terms

| | Founding | Standard (hypothesis) |
|---|---|---|
| Reservations | $149/month per location | $199/month per location |
| The Pass full suite | $449/month per location | $599/month per location |
| Price lock | 24 months | — |
| Contract | Month to month, cancel online | Month to month, cancel online |
| Additional locations | 20% off | 20% off |
| SMS | 2,000/month included, then at cost | Same |
| Fees | No per-cover, per-order or guest fees; no cut of deposits | Same |
| Seats | First 50 restaurants | — |

### What we ask in return

1. A 30-minute feedback call every two weeks for the first 90 days.
2. A short written or recorded case study after 90 days, with their
   real numbers, subject to their written approval of the final text.
3. One reference call a month for prospects, at most.
4. Permission to use anonymized usage data to improve the product.

The 24-month lock is a price guarantee from us, not a commitment from
them. They can leave any month.

---

## 8. Sales process

| Stage | What happens | Exit criteria (all must be true) |
|---|---|---|
| **1. Lead** | Contact identified (list, referral, inbound, event) | Fits the ICP on paper; tier assigned |
| **2. Conversation** | Text, email, call or visit | Decision maker agreed to an audit |
| **3. Audit** | Four checks run and walked through | Audit delivered; their top pain named in their words; current system, POS, contract term and renewal date recorded |
| **4. Qualified** | Fit and timing confirmed | No contract breach from switching (or switch dated to renewal); budget owner identified; at least one leak worth more than our price |
| **5. Proposal** | Founding or standard offer sent, with go-live date | Written proposal sent; questions answered; export file requested |
| **6. Signed** | Online sign-up and payment method | Account created; plan selected; kickoff date set |
| **7. Live** | Onboarding (section 9) complete | First real booking taken in The Pass; staff trained; export verified |
| **8. Expanded** | Full suite or more locations | Upgrade accepted in the app |

**Lost reasons** are recorded with every closed-lost deal (one of:
contract, price, network covers, switching risk, timing, product gap
named, no response). Review weekly.

---

## 9. Onboarding and migration

The failure to avoid: when Union Square Cafe moved from Resy to
SevenRooms, "the restaurant's notes on some guests weren't showing up
in the system" ([Caper](https://caper.media/p/union-square-hospitality-group-reservation-move-sevenrooms-opentable)).
We sell the switch on getting this right.

### 9.1 Import that keeps notes and history

| Step | What happens | Today |
|---|---|---|
| 1. Get the export | Restaurant downloads guest and future-booking exports from the old system; we send step-by-step instructions per system | Instructions to write per system **[TO FILL]** |
| 2. Dry run | Import runs without saving; report lists rows, created, updated, skipped with reasons, missing columns | Built (`lib/platform/importer.ts`) |
| 3. "Nothing lost" check | Side-by-side sample of 25 guests with the most notes and visits; owner confirms each looks right | To build as a report; do by hand now |
| 4. Import | Guests, notes, visit counts, last visit, and future bookings as holds. Nobody is opted in to texts unless the file says so | Built. Tags, allergy fields and full visit history are not carried yet; flag before import |
| 5. Double-booking guard | Future bookings imported as holds; the database refuses overlapping holds whatever the source | Built and tested |

### 9.2 Staff training

| Who | What | Length |
|---|---|---|
| Hosts | Host stand: seat, move, cancel, waitlist, notify list, marking no-shows (a seated party cannot become a no-show) | 45 minutes on site, plus a one-page card at the stand |
| Managers | Settings: hours, closures, tables, deposits policy text, export | 30 minutes |
| Owner | Approval queue: what agents propose, how to approve or reject, the change log | 20 minutes |
| All | Who to call for help **[TO FILL: support line and hours]** | — |

### 9.3 Go-live checklist

- [ ] Floor plan, tables and service periods set and checked by a manager
- [ ] Hours on Google match The Pass
- [ ] Import dry run clean; "nothing lost" sample signed off by owner
- [ ] Future bookings imported as holds; spot-check 10 against old system
- [ ] Booking page live on website, Google profile and Instagram link
- [ ] Confirmation and reminder messages read and approved by owner
- [ ] Cancellation and deposit policy text approved
- [ ] SMS sender registered (10DLC) or messages set to email until approved
- [ ] Hosts trained; card at host stand
- [ ] Old system's booking links removed or redirected (on the date the contract allows)
- [ ] Full export from The Pass tested once, so the owner sees they can leave
- [ ] First-week check-in booked

### 9.4 First 30 days: success metrics

| Metric | Target (hypothesis) | Source |
|---|---|---|
| Bookings taken in The Pass vs same weeks last year (old system) | Within 10% in weeks 1–2; equal or better by day 30 | Restaurant's old reports vs The Pass |
| Guests imported with notes intact | 100% of sampled records | "Nothing lost" check |
| Double bookings | 0 | Host stand |
| Host-reported issues open after 48 hours | 0 | Support log |
| Owner logs in to approve or review at least weekly | Yes | Change log |
| Online search and booking traffic after switch | No drop >15% without a flag to the owner | Website and Google profile data |
| Owner would recommend us (asked at day 30) | Yes | Feedback call |

If bookings fall more than 15% for two weeks, the account owner calls
the owner, finds the cause, and writes it up. One Owner.com reviewer
reported online sales falling at least $6,000 in the first month after
switching ([Capterra](https://capterra.com/p/10002488/Owner/)); we
watch for the same.

---

## 10. Channels, ranked

| Rank | Channel | Why this rank | Cost | When |
|---|---|---|---|---|
| 1 | **Founder-led selling** | Warm list, highest trust, fastest learning. Owner.com began this way | Founder time | Now |
| 2 | **Referrals from founding restaurants** | Owners trust other owners. Untested in this category, so measure it | One free month per referral (hypothesis) | From first go-live |
| 3 | **Local restaurant associations and chambers** | They already carry operator complaints: a Seattle chamber leader took OpenTable's terms to the Washington AG ([Washington State Standard](https://washingtonstatestandard.com/2026/04/15/opentables-new-rules-have-a-seattle-business-leader-calling-foul/)); state associations track reservation laws ([CalRest](https://www.calrest.org/news/california-state-assembly-passes-bill-crack-down-black-market-restaurant-reservations)). Offer a talk on contract terms and true reservation cost, not a pitch | Membership and time | Month 2+ |
| 4 | **POS and agency partners** | 97% of multi-unit full-service operators run one POS everywhere ([FSR](https://www.fsrmagazine.com/feature/restaurants-reach-a-technology-turning-point-rooted-in-simplicity/)), so POS resellers and Square/Toast consultants see our buyers. Open lists itself in Toast's partner directory ([Toast](https://pos.toasttab.com/partners/directory/Open)). Agencies that build sites but don't want to run ads are another route. Needs integrations first | Revenue share **[TO FILL]** | After Toast integration |
| 5 | **Content and SEO** | Switch-kit pages ("leaving Tock", "OpenTable 2026 terms explained", "true cost of reservations") answer searches that owners make at the trigger moment. Slow to build | Writing time | Start month 1; results month 4+ |
| 6 | **Paid** | Most expensive per lead and least trusted. Use our own Paid Ads agent on narrow searches (e.g. "Tock alternative") as a test of the product, with a hard cap | Capped test **[TO FILL: monthly cap]** | Month 3, small test |

Owner.com's sales mix is estimated at 60–70% inbound, 30–40% outbound
and 5–10% partner; that is a third-party estimate, not company-reported
([Contrary Research](https://research.contrary.com/company/owner)).
We start almost fully outbound and should not expect inbound until the
audit is self-serve.

---

## 11. 90-day launch plan

Starts Monday Nov 16, 2026. Restaurants are busy through the holidays;
lean on calls and visits in quiet afternoons and use late December for
build work.

| Week | Dates | Sales and marketing | Product and onboarding | Milestone |
|---|---|---|---|---|
| 1 | Nov 16 | Tier the contact list; write scripts; build audit template | Write per-system export instructions (Tock, OpenTable, SevenRooms, Resy) | List tiered |
| 2 | Nov 23 | First 20 Tier A texts and calls (light week: Thanksgiving) | "Nothing lost" check as a manual report | 20 contacted |
| 3 | Nov 30 | 5 audit walk-throughs; Tier C intro emails | Legal review of OpenTable terms started | 5 audits |
| 4 | Dec 7 | Next 20 Tier A; first founding offers | First founding restaurant onboarding | First signature |
| 5 | Dec 14 | Tier B emails; Tock switch-kit page live | Go-live #1; daily check-ins | First live restaurant |
| 6 | Dec 21 | Light outreach (holiday rush) | Fix issues from go-live #1; Stripe deposits work | — |
| 7 | Dec 28 | Plan OpenTable renewal wave: collect renewal dates | Build week | — |
| 8 | Jan 4 | OpenTable switch-kit page live; first renewal-dated outreach | Go-lives #2–4 | 4 live |
| 9 | Jan 11 | Tier B follow-ups; SevenRooms kit page live | Host-stand offline mode in build | — |
| 10 | Jan 18 | First association contact; referral asks to live restaurants | Go-lives #5–8 | 8 live |
| 11 | Jan 25 | Toast kit message tested in 10 conversations | First suite upgrades proposed to live restaurants with 30 days of data | First suite upsell |
| 12 | Feb 1 | First case study drafted (with owner approval) | Day-30 reviews for early restaurants | Case study draft |
| 13 | Feb 8 | Review metrics; set next-quarter targets; small paid test | Go-lives continue | 90-day review |

Owners: **[TO FILL: who runs sales, onboarding, product each week]**.

---

## 12. Metrics and targets (hypotheses)

All targets are starting guesses for a founder-led launch. Replace them
after week 6 with what we see. No public CAC or churn benchmarks for
restaurant SMB SaaS were found beyond Owner's 4.5:1 LTV:CAC in 2024
([GetLatka](https://getlatka.com/companies/owner.com/interviews/owner-com-kyle-norton-2024)).

### Funnel (90 days)

| Metric | Target | Notes |
|---|---|---|
| Tier A and B contacts reached | **[TO FILL: depends on list size]** | — |
| Contact → audit | 30% | Warm list assumption |
| Audit → signed | 30% | Founding offer assumption |
| Signed founding restaurants | 15–25 | Toward 50 total by **[TO FILL: date]** |
| Live restaurants | 10–15 | Live = taking real bookings in The Pass |
| Days from audit to signature (median) | ≤ 21 | Faster with a trigger date |
| Days from signature to live (median) | ≤ 14 | — |

### Product and retention

| Metric | Target | Notes |
|---|---|---|
| Guest records with notes intact after import | 100% of sampled | Main switching promise |
| Monthly logo churn after day 60 | < 2% | Industry floor: independents closed at about 2.3% a year in 2025 ([Restaurant Business](https://www.restaurantbusinessonline.com/operations/number-independent-restaurants-declined-23-2025)) |
| Live restaurants on the full suite by day 90 | 20% | Expansion test |
| Agent proposals approved | ≥ 50% | Below that, proposals are not useful |
| Referral introductions per live restaurant | 1 | — |

### Money

| Metric | Target | Notes |
|---|---|---|
| Average revenue per location per month | Report in cents; founding mix pulls it below list | — |
| SMS cost per location per month | ≤ $25 at 2,000 texts | Twilio about $0.012–0.013 per segment all-in ([Twilio](https://www.twilio.com/en-us/sms/pricing)) |
| Gross margin | 75%+ | Generic SMB SaaS benchmark ([Growth Unhinged](https://kylepoyar.substack.com/p/2025-saas-benchmarks-report)) |
| Sales and marketing cash spend | **[TO FILL: budget]** | — |

---

## Open items

- **[TO FILL]** Contact list size and makeup; launch cities; team roles;
  support hours; budget; referral reward approval.
- **[TO FILL]** Legal review of OpenTable's 2026 agreement before any
  side-by-side recommendation.
- **[TO FILL]** Ship dates: Stripe deposits, host-stand offline mode,
  import of tags/allergies/history, leak-audit tool, Toast integration,
  Reserve with Google certification.
- Validate prices in 20–30 discovery interviews (script in
  `03-positioning-and-messaging.md`). The research found no
  willingness-to-pay data for a flat all-in-one at independent scale.
