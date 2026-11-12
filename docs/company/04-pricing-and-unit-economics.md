# 04 · Pricing and unit economics

Status: working draft, November 2026. Every price here is a **hypothesis**
to test in 20–30 discovery interviews and with the first 50 restaurants.
The research found no willingness-to-pay data for a flat all-in-one at
independent scale ([main report](../../reports/Restaurant%20platform%20competitive%20gaps.md)).

Conventions: money in US dollars; per location per month unless stated.
**Assumption** marks a number we chose, not one we found. **[TO FILL]**
marks a company fact we don't have yet.

---

## 1. The plans

The Pass is one agent (see [08](08-positioning-the-one-agent.md)). Plans
differ only by **which stations it runs** and which parts of the guest side
it covers. We never sell agents or stations one at a time.

| | **Host** | **The Pass** | **Group** |
|---|---|---|---|
| What it is | The dining room | Everything on the guest side | The Pass for 5+ locations |
| List price | **$199** / location / month | **$599** / location / month | **$599** / location / month |
| Founding offer (first 50 restaurants) | **$149**, locked 24 months | **$449**, locked 24 months | **$449**, locked 24 months |
| Additional locations | 20% off | 20% off | 20% off |
| Contract | Month to month | Month to month | Month to month |
| Texts included | 500 / location / month, then at cost | 2,000 / location / month, then at cost | 2,000 / location / month, then at cost |
| Per-cover, per-order or guest fees | None | None | None |
| Cut of deposits, gift cards, orders or ad spend | None. Card processing passed through at Stripe's cost | None. Card processing passed through at Stripe's cost | None |

Texts beyond the allowance are billed at cost (estimate ~$0.013 a text,
§3) and are never capped: transactional texts (confirmations, reminders,
cancellations, ready texts, the waitlist) always go out; a marketing send
that would go over shows the overage at cost before it's confirmed. Group
is a label and a price today; group-level reporting is **to build**.

Every number above lives in one file, `lib/billing/plans.ts`, which the
pricing page (`/platform/pricing`), the billing page and the invoice
preview all read. Change it there.

### What's in each

| Capability | Host | The Pass / Group |
|---|:-:|:-:|
| **Stations The Pass runs** | Reservations, Website | Reservations, Website, Reviews, Paid ads |
| Booking page on the restaurant's own site (no widget, no per-cover fee) | ✓ | ✓ |
| Host stand: today's book, seat, no-show, walk-ins, waitlist | ✓ | ✓ |
| Targeted deposits (prime slots, large parties) at Stripe cost | ✓ | ✓ |
| Confirmations, reminders, one-tap change or cancel (SMS) | ✓ | ✓ |
| Guest list and guest profiles with consent records; import with dry run; one-click export | ✓ | ✓ |
| Website builder + Website station (describe a change → draft → publish) | ✓ | ✓ |
| Ask The Pass (for the areas in the plan) and the morning pass | ✓ | ✓ |
| Reservations station: quiet-shift fill from the restaurant's own regulars, on approval | ✓ | ✓ |
| Square / Toast visit sync | ✓ | ✓ |
| Pickup ordering and catering orders (commission-free) | — | ✓ |
| Promotions; email and SMS campaigns and segments with consent, unsubscribe, quiet hours | — | ✓ |
| Visit-based loyalty | — | ✓ |
| Gift cards (no expiry, no fees) | — | ✓ |
| Google reviews + Reviews station (replies on approval) | — | ✓ |
| Google Ads and Meta reporting + Paid ads station (spend changes on approval) | — | ✓ |
| The restaurant's own guest app | — | ✓ |
| Financials and full reporting (orders, ads) | — | ✓ |
| AI phone answering for bookings | planned; pricing **[TO DECIDE]** | planned |

Why the split falls here: Host is the wedge and is priced against the
POS-native reservations band. Everything that needs ongoing agent work,
more messaging and more support (marketing, reviews, ads, ordering, gift
cards) sits in The Pass, where the margin is.

