# 03 · Positioning and messaging

What we say about The Pass, how we say it, and how we answer
competitors and objections. Written 2026-11-11 for the founder and
early team.

**Ground rules for every word we publish or say:**

- Plain English. Short sentences. No "revolutionary", "seamless",
  "game-changing", "unlock", "supercharge".
- Every claim about a competitor carries a source and a date. Prices
  conflict between sources; re-check before quoting one.
- Every claim about The Pass is something built today, or is labeled
  "in build" with a date. See the "not built yet" table in
  `02-go-to-market.md`, section 3.
- No invented customers, quotes or results. Testimonials only with the
  restaurant's written approval.
- Pending lawsuits are allegations. Say "the FTC alleges".

---

## 1. Positioning statement

> **For** full-service independent restaurants with 1–20 locations
> **who** want to own their guest list and stop paying a cut on every
> cover and deposit,
> **The Pass is** a reservations and guest platform, run by agents that
> propose and owners who approve,
> **that** keeps the restaurant's guests, data and ad accounts the
> restaurant's own, at one flat monthly price, month to month.
> **Unlike** OpenTable, Resy and SevenRooms, each now owned by a travel
> company, a card network or a delivery company, **The Pass** has no
> marketplace, delivery or card business behind it, and logs every
> action it takes.

**Short version (one line):** Your reservations and guests, on a
system you own. Flat price. Cancel online.

**Why it holds up:** The three reservation leaders each have a parent
with another business. Booking Holdings owns OpenTable, American
Express owns Resy and Tock, and DoorDash owns SevenRooms
([Entrepreneur](https://www.entrepreneur.com/business-news/doordash-buys-12b-reservation-platform-to-battle-opentable/502986);
[Resy newsroom](https://blog.resy.com/newsroom/to-enhance-dining-platform-american-express-enters-agreement-to-acquire-tock-from-squarespace-also-agrees-to-acquire-rooam/);
[DoorDash 8-K](https://www.sec.gov/Archives/edgar/data/1792789/000162828025022396/q12025dashex991-pressrelea.htm)).
The well-funded all-in-ones, Owner.com and Open, start from website and
online ordering, not the dining room
([Owner.com](https://www.prnewswire.com/news-releases/owner-raises-240m-led-by-goldman-sachs-alternatives-to-build-the-ai-native-platform-for-every-local-business-302862420.html);
[Open](https://getopen.com/company)).

---

## 2. Messaging pillars

| # | Pillar | What we say | Proof points (built today unless noted) |
|---|---|---|---|
| 1 | **Your guests are yours** | Your guest list is used only for your restaurant. We never market other restaurants, delivery or card perks to your guests. Export everything any time | Guests stored per restaurant; every query scoped to one restaurant and tested. One-click export of guests with consent history and bookings. Confirmations and reminders mention only your restaurant (`docs/FRICTION.md`). No marketplace, delivery or card business |
| 2 | **One flat price, no cuts** | $199/month per location for Reservations. No per-cover fees, no per-order fees, no guest fees, no cut of deposits. Month to month; cancel online | Pricing (hypothesis, see pricing doc). Compare: OpenTable charges per network cover and 2% on deposits and no-show fees since Jan 2026 ([TableHelm](https://www.tablehelm.com/blog/opentable-2-percent-service-fee-explained)). Deposits at processing cost: **in build [TO FILL: date]** |
| 3 | **Agents propose, you approve** | Our agents do the work: fill quiet nights, draft review replies, keep your Google profile right, watch your ad spend. Anything that spends money or messages guests waits for your OK. Every action is logged with who did it and why | Policy check in code before every action; approval queue; `change_log` with the actor. Marketing texts only with recorded consent, at most one a week, 10am–8pm, STOP honored (`docs/AGENTIC-PLATFORM.md`) |
| 4 | **Built on who actually sat down** | We know who booked, who sat, when and how often. That makes marketing aim at empty tables, review replies specific, and ad spend accountable to seated covers | Reservations engine and host stand; visit counts from bookings plus Square checks. Reservations Agent targets lapsed regulars against quiet shifts. Paid Ads and Search Terms agents run on real Google Ads and Meta data. Seated-cover attribution back to ad platforms: **planned** |
| 5 | **Switch without losing anything** | We move your guest notes and visit history and show you a check before go-live. Your future bookings come over and can't double-book | Import with dry run carries notes, visit counts, last visit and future bookings; no one is opted in to texts unless the file says so. Overlapping holds refused by the database. Tags, allergy fields and full visit history: **in build**. "Nothing lost" check: manual today |

**Pillar order by audience:**

| Audience | Lead with |
|---|---|
| OpenTable restaurant | 2, then 1 |
| Tock or SevenRooms venue | 1, then 5 |
| Toast merchant | 2 (terms), then 3 |
| Owner who runs ads or an agency | 4, then 3 |
| Owner afraid of AI | 3 |

---

## 3. Homepage copy direction

The studio site stays until the app is ready; this is direction for the
platform homepage when it switches.

| Section | Direction | Draft copy |
|---|---|---|
| Headline | Say what it is and the core promise in under 10 words | "Reservations and guests, on a system you own." |
| Subhead | Price model and terms | "One flat price per location. No cover fees, no cut of deposits. Month to month, cancel online." |
| Primary button | The audit, not a demo | "Get your free leak audit" |
| Secondary button | For people ready to look | "See pricing" |
| Proof strip | Facts, not logos (until we have approved ones) | "No marketplace · No delivery business · Export any time · Every agent action logged" |
| How it works | Three steps with screenshots from the real product | 1. "We move your guests and bookings, notes included." 2. "Your hosts run the night from the host stand." 3. "Agents propose; you approve from your phone." |
| The agents | One line each, each ending with what needs approval | "Reservations Agent: finds quiet nights and drafts a text to regulars who haven't been in. You approve before it sends." |
| Switching | Link to switch kits by system | "Leaving Tock? On OpenTable's 2026 terms? On SevenRooms? Start here." |
| Neutral | Plain statement | "We don't run a diner app, a delivery service or a card program. Your guests are only ever marketed by you." |
| Testimonials | Only approved founding restaurants | **[TO FILL: approved quotes after case studies]** |
| Footer trust | Link to the terms in plain English | "Read our terms. They're two pages." **[TO FILL: confirm length]** |

**Avoid on the homepage:** claimed revenue lifts we haven't measured,
"AI-powered" as a headline, competitor logos, feature lists longer than
six items.

---

## 4. Pricing-page copy direction

The pricing page is itself a sales argument: a trust page in the
places where competitors hide terms.

| Element | Direction |
|---|---|
| Two plans, side by side | **Reservations** $199/month per location. **The Pass** (full suite) $599/month per location. Additional locations 20% off |
| What's included | Reservations: booking page, host stand, guest list, waitlist and notify list, reminders, import, export, Reservations Agent. Full suite adds: website, SMS/email marketing, loyalty, Reviews agent, Paid Ads agent, listing upkeep. Mark anything not live as "coming [month]" |
| What's not charged, in writing | "No per-cover fees. No per-order fees. No fees to your guests. No cut of deposits or no-show fees; card processing at cost." |
| SMS | "2,000 texts per location per month included. After that, at our cost, shown on your bill." |
| Terms | "Month to month. Cancel online, any day. No exit fee. Export everything." |
| Founding offer | "First 50 restaurants: $149 / $449, locked for 24 months, still month to month. In return: feedback calls and a case study." Show seats remaining honestly |
| Cost calculator | Inputs: current plan price, network covers per month, cover fee, monthly deposit volume and % taken, other tools. Output: their annual cost vs ours, with each input's source shown. Missing inputs show `—`, never `$0` |
| Comparison table | Our terms vs published terms of OpenTable, Resy, SevenRooms, Toast Tables, with sources and "as of" dates. No adjectives |
| FAQ | "What if I'm under contract?" → "Read your agreement first. Many restaurants switch at renewal; we'll help you plan the date." |

---

## 5. Head-to-head talk tracks

Format for each: what they do well (say it), where we differ, what to
ask, what not to say.

### OpenTable (Booking Holdings)

| | |
|---|---|
| **They're good at** | The largest diner network, about 60,000 restaurants ([Entrepreneur](https://www.entrepreneur.com/business-news/doordash-buys-12b-reservation-platform-to-battle-opentable/502986)). Diners know it |
| **Where we differ** | Flat price vs plan fee plus per-cover fees (reported $1.00–$1.50 per network cover; [Eat App](https://restaurant.eatapp.co/blog/opentable-pricing)). No cut of deposits vs 2% since Jan 2026. Month to month vs the March 2026 terms: 12-month auto-renew, exit at 100% of remaining fees in the initial term, fees changeable after it, must be the "system of record", all tables on the marketplace ([Yahoo Finance](https://finance.yahoo.com/sectors/technology/articles/why-restaurants-anxious-opentable-terms-105500851.html); [Restaurant Business](https://www.restaurantbusinessonline.com/technology/opentable-will-require-restaurants-make-it-their-primary-reservations-system)) |
| **Ask** | "When does your agreement renew? What would leaving cost today? How many of your covers last month came from the OpenTable network vs your own site and Google?" |
| **Track** | "OpenTable does bring diners. The question is how many of your covers need the network, and what you pay for the rest. Let's look at your last invoice and your renewal date, then decide." |
| **Don't say** | "Run us alongside OpenTable." The system-of-record clause may make that a contract problem. Legal review first (see `02-go-to-market.md`, 5.2). Don't call the terms illegal; the Washington AG said it would *review* them ([Washington State Standard](https://washingtonstatestandard.com/2026/04/15/opentables-new-rules-have-a-seattle-business-leader-calling-foul/)) |

### Resy (American Express), including Tock

| | |
|---|---|
| **They're good at** | Premium diners steered by Amex card credits; no cover fees; clean product. Resy's page lists $289 Platform / $459 Platform 360 (third-party guides list $249/$399/$899; `docs/FRICTION.md`, [Eat App](https://restaurant.eatapp.co/blog/opentable-vs-resy)) |
| **Where we differ** | Our guest list isn't tied to a card program. No percentage on prepayments (Tock-powered plans add 2–3%; `docs/FRICTION.md`). For Tock venues: they must re-platform anyway, as Tock's app and site are retired ([The Points Guy](https://thepointsguy.com/news/amex-resy-credit-tock-restaurants/?utm_section=ts)) |
| **Ask** | "How many of your bookings come with an Amex credit attached? If you're on Tock, what's your plan and date for the move?" |
| **Track** | "Resy is a good product and the Amex diners are real. If you're on Tock, you're moving either way. Move once, to a system where your notes come with you and your guests aren't part of a card program." |
| **Don't say** | That Resy is losing Tock data. We have no evidence of that. Do cite the Union Square Cafe case only as a general risk of switching ([Caper](https://caper.media/p/union-square-hospitality-group-reservation-move-sevenrooms-opentable)) |

### SevenRooms / DashOS (DoorDash)

| | |
|---|---|
| **They're good at** | The deepest guest CRM in the category; now bundled with AI voice answering, AI reviews and campaigns in DashOS. No cover fees on bookings made in the DoorDash app ([DoorDash IR](https://ir.doordash.com/news/news-details/2026/DoorDash-Introduces-DashOS-One-Platform-to-Help-Restaurants-Grow/default.aspx); [Food On Demand](https://foodondemand.com/05122026/doordash-ramps-up-reservations-with-largest-expansion-yet/)) |
| **Where we differ** | Neutral: no delivery marketplace. DashOS marketing uses "blinded, aggregated DoorDash Marketplace insights"; DoorDash called merging delivery and in-store data "still to be determined" ([Restaurant Business](https://restaurantbusinessonline.com/technology/sevenrooms-deal-doordash-enters-dining-room)). DoorDash gives diners $10–12 credit per booking: loyalty to the app, not the restaurant. Published flat price vs quote-only (reported $499–$1,000/venue, unverified; [Servme](https://www.servmeco.com/resources/sevenrooms-competitors)) |
| **Ask** | "What does your SevenRooms contract say about guest data now that DoorDash owns it? Have you read the DashOS terms? What do you pay today?" |
| **Track** | "SevenRooms built a strong CRM. It now belongs to a delivery company whose business is the guest's next order. SevenRooms says your data doesn't flow to the marketplace; we'd rather you never have to ask." |
| **Don't say** | That DoorDash is using their guest data. SevenRooms says it doesn't ([SevenRooms](https://sevenrooms.com/blog/guest-data-sevenrooms/)). Don't compete on cover fees here; DoorDash charges none in its app. We don't have voice answering; don't imply we do |

### Toast

| | |
|---|---|
| **They're good at** | The POS; about 189,000 locations ([Motley Fool Q3 2026](https://www.fool.com/earnings/call-transcripts/2026/11/04/toast-tost-q3-2026-earnings-call-transcript/)). Toast Tables Plus reported at about $199/month; Marketing Essentials about $185/month ([frontdeskreview](https://frontdeskreview.com/software/restaurant-reservation/toast-tables.md); [Restaurant Bottom Line](https://restaurantbottomline.com/2026/08/20/punchh-vs-thanx-vs-toast-loyalty-restaurant-loyalty-2026/)) |
| **Where we differ** | We don't replace their POS. Our guest record survives a POS change. Online cancellation vs the FTC's allegations of phone-only cancellation and $150-per-remaining-month termination fees, which Toast disputes ([DLA Piper](https://www.dlapiper.com/en/insights/publications/2026/11/ftc-and-seven-states-sue-toast)). Agents included vs sold as upsells; only about 40,000 of 171,000 locations used Toast IQ weekly in Q1 2026 ([Toast Q1](https://s28.q4cdn.com/141746709/files/doc_financials/2026/q1/TOST-1Q26-Prepared-Remarks.pdf)) |
| **Ask** | "Which Toast add-ons do you pay for? Have you looked at what leaving any of them would cost?" |
| **Track** | "Keep Toast for the POS. Put your guests and bookings on a system you can cancel online, that works whichever POS you run." |
| **Don't say** | "Toast is breaking the law." It's an allegation. Don't promise a Toast integration until it ships **[TO FILL: date]** |

### Owner.com

| | |
|---|---|
| **They're good at** | Websites and commission-free online ordering; a proven free "Grader"; $240M Series D at $2.3B, more than $100M ARR ([PR Newswire](https://www.prnewswire.com/news-releases/owner-raises-240m-led-by-goldman-sachs-alternatives-to-build-the-ai-native-platform-for-every-local-business-302862420.html)). Month to month. Strong reviews |
| **Where we differ** | Built for the dining room: reservations, host stand, guest history, deposits. Owner's own page: $249 + 5% per order, or $499 flat, and a 5% "order support fee" charged to guests ([Owner.com pricing](https://owner.com/pricing)). We charge guests nothing |
| **Ask** | "How much of your revenue is dine-in vs online orders? Who handles your reservations today?" |
| **Track** | "If most of your business is takeout, Owner is a strong choice. If most of it is people at tables, you need the reservation book and guest history at the center. That's us." |
| **Don't say** | That Owner can't do websites well. It can. Don't fight on ordering; ours lacks modifiers, POS hand-off and delivery |

### Popmenu

| | |
|---|---|
| **They're good at** | Restaurant websites, menus, marketing. Vendor page lists about $179 / $299 / $449 ([Popmenu pricing](https://get.popmenu.com/pricing)) |
| **Where we differ** | Month to month and online cancellation vs complaints of 24-month contracts and billing after written cancellation; Popmenu's BBB replies cite no early termination right "absent Popmenu's breach" ([BBB](https://www.bbb.org/us/ga/atlanta/profile/marketing-software/popmenu-0443-28164736/complaints)). Ads and phone answering are Popmenu add-ons; our Paid Ads agent is in the suite. Reservations at the center |
| **Ask** | "When does your Popmenu contract end? What add-ons are on your bill?" |
| **Track** | "Same idea, one website and marketing system, but built around your reservations, with no contract to get out of." |
| **Don't say** | That every Popmenu customer is locked in. Complaints are complaints, not the full picture |

### Open (getopen.com)

| | |
|---|---|
| **They're good at** | Agent-first, like us: Ecommerce, Marketing, SEO, Paid Ads, Support and Catering agents; Sequoia-backed; integrates with Toast ([Open](https://getopen.com/company); [Toast directory](https://pos.toasttab.com/partners/directory/Open)) |
| **Where we differ** | We found no evidence that Open does reservations, host stand, waitlist, deposits or review replies. Its customers are mostly ordering-led brands. Our pricing is published; Open's is not |
| **Ask** | "Are you looking at Open for ordering or for the dining room?" |
| **Track** | "Open is built for brands that sell online. We're built for restaurants where the table is the business." |
| **Don't say** | Anything about Open's approval model or pricing; we don't know them |

---

## 6. Objection handling

Pattern: acknowledge, ask, answer with a fact, offer a next step.

| Objection | Answer |
|---|---|
| **"OpenTable brings me covers."** | "It does, and that's real. Do you know how many? Let's pull last month's report: network covers vs covers from your own site, Google and phone. Then we price both. If the network is most of your book, staying may be right. If it's a minority, you're paying per cover for guests who'd find you anyway. Either way, check your renewal date and the system-of-record clause before running anything alongside it." |
| **"Switching is risky."** | "It is. When Union Square Cafe switched systems, guest notes didn't come over ([Caper](https://caper.media/p/union-square-hospitality-group-reservation-move-sevenrooms-opentable)). So we do a dry run first, show you a sample of your most-noted guests side by side, and you sign off before anything goes live. Future bookings come over as holds the database won't double-book. And you can export everything from us any day, so the risk doesn't run the other way." |
| **"AI will say the wrong thing to my guests."** | "Nothing that messages a guest or spends money goes out without your approval, unless you choose to switch a specific action to automatic. Booking confirmations use your own settings. Marketing texts only go to guests with recorded consent, never in quiet hours, at most one a week. Every action is in a log with who did it and why. You can see it today." |
| **"We're on Toast."** | "Good. Keep it. We're not a POS. 97% of multi-unit full-service operators run one POS across their venues ([FSR](https://www.fsrmagazine.com/feature/restaurants-reach-a-technology-turning-point-rooted-in-simplicity/)), so we sit beside it. We sync visits from Square today; Toast integration date is **[TO FILL]**." |
| **"Toast Tables is cheaper / already included."** | "Toast Tables Plus is reported around $199 a month ([frontdeskreview](https://frontdeskreview.com/software/restaurant-reservation/toast-tables.md)), which is our price too. The difference is your guest record stays yours if you ever change POS, and you can cancel online." |
| **"We're under contract."** | "Then read your agreement before doing anything. Many restaurants plan the switch for renewal. We'll put a reminder 90 days before and run your audit then." |
| **"$199 is more than I pay now."** | "Let's add it up: plan, cover fees, the percentage on deposits, and the tools around it. If you really pay less, keep what you have. If you're a fit for founding pricing, it's $149, locked for 24 months, cancel any month." |
| **"You're a startup. What if you disappear?"** | "Fair. One-click export of guests, consent history and bookings is built, and month to month means you're never stuck. Test the export on day one." **[TO FILL: funding/runway statement the founder is comfortable sharing]** |
| **"No-shows are my real problem."** | "Measured no-show rates are lower than most people think: one index of 3.77M reservations puts the average at 2.33%, and 0.80% with card protection ([resOS](https://resos.com/restaurant-no-show-rate/)). So we recommend deposits on the slots that get no-showed, Friday and Saturday prime time and large parties, not on everything. Reminders with one-tap cancel go out before your cut-off." |
| **"I don't have time to learn another system."** | "We set up your floor and hours, move your data, and train your hosts on site in under an hour. The owner part is approving proposals from your phone." |
| **"I need Reserve with Google."** | "Today your Google profile links to your booking page. The native button needs Google certification, which we're working on **[TO FILL: status]**." |
| **"Do you answer the phone?"** | "Not today. If phone bookings are a big share for you, tell us; it shapes what we build next." |

---

## 7. Discovery-interview script

**Purpose:** validate pain and price before we commit to the numbers.
The research found no willingness-to-pay data for a flat all-in-one at
independent scale. Target 20–30 interviews with owners or GMs of
full-service independents.

**Setup:** 30 minutes. In person or video. Ask permission to take
notes. This is not a sales call: no pitch until the last five minutes,
and only if they ask.

### Warm-up (2 min)

"Tell me about the restaurant: how many seats, how many locations, how
many nights a week you take reservations?"

### Questions

| # | Question | What we're learning |
|---|---|---|
| 1 | Walk me through how a reservation happens here, from the guest finding you to sitting down. | Channels; where bookings come from |
| 2 | What reservation system do you use, and how long have you used it? Why that one? | Current stack; switching history |
| 3 | Roughly what share of your covers come from that system's diner app vs your website, Google, Instagram and the phone? How do you know? | Network dependence; whether they measure it |
| 4 | What did you pay for reservations last month, all in? Plan, per-cover fees, any percentage on deposits. Can you check an invoice? | True cost; price sensitivity |
| 5 | What are your contract terms: length, renewal date, what it costs to leave? | Lock-in; timing |
| 6 | Have you switched reservation systems before? What went wrong? What would you need to see to switch again? | Switching fears; proof needed |
| 7 | Which guest information matters most to you: notes, allergies, visit history, spend, tags? Where does it live today? | Import priorities |
| 8 | What other tools do you pay for monthly: website, marketing texts or email, loyalty, reviews, listings, ads, phone answering? Rough cost of each? | Stack size; suite price anchor |
| 9 | Which of those would you drop first if money got tight? Which would you keep no matter what? | Must-haves vs nice-to-haves |
| 10 | How do you fill a slow Tuesday or Thursday today? What has worked? | Quiet-night fill value |
| 11 | Who replies to your Google reviews, and how long does it take? | Reviews agent value |
| 12 | If software suggested a text to 40 regulars who haven't been in for two months, would you want to approve it first, or let it send? What would make you trust it to send alone? | Approval model; trust threshold |
| 13 | Does it matter to you who owns your reservation company? Has DoorDash buying SevenRooms, or Amex owning Resy and Tock, changed how you think about it? | Neutrality value |
| 14 | For a reservations system with booking page, host stand, guest list, waitlist and reminders, flat per location, no cover fees, no cut of deposits, month to month: at what monthly price would it be so cheap you'd doubt it? A bargain? Getting expensive? Too expensive to consider? | Price range for Reservations ($199 test) |
| 15 | Same four price questions for everything you listed in question 8 replaced by one system, with agents that propose and you approve. | Price range for the suite ($599 test) |

### Close (3 min)

- "What's the one thing about your current setup you'd fix tomorrow if
  you could?"
- "Who else should I talk to?"
- If they ask what we're building: one-sentence positioning, offer the
  free audit.

### After the interview

Log within 24 hours in the interview sheet **[TO FILL: location]**:
system, POS, locations, monthly reservation cost (cents), renewal date,
the four price points for Q14 and Q15, top pain in their words, and
whether they asked for an audit. Do not record guest data or personal
contact details in the sheet beyond what's needed to follow up.

**Decision rule (hypothesis):** if the median "getting expensive"
answer for Reservations is below $199 across 20+ interviews, or for the
suite below $599, bring the numbers to the pricing review before
publishing the pricing page.

---

## Open items

- **[TO FILL]** Approved testimonials and case-study numbers (none yet).
- **[TO FILL]** Ship dates for anything marked "in build", so copy can
  name a month.
- **[TO FILL]** Funding or runway statement for the "will you
  disappear" objection.
- Re-check every competitor price and term on the day a page or
  comparison table is published.