**How the product enforces it** (built 2026-11-12): restaurants set up
before plans existed have no plan row and are on The Pass. Moving a
restaurant down never deletes anything: pages for what the plan leaves out
say "Included in The Pass plan" with a "Talk to us about upgrading" request
(recorded, emailed to the founder; no payment), actions and jobs refuse on
the server, guest pages and links for them disappear, the scheduler skips
stations the plan doesn't include, and the chat isn't offered their tools.
Moving up turns everything back on as it was. Only The Pass's own staff
change a plan (logged as `plan.changed`). Billing itself isn't switched on:
the billing page shows the plan, usage and an invoice preview until Stripe
Billing exists.

---

## 2. Why these prices

### Host at $199: priced at the POS-native band, below the incumbents' real bill

| Competitor | Reported price | Fees on top | Source |
|---|---|---|---|
| Toast Tables Plus | ~$199 / month (Toast POS only) | None reported | [frontdeskreview](https://frontdeskreview.com/software/restaurant-reservation/toast-tables.md) (snippet) |
| Yelp Guest Manager | from ~$129 / month | — | [FitGap](https://us.fitgap.com/search/reservation-software/restaurants) (snippet) |
| Resy Platform / 360 | $289 / $459 (vendor page as read for `docs/FRICTION.md`); third parties list $249 / $399 / $899 | None; Tock-powered plans add 2–3% on prepayments | [Eat App](https://restaurant.eatapp.co/blog/opentable-vs-resy) |
| OpenTable Basic / Core / Pro | $149 / $299 / $499 | $1.50 / $1.00 / $1.00 per network cover; **2% on deposits, no-show fees and prepaid** (since Jan 2026) | [Eat App](https://restaurant.eatapp.co/blog/opentable-pricing); [TableHelm](https://www.tablehelm.com/blog/opentable-2-percent-service-fee-explained) |
| SevenRooms (DoorDash) | Quote only; reported $499–$1,000 / venue | "No cover fees" on Starter | [Servme](https://www.servmeco.com/resources/sevenrooms-competitors) (unverified) |

Reading of the table:

- $199 matches Toast Tables Plus, which only works with Toast POS. The Pass
  works with any POS and needs no hardware.
- $199 is below OpenTable Core's $299 **before** cover fees. An illustrative
  400 network covers at $1 adds ~$400 ([main report](../../reports/Restaurant%20platform%20competitive%20gaps.md)),
  so a Core restaurant's real bill is closer to $700.
- We stay above Yelp's ~$129 on purpose: the plan includes deposits at cost,
  import with switch support and an agent.
- The founding $149 sits at OpenTable Basic's monthly fee, with no cover fees.

### The Pass at $599: one flat bill against a $1,500–$2,500 stack

| Benchmark | Price | Source |
|---|---|---|
| Owner.com Flat Rate | $499 / month, no restaurant per-order fee, but a **5% "order support fee" charged to guests** | [Owner.com pricing](https://owner.com/pricing) |
| Owner.com Flexible | $249 / month + 5% per order | [Owner.com pricing](https://owner.com/pricing) |
| Popmenu Starter / Essentials / Premier | ~$179 / $299 / $449 (vendor page; PricingSaaS lists Premier at $499); ordering, ads, AI phone are add-ons | [Popmenu pricing](https://get.popmenu.com/pricing); [PricingSaaS](https://pricingsaas.com/companies/popmenu) |
| Toast subscription ARR per location | ~$564 / month (inference: $1,279M / ~189k locations) | [Toast Q3 2026 8-K](https://www.sec.gov/Archives/edgar/data/0001650164/000165016426000214/tost-20260930xexhibit991.htm) |

The stack a full-service independent might run today (list prices, illustrative):

| Tool | Monthly | Source |
|---|---|---|
| OpenTable Core | $299 | [Eat App](https://restaurant.eatapp.co/blog/opentable-pricing) |
| Network cover fees (illustrative 400 × $1) — **assumption on covers** | ~$400 | same |
| Owner.com Flat Rate | $499 | [Owner.com](https://owner.com/pricing) |
| Toast Marketing Essentials | ~$185 | [Restaurant Bottom Line](https://restaurantbottomline.com/2026/08/20/punchh-vs-thanx-vs-toast-loyalty-restaurant-loyalty-2026/) |
| Marqii Scale (reviews/listings) | $180 | [Marqii](https://www.marqii.com/pricing) |
| **Subtotal** | **~$1,560** | |
| Slang voice AI | ~$399 | [Implicator](https://www.implicator.ai/slang-ai-proved-restaurants-need-voice-ai-now-it-needs-to-prove-they-need-slang/) |
| Minimum agency retainer (10–20% of spend, $500+ minimum) | ~$500 | [Stackmatix](https://www.stackmatix.com/blog/restaurant-marketing-agency) |
| **Total with voice and agency** | **~$2,460** | |

Plus OpenTable's 2% on deposits and Owner's 5% guest fee.

Why $599 and not $499 or $799:

- **Above $499.** At $499 we'd be the same price as Owner while also
  replacing the reservation system, and we'd throw away margin we need for
  support. The main report's inference: a flat price above $499 has to
  replace reservations as well as website and ordering. This one does.
- **Below $799.** The suite does not yet match Owner or Popmenu on ordering
  (no modifiers, no POS hand-off, no delivery) or include AI phone
  answering. $599 leaves room to raise prices, or add a tier, once those ship.
- **Upgrade step.** Host → The Pass is +$400. That is roughly what one
  restaurant pays an agency, or OpenTable in cover fees.

### Fee rules, and why they are a product feature

- **No per-cover, per-order or guest fees.** Lock-in and fees are the
  category's sharpest complaints: OpenTable's March 2026 termination terms,
  Popmenu's 24-month contracts, Toast's 2023 $0.99 guest fee, and the
  FTC/state suit against Toast filed October 29, 2026 ([DLA Piper](https://www.dlapiper.com/en/insights/publications/2026/11/ftc-and-seven-states-sue-toast)).
- **Stripe at cost.** Stripe's US list rates are 2.9% + 30¢ online and
  2.7% + 5¢ in person ([Stripe](https://stripe.com/us/pricing)). We add
  nothing. That gives up a revenue line: Toast's payments ARR is ~49% of its
  total ([Toast 8-K](https://www.sec.gov/Archives/edgar/data/0001650164/000165016426000214/tost-20260930xexhibit991.htm)).
  We trade it for a cleaner pitch against OpenTable's 2%.
- **SMS allowance, then at cost.** 2,000 segments is about $25 of carrier
  cost and Host's 500 about $6 (below). A cap with pass-through keeps a heavy campaign month from
  wiping out the margin, as Square does ([Square pricing](https://squareup.com/us/en/pricing)).
- **Month to month.** No early-termination fees. Export everything at any time.

---

## 3. Variable cost per location per month

Sourced unit rates:

| Item | Rate | Source |
|---|---|---|
| Twilio SMS, US long code | $0.0083 / segment base | [Twilio](https://www.twilio.com/en-us/sms/pricing) |
| Carrier pass-through | AT&T ~$0.0035, Verizon ~$0.005, T-Mobile $0.0045 (from Jan 2026) | [Twilio support](https://support.twilio.com/hc/en-us/articles/44609260499995-T-Mobile-Messaging-Carrier-Fee-Changes-January-2026) |
| SMS all-in | ~$0.012–0.013 / segment (inference) | as above |
| Phone number | ~$1.15 / month | [Kanal](https://getkanal.com/blog/twilio-sms-pricing) (third party) |
| 10DLC | $4.50 brand + $41.50 secondary vetting (one time); $15 campaign vetting; $1.50–$10 / month campaign fee | [Twilio vetting FAQ](https://support.twilio.com/hc/en-us/articles/11587910480155-A2P-10DLC-Campaign-Vetting-FAQ) |
| Stripe | 2.9% + 30¢ online; 2.7% + 5¢ in person | [Stripe](https://stripe.com/us/pricing) |
| Claude API (per 1M tokens, input / output) | Haiku 5.5 $0.10 / $0.50; Sonnet 5.5 $2 / $10; Opus 5.5 $4 / $20 — **not verified against the provider's page; treat as placeholders** | [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Email (Resend) | **Not sourced.** Assumption: ~$1 per 1,000 emails at volume | — |
| Hosting (Netlify, Neon) | **Not sourced.** Assumption below | — |

### AI model usage is a range, not a number

The agent runtime defaults to `claude-opus-5-5`, with up to 12 model
turns per run and `max_tokens` 16,000 (`lib/agent-runtime/runner.ts`).
Each turn re-sends the conversation, so the cost of a run depends on how
many turns it takes. Our estimates, all **assumptions**:

| | Light | Expected | Heavy |
|---|---|---|---|
| Runs / location / month (Reservations daily, Reviews, Paid Ads, Website, ad hoc) | 40 | 100 | 200 |
| Tokens per run (input / output) | 20k / 2k | 40k / 4k | 150k / 10k |
| Model | cheaper model for routine agents | Opus 5.5 with prompt caching | Opus 5.5, no caching |
| **Cost / location / month** | **~$1–5** | **~$15–25** | **~$100–160** |

Planning range: **$5–60 per suite location per month**, with the heavy case
as a stress test. The Reservations plan runs one agent, so $1–15. AI phone
answering is **not** included here: voice minutes cost differently and must
be priced before launch. Levers: route routine agents to a cheaper model,
cache prompts, keep the "deterministic first" rule (code finds the problem,
the model drafts), and skip runs with nothing to do (the scheduler already
does this).

### Cost per location per month (all rows are assumptions unless sourced above)

| Item | Reservations: low / **expected** / high | The Pass: low / **expected** / high | Basis |
|---|---|---|---|
| SMS within allowance | $6 / **$12** / $25 | $12 / **$25** / $25 | 500–2,000 segments × $0.0125 |
| Number + 10DLC campaign fees | $3 / **$5** / $12 | $3 / **$6** / $12 | sourced rates; one-time fees amortized |
| Email | $0 / **$1** / $2 | $1 / **$3** / $5 | assumed $1 / 1,000 |
| AI model usage | $1 / **$5** / $15 | $5 / **$25** / $60 | range above; unverified prices |
| Hosting, database, monitoring, other APIs | $4 / **$7** / $13 | $7 / **$11** / $20 | assumption; falls with scale |
| Support and success (people) | $15 / **$20** / $30 | $30 / **$45** / $80 | assumption: one support person (~$70k loaded) per ~150–250 locations, more for suite |
| Card fees on our own subscription bill | $6 / **$6** / $6 | $18 / **$18** / $18 | ~3% of price (Stripe rate; billing add-on fee not checked) |
| Stripe on deposits, gift cards, orders | $0 | $0 | passed through at cost to the restaurant |
| **Total** | $35 / **$56** / $103 | $76 / **$133** / $220 | |
| **Gross margin at list price** | 82% / **72%** / 48% | 87% / **78%** / 63% | |
| **Gross margin at founding price** | 77% / **62%** / 31% | 83% / **70%** / 51% | $149 / $449 |

What this tells us:

1. **The suite carries the margin.** Reservations alone at the founding
   price is a ~60% gross-margin product. That is acceptable as a wedge,
   not as a business.
2. **Support is the biggest cost, not AI or SMS.** Switch support is done
   by a person by design. The number to watch is support hours per
   location in months 1–3 against month 4 onward.
3. **SMS overage at cost is margin-neutral in dollars but dilutes the %.**
   Heavy-campaign restaurants will show a lower gross margin percentage
   without losing us money.
4. Infrastructure is mostly a fixed cost while we have few locations, so
   per-location numbers in year 1 will look worse than this table.

**Open item: the Stripe set-up.** Today one platform Stripe account
(`STRIPE_SECRET_KEY`) takes deposits, gift card sales and orders for every
restaurant. Before production, money has to flow to each restaurant's own
account through Stripe Connect, both so "at cost, no cut" is literally true
and to keep The Pass from holding restaurant funds (see
[06-risks-and-compliance.md](06-risks-and-compliance.md)). Connect may add
platform fees depending on account type. **[TO VERIFY with Stripe]**

---

## 4. CAC and payback

No public CAC or churn benchmark exists for restaurant SMB SaaS beyond
Owner.com's 4.5:1 LTV:CAC from 2024 ([GetLatka](https://getlatka.com/companies/owner.com/interviews/owner-com-kyle-norton-2024)).
Generic SMB SaaS benchmarks put CAC payback at 12–24 months and healthy
monthly churn under ~2% ([Growth Unhinged](https://kylepoyar.substack.com/p/2025-saas-benchmarks-report);
[SaaSRise](https://saasrise.com/blog/saas-benchmark-report-2026)). Toast
targets payback of 20 months or less in new markets ([Motley Fool Q3 2026](https://www.fool.com/earnings/call-transcripts/2026/11/04/toast-tost-q3-2026-earnings-call-transcript/)).
Everything below is an **assumption**.

### Scenario A: founder-led, leak audit, founding prices (first 50 restaurants)

| Assumption | Value |
|---|---|
| Leak audits run per month (founder network, walk-ins, switch-kit outreach) | 40 |
| Audit → demo | 40% |
| Demo → paying restaurant | 30% |
| New restaurants per month | ~5 |
| Locations per restaurant | 1.3 |
| Founder time, valued (not cash) | $10,000 / month |
| Cash sales cost (travel, tools, audit compute) | $1,500 / month |
| Onboarding (a person does the import and floor set-up), per location | $300 |
| Plan mix of new locations | 70% Reservations / 30% suite |
| Blended price (founding, after multi-location discount) | ~$228 |
| Blended gross margin (founding) | ~65% |

| Result | Value |
|---|---|
| Locations added per month | ~6.5 |
| CAC per location, fully loaded (incl. founder time) | ~$1,770 + $300 onboarding = **~$2,070** |
| CAC per location, cash only | ~$230 + $300 = **~$530** |
| Monthly gross profit per location | ~$148 |
| **Payback, fully loaded** | **~14 months** |
| **Payback, cash** | **~4 months** |

### Scenario B: paid acquisition and a salesperson, list prices

| Assumption | Value |
|---|---|
| Paid media cost per completed leak audit (Google/Meta to owners) | $250 |
| Audit → demo | 25% |
| Demo → paying restaurant | 25% |
| Media cost per restaurant | ~$4,000 |
| Account executive, loaded | $10,000 / month, closing 8 restaurants / month → $1,250 per restaurant |
| Locations per restaurant | 1.3 |
| Onboarding per location | $300 |
| Plan mix | 60% Reservations / 40% suite |
| Blended price (list, after multi-location discount) | ~$343 |
| Blended gross margin | ~75% (cost of revenue ~$87) |

| Result | Value |
|---|---|
| CAC per location | ~$5,250 / 1.3 + $300 = **~$4,340** |
| Monthly gross profit per location | ~$256 |
| **Payback** | **~17 months** |

### Payback sensitivity (months), Scenario B economics

| CAC per location → | $2,000 | $3,000 | $4,340 | $6,000 |
|---|---|---|---|---|
| Mix 80% Res / 20% suite (GP ~$195) | 10 | 15 | 22 | 31 |
| Mix 60% / 40% (GP ~$256) | 8 | 12 | 17 | 23 |
| Mix 40% / 60% (GP ~$317) | 6 | 9 | 14 | 19 |

### LTV at the base churn assumption (2% monthly logo churn)

| | Founder-led | Paid |
|---|---|---|
| Gross profit per location per month | ~$148 | ~$256 |
| Lifetime (1 / 2%) | 50 months | 50 months |
| LTV (gross profit) | ~$7,400 | ~$12,800 |
| LTV : CAC | ~3.6 (loaded) | ~2.9 |

Readings:

- Paid acquisition stays inside an 18-month payback only at a **≥40%
  suite mix** or a CAC under ~$3,000. Do not scale paid spend until the measured suite upgrade rate
  and audit conversion support it.
- Founder-led selling at founding prices pays back in cash quickly. The
  real cost is founder time, which caps it at roughly 5 restaurants a month.
- Churn has a structural floor: independents closed ~2.3% net in 2025
  (gross closures are higher) ([Restaurant Business](https://www.restaurantbusinessonline.com/operations/number-independent-restaurants-declined-23-2025)).

---

## 5. Three-year model (January 2027 – December 2029)

Exit ARR = December MRR × 12. Burn = operating expense + cost of revenue −
revenue, for the year. Headcount is end of year. The model assumes **zero
paying locations at the start**: **[TO FILL: current paying restaurants and
locations, if any, and cash on hand]**.

### Results

| Case | Year | Locations (end) | Suite share | Revenue in year | Exit ARR | Gross margin | Headcount | Net burn in year | Cumulative burn |
|---|---|---|---|---|---|---|---|---|---|
| Conservative | 2027 | 41 | 29% | $0.06M | $0.11M | 65% | 4 | $0.66M | $0.66M |
| | 2028 | 130 | 34% | $0.30M | $0.46M | 74% | 6 | $0.83M | $1.48M |
| | 2029 | 274 | 39% | $0.83M | $1.12M | 80% | 9 | $1.10M | $2.59M |
| **Base** | 2027 | **86** | 35% | $0.14M | **$0.28M** | 67% | **5** | $0.80M | $0.80M |
| | 2028 | **337** | 45% | $0.90M | **$1.41M** | 77% | **10** | $1.09M | $1.89M |
| | 2029 | **802** | 51% | $2.67M | **$3.69M** | 80% | **18** | $1.56M | **$3.45M** |
| Aggressive | 2027 | 166 | 41% | $0.32M | $0.63M | 70% | 7 | $1.02M | $1.02M |
| | 2028 | 691 | 51% | $2.00M | $3.14M | 77% | 16 | $1.49M | $2.51M |
| | 2029 | 1,793 | 60% | $6.38M | $9.03M | 81% | 30 | $1.68M | $4.19M |

Average revenue per location at the end of 2029: ~$340 (conservative),
~$383 (base), ~$420 (aggressive). None of the cases reaches break-even
within three years. The base case needs roughly **$3.5M** of funding plus a
buffer to get through 2029. For scale: 802 locations is ~0.2% of the
~412,500 US independents ([Restaurant Business](https://www.restaurantbusinessonline.com/operations/number-independent-restaurants-declined-23-2025)).

### Assumptions

| # | Assumption | Conservative | Base | Aggressive | Basis |
|---|---|---|---|---|---|
| A1 | New locations per month, 2027 / 2028 / 2029 | 4 / 10 / 18 | 8 / 25 / 50 | 15 / 50 / 110 | Assumption; 2027 is mostly founder-led |
| A2 | Monthly logo churn | 3.0% | 2.0% | 1.5% | Assumption; SMB benchmarks <2% healthy; restaurant closures set a floor |
| A3 | Suite share of new locations, 2027 / 2028 / 2029 | 25 / 30 / 35% | 30 / 40 / 45% | 35 / 45 / 55% | Assumption |
| A4 | Reservations → suite upgrades, per month | 1.0% | 1.5% | 2.0% | Assumption |
| A5 | List prices | $199 / $599 | same | same | Company decision |
| A6 | Founding prices | First ~65 locations (50 restaurants × 1.3) at $149 / $449; move to list in month 31 | same | same | Company decision; month 31 approximates "24 months after a 2027 sign-up" |
| A7 | Locations per customer; discount | 1.3; 20% off additional → effective price ×0.954 | same | same | Assumption; discount is a company decision |
| A8 | Cost of revenue per location (Reservations / suite) | 2027 $56 / $133; 2028 $48 / $118; 2029 $42 / $105 | same | same | Section 3 expected case, improving with scale (assumption) |
| A9 | Headcount, end of year | 4 / 6 / 9 | 5 / 10 / 18 | 7 / 16 / 30 | Assumption; ramps evenly through each year |
| A10 | Loaded cost per person | $150,000 / year | same | same | Assumption; founders included at the same rate |
| A11 | Other operating cost per month (legal, tools, travel, fixed infra, insurance) | $8k / $15k / $25k | $10k / $22k / $40k | $12k / $30k / $60k | Assumption |
| A12 | Share of new locations from paid acquisition | 0 / 30 / 50% | 10 / 40 / 60% | 10 / 50 / 65% | Assumption |
| A13 | Paid media per paid-acquired location | $3,000 | same | same | Assumption, from Scenario B |
| A14 | SMS overage, AI phone answering, payments revenue | Excluded | Excluded | Excluded | Overage is at cost; phone answering not priced; no payments margin by design |

### Base case headcount plan (assumption)

| Role | End 2027 | End 2028 | End 2029 |
|---|---|---|---|
| Founders **[TO FILL: names and roles]** | 2 | 2 | 2 |
| Engineering | 2 | 4 | 7 |
| Onboarding and support | 1 | 2 | 4 |
| Sales (account executives, SDR) | 0 | 1 | 3 |
| Marketing / growth | 0 | 1 | 1 |
| Operations / finance | 0 | 0 | 1 |
| **Total** | **5** | **10** | **18** |

---

## 6. Metrics to track

| Metric | Definition | Target (assumption) | Why |
|---|---|---|---|
| Leak audit → paid conversion | Paying restaurants ÷ audits completed, by source | ≥10% founder-led; ≥5% paid | Validates the funnel and CAC |
| CAC per location and payback | All sales and marketing cost ÷ new locations; ÷ monthly gross profit | Payback ≤12 months founder-led, ≤18 paid | Gates paid spend |
| Suite mix and upgrade rate | % of locations on the suite; monthly Reservations → suite moves | ≥40% suite by end 2028 | The margin lives in the suite |
| Logo and revenue churn | Monthly; split into closures and switches away | ≤2% logo | LTV |
| Net revenue retention | 12-month cohort revenue ÷ starting revenue | ≥105% | Toast's SaaS NRR is 109% ([Motley Fool](https://www.fool.com/earnings/call-transcripts/2026/02/12/toast-tost-q4-2025-earnings-call-transcript)) |
| Gross margin by plan | Revenue − cost of revenue in section 3 | ≥70% Reservations, ≥78% suite | Pricing health |
| AI cost per location | Model spend ÷ active locations, by agent | Inside the $5–60 range | Range is unverified |
| SMS segments per location | Including overage | Median under 2,000 | Allowance sizing |
| Support hours per location | Months 1–3 vs month 4 onward | Falls by month 4 | Biggest cost line |
| Direct covers per location | Covers booked through The Pass by source (site, Google, Instagram, phone) | Rising | The value the restaurant pays for |
| Fees saved | Per-cover and deposit fees the restaurant no longer pays | Shown to the owner monthly | The retention story |
| Proposal approval rate | Agent proposals approved ÷ made | Tracked per agent | Shows whether agents earn trust |

Missing values render `—`, never `$0`.

## 7. What would change the prices

| Signal | Change we'd consider |
|---|---|
| Audit → paid conversion well above target at $199 | Raise Reservations to $229–$249 for new customers |
| Restaurants won't leave OpenTable/Resy at $199 even with coexistence mode | A lower "direct bookings only" tier near Yelp's ~$129 |
| Suite upgrade rate under 1% a month | Move one suite feature (e.g. reviews or loyalty) into Reservations, or add a ~$349 middle tier |
| AI phone answering ships | Price it into the suite at $699–$799, or as an add-on against Slang's ~$399–$600 |
| AI cost per location runs above $60 | Route more work to cheaper models first; then usage caps on agent runs |
| Median SMS above 2,000 segments | Raise the allowance for the suite, or price campaign blocks |
| Support hours per location don't fall after month 3 | A paid onboarding fee for complex switches (contradicts the no-fee message; last resort) |
| Groups of 5–20 locations become a large share | Volume pricing beyond the 20% additional-location discount |
| OpenTable, Resy or DashOS cut prices or drop fees | Hold the price, lead with ownership and month-to-month terms; don't race to the bottom |

Any price change keeps the fee rules: no per-cover, per-order or guest
fees, no cut of payments, month to month. Founding prices stay locked for
24 months.
