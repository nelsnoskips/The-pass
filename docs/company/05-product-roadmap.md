# 05 · Product roadmap

Status: working draft, November 2026. Covers what is built today, what the
reservations wedge still needs, and the order of work for the next 18
months (Q1 2027 – Q2 2028). Sources: the code in this repository, `docs/`
and the [competitive gaps report](../../reports/Restaurant%20platform%20competitive%20gaps.md).
**[TO FILL]** marks company facts we don't have.

Two facts frame everything below:

1. **Most of the wedge is built.** What's missing is mostly production
   hardening, partner approvals and a handful of switch-critical features.
2. **Many integrations are working code with no production access yet.**
   They run against test accounts or in dry run until credentials and
   partner approvals arrive. Some approvals take weeks to months, so they
   have to be applied for now, before the features that depend on them.

---

## 1. What's built today

"Built" means working code with tests in `tests/`. "Needs production
access" means the code path exists but has not run against real
restaurant accounts.

### Reservations and the dining room (the wedge)

| Capability | State | Where |
|---|---|---|
| Reservations engine: the database refuses overlapping table holds whatever the source (exclusion constraint), with race tests | Built | `lib/reservations/`, `db/schema.sql` |
| Booking page on the restaurant's own site (no iframe, no per-cover fee); private link to change or cancel in place | Built | `app/(sites)/s/[site]/reserve`, `/booking` |
| Abuse limits: one live booking per phone per service, 4 per hour per phone, 10 per 10 minutes per address, honeypot | Built | `lib/platform/ratelimit.ts` |
| Host stand: today's book, seat, no-show, walk-ins, phone bookings, mark deposit paid, redeem rewards | Built (online only) | `app/(platform)/r/[org]/host`, `lib/platform/host-actions.ts` |
| Reminders with one-tap cancel; restaurant-cancel notices; notify list ("tell me if a table opens", three per opening) | Built | `lib/reservations/followups.ts`, `notify.ts` |
| Deposits: policy shown before booking; Stripe Checkout, signed webhooks, expiry releases the table, refunds | Built; **one platform Stripe account, not yet Stripe Connect**; needs live keys | `lib/payments/` |
| Guest list (per org; phone is identity), SMS and email consent stored as records with source and opt-out time | Built | `guests` table, `/r/[org]/guests` |
| CSV import: guests and future bookings, loose header matching, dry run first, no assumed consent; brings name, phone, email, notes, visit count, last visit, explicit SMS opt-in | Built; **does not carry tags, allergies or per-visit history**; existing notes are kept rather than merged | `lib/platform/importer.ts` |
| One-click export of guests (with consent history) and bookings | Built | `app/(platform)/r/[org]/export` |
| Square: closed checks matched to guests → visits and spend | Built; needs Square production app | `lib/integrations/square.ts`, `lib/guests/visits.ts` |
| Visit-based loyalty (reward every N visits, redeemed at host stand) | Built | `lib/guests/loyalty.ts` |
| Reservations Agent: finds quiet shifts, proposes an SMS to consenting regulars; owner approves | Built | `lib/agent-runtime/agents/reservations.ts` |

### Website, marketing, reviews, ads, commerce

| Capability | State | Where |
|---|---|---|
| Site engine: one engine, themed sites as typed content, versioned, publish as a pointer, rollback; `Restaurant` JSON-LD with `ReserveAction` | Built (one theme; path URLs `/s/<slug>`; custom domains and image uploads not built) | `lib/sites/`, `docs/WEB-PLAN.md` |
| Site editor (form, preview, publish, history) | Built | `/r/[org]/website` |
| Website Agent: describe a change → draft version → preview → publish on approval | Built; needs `ANTHROPIC_API_KEY` | `lib/agent-runtime/agents/website.ts` |
| Google Business Profile: OAuth, hours pushed from service periods, reviews pulled in | Built; needs GBP API access for production | `lib/integrations/google.ts` |
| Reviews Agent: drafts replies, owner approves, posts to Google | Built; **no booking context yet** | `lib/agent-runtime/agents/reviews.ts` |
| SMS via Twilio: confirmations, reminders, campaigns; consent checked at send, once a week max, 10:00–20:00 window, opt-out line appended | Built; **dry run until Twilio keys**; single sender for all restaurants; **inbound STOP is not yet written back to the guest record** | `lib/messaging/sms.ts` |
| Email campaigns via Resend: separate consent, one-click unsubscribe (List-Unsubscribe header) | Built; needs `RESEND_API_KEY` and sending domain | `lib/messaging/email.ts` |
| Gift cards: sold online through Stripe, emailed codes, issued at the counter, partial redemption with row locks; no expiry field | Built; same Stripe account caveat | `lib/giftcards/` |
| Pickup ordering: site menu, server-side pricing, tax, tips, Stripe, kitchen board, pause, sold-out, ready texts | Built; **no modifiers, no POS hand-off, no delivery** | `lib/ordering/` |
| Catering orders with notice, headcount and minimum | Built; quotes and invoices not built | `lib/ordering/` |
| Google Ads and Meta reporting on real data (nightly 30-day re-sync) | Built; Google needs a developer token with Basic access; Meta needs `ads_read` Advanced Access via App Review | `lib/ads/` |
| Paid Ads and Search Terms agents: rules find the problem, model drafts; Google writes (budget, pause, negative keyword) on approval | Built; **Meta is read-only** | `lib/agents/`, `lib/agent-runtime/agents/paid-ads.ts` |

### Platform

| Capability | State |
|---|---|
| Tenant scoping (`org_id` from a `Tenant`), roles and `can`/`assertCan` | Built, with isolation tests |
| Agent runtime: tools with tiers (auto / approve / never), policy in code before every action, proposals queue, `change_log` with actor | Built (`lib/agent-runtime/`) |
| Agents tab: approve or dismiss proposals | Built (`/r/[org]/agents`) |
| Scheduling: hourly Netlify job for reminders; daily agent runs; only agents with work run | Built; needs `AGENT_CRON_SECRET` |
| Toast POS and Reserve with Google | **Shells only** (listed in `lib/integrations/registry.ts`, not connected) |

Note: `docs/AGENTIC-PLATFORM.md` still lists gift cards as "not started"
and Website/Reviews as planned. The code and git history show them built.
That doc's status tables need a refresh.

---

## 2. What the wedge still needs

From the competitive report and `docs/FRICTION.md`, ranked by how directly
each item decides whether a full-service independent switches and stays.

| # | Gap | Why it matters | Size (assumption) |
|---|---|---|---|
| G1 | **Production deposits** via Stripe Connect, at processing cost | The pitch is "$0 platform cut vs OpenTable's 2%" ([TableHelm](https://www.tablehelm.com/blog/opentable-2-percent-service-fee-explained)). Money must land in the restaurant's own account | M |
| G2 | **Import that keeps notes, tags, allergies and visit history**, plus a "nothing lost" verification report | Lost notes are what visibly failed when Union Square Cafe switched ([Caper](https://caper.media/p/union-square-hospitality-group-reservation-move-sevenrooms-opentable)). Turns the riskiest moment into the selling moment | M |
| G3 | **Host-stand offline mode** | Hosts need the book when the connection drops; a SevenRooms complaint (`docs/FRICTION.md`) | M–L |
| G4 | **Reserve with Google** | The native "Reserve a table" button needs certified partner status and an active booking API ([Google Actions Center](https://developers.google.com/actions-center/verticals/reservations/e2e/overview)). Without it we show a plain link. Our answer to having no diner network | L, plus partner lead time |
| G5 | **Review replies using booking context**, plus reply hygiene (expire drafts after 7 days, block near-duplicates, pre-approve short 4–5★ replies) | Drafting is free in Google itself ([SE Roundtable](https://www.seroundtable.com/google-reply-to-reviews-with-al-41095.html)). Context ("your 7:30 table seated at 7:55") is not. Google silently deletes templated and late replies ([SE Roundtable](https://www.seroundtable.com/rejected-google-review-replies-analysis-41457.html)) | S–M |
| G6 | **Listing drift guard**: re-read GBP hours, phone, website, booking URL on a schedule; revert or alert | Anyone can suggest edits and the feature can't be disabled ([Synup](https://synup.com/how-to/prevent-suggested-edits-unauthorized-changes-on-your-google-business-profile/)). Protects reservation traffic | S |
| G7 | **Cost per seated cover**: upload seated covers and their value to Google Ads and Meta as offline conversions; report cost per seated cover and per new guest | No competitor offers this to independents (main report). Our most defensible capability | M, plus API access |
| G8 | **AI phone answering for bookings** | DashOS ships SevenRooms Voice AI ([DoorDash IR](https://ir.doordash.com/news/news-details/2026/DoorDash-Introduces-DashOS-One-Platform-to-Help-Restaurants-Grow/default.aspx)); Slang costs ~$399–$600 per location on its own ([Implicator](https://www.implicator.ai/slang-ai-proved-restaurants-need-voice-ai-now-it-needs-to-prove-they-need-slang/)). Parity, and a price anchor | L |
| G9 | **Ordering modifiers** | Table stakes for any ordering product (storefront research) | M |
| G10 | **POS hand-off to Toast and Square** (orders into the POS; Toast checks into visits) | 97% of multi-unit full-service operators run one POS across venues ([FSR](https://www.fsrmagazine.com/feature/restaurants-reach-a-technology-turning-point-rooted-in-simplicity/)); integrate, don't fight | L, plus Toast partner lead time |

Also needed for production, though not in the report's list:

- **SMS compliance plumbing**: per-restaurant 10DLC brand and campaign
  registration under a Twilio ISV set-up, inbound STOP/HELP written to
  the guest record, per-restaurant sender numbers.
- **OpenTable coexistence mode**: take only direct bookings (site, Google,
  Instagram) for a restaurant still under contract (legal review first).
- **Subscription billing** for The Pass's own plans. **[TO FILL: billing
  provider and whether it is built]**
- **Leak audit** tool (the GTM wedge): Google profile drift and missing
  Reserve button, website, review-reply health, current reservation stack
  cost, then a generated site with a booking page.
- **Holdout groups** on campaigns, reporting incremental covers in cents.
- **Broker-pattern flags** at the host stand (`docs/FRICTION.md`).

---

## 3. The next 18 months, by quarter

Ordering rules:

1. Ship what a founding restaurant needs to switch safely before anything
   else.
2. Apply for every external approval **now**. Start building what depends
   on it while the application is in review.
3. Build on our data advantage (who booked, who sat) before closing parity
   gaps in ordering, where Owner.com and Open are strongest.

Team size follows the base case in [04-pricing-and-unit-economics.md](04-pricing-and-unit-economics.md):
about 2 engineers in 2027, 4 by end 2028. Each quarter is sized to that.
**[TO FILL: actual engineering capacity]**

### Now – Q4 2026: applications and production set-up

| Work | Why now |
|---|---|
| Apply: Google Ads developer token (Basic access), Meta App Review (`ads_read`, later `ads_management`), Google Business Profile API access, Reserve with Google partner interest, Toast partner programme, Square production app | Lead times (section 4) are longer than the build |
| Twilio account, ISV/subaccount structure, first 10DLC brand and campaign | Up to 5 business days per approval, with rejections ([Twilio](https://support.twilio.com/hc/en-us/articles/11587910480155-A2P-10DLC-Campaign-Vetting-FAQ)) |
| Resend sending domain; Anthropic production key and spend limits | Unblocks Website, Reviews and Reservations agents in production |
| Lawyer engaged on terms, privacy policy, OpenTable clause, money flows | See [06-risks-and-compliance.md](06-risks-and-compliance.md) |

### Q1 2027: ready for founding restaurants

| Work | Gap | Why here |
|---|---|---|
| Stripe Connect: deposits, gift cards and orders paid into the restaurant's own account at cost | G1 | The core price promise; no restaurant funds held by us |
| Import v2: tags, allergies, per-visit history, notes merged not dropped; "nothing lost" report; importers for OpenTable, Resy, SevenRooms, Tock exports | G2 | The switch is the riskiest moment; Tock venues face a forced move now ([The Points Guy](https://thepointsguy.com/news/amex-resy-credit-tock-restaurants/)) |
| Host stand offline mode: cached book, queued seat/no-show/walk-in actions, conflict rules on reconnect | G3 | A dropped connection on a Friday loses a restaurant |
| SMS production plumbing: per-restaurant 10DLC, inbound STOP/HELP to the guest record | — | Can't send at volume without it; TCPA exposure |
| Coexistence mode (direct bookings only) | — | OpenTable restaurants under contract; legal review first |
| Leak audit v1 | — | The acquisition funnel for the first 50 |
| Trust pricing page and month-to-month terms | — | Sells against Toast, Popmenu, OpenTable lock-in |

### Q2 2027: the reasons to stay

| Work | Gap | Why here |
|---|---|---|
| Reserve with Google: feeds (merchants, services, availability) and booking server, sandbox then certification | G4 | Long certification; start once partner interest is accepted. Spring 2027 is when March 2026 OpenTable contracts reach their first anniversary |
| Reviews with booking context and reply hygiene; FTC-safe review requests to every seated guest, logged | G5 | Small build on data we already hold; differentiates the suite |
| Listing drift guard; holiday hours from closures | G6 | Small; protects bookings; part of the leak audit story |
| Holdout groups on Reservations Agent campaigns | — | Proves quiet-night fill with incremental covers, not claims |
| Targeted deposit rules (prime slots, large parties, flagged phones) and broker flags | — | Measured no-shows are 2–4% ([resOS](https://resos.com/restaurant-no-show-rate/)); deposits only where the risk is |

### Q3 2027: closed-loop ads and voice

| Work | Gap | Why here |
|---|---|---|
| Offline conversion upload of seated covers to Google Ads and Meta; cost per seated cover and per new guest in reporting | G7 | Needs developer-token Basic access and Meta approvals applied for in Q4 2026; needs enough booking volume to be meaningful |
| Capacity-aware ads: propose pausing or lowering bids when the book is full or closed | — | Follows directly from G7 |
| Meta write actions (budget, pause) on approval | — | Needs `ads_management` approval |
| AI phone answering for bookings, beta with founding restaurants | G8 | Parity with DashOS; needs cost and pricing work first (voice minutes are not in the current cost model) |

### Q4 2027: POS depth and money products

| Work | Gap | Why here |
|---|---|---|
| Toast checks → visits and spend (if partner access is granted) | G10 (part) | Most full-service independents in our target likely run Toast **[TO VERIFY]**; depends on partner timing |
| AI phone answering general release | G8 | After beta |
| Gift card liability report by state (issue date, last activity, selling state) | — | Needed before gift card volume grows; escheat rules vary by state |
| Catering quotes, deposits and invoices; "reorder last catering order" proposal | — | Uber's pending ezCater deal is a live trigger ([FastCasual](https://www.fastcasual.com/articles/ubers-ezcater-deal-puts-catering-growth-margins-and-customer-loyalty-in-focus/)) |

### Q1 2028: ordering table stakes

| Work | Gap | Why here |
|---|---|---|
| Item modifiers (required/optional groups, prices in cents) | G9 | Ordering is not the wedge; Owner and Open lead here. Ship once reservations customers ask for it |
| Order hand-off to Square POS | G10 | Square API already connected for checks |
| Google ordering links | — | Cheap once modifiers exist |

### Q2 2028: hand-off to Toast and groups

| Work | Gap | Why here |
|---|---|---|
| Order hand-off to Toast POS | G10 | Depends on Toast partner approval and write scopes |
| White-label delivery (DoorDash Drive or Uber Direct) | — | Last of the ordering table stakes |
| Group features for 5–20 locations: cross-location guest view, group reporting | — | Fits the 1–20 location segment as customers grow |

**Not in the 18 months:** mobile app and push (wave 4 in
`docs/AGENTIC-PLATFORM.md`), a diner-facing network, our own POS.

---

## 4. External approvals and partnerships

Lead times below are **estimates unless a source is given**. Several were
not researched; those are marked **[TO VERIFY]**.

| Approval | Needed for | What it takes | Lead time | Status |
|---|---|---|---|---|
| Twilio A2P 10DLC brand + campaign (per restaurant, under an ISV set-up) | Any SMS at volume | Brand and campaign registration and vetting; $4.50 + $41.50 brand, $15 campaign vetting | Up to 5 business days per approval, rejections possible ([Twilio](https://support.twilio.com/hc/en-us/articles/11587910480155-A2P-10DLC-Campaign-Vetting-FAQ)) | **[TO FILL]** |
| Stripe Connect platform | G1, gift cards, orders | Platform profile, account type, onboarding flow for restaurants | Days to weeks **[TO VERIFY]** | **[TO FILL]** |
| Google Ads API developer token, Basic access | Reporting and writes on real restaurant accounts; G7 | Application in Google Ads API Center (code notes Basic access is needed beyond test accounts) | Weeks **[TO VERIFY]** | **[TO FILL]** |
| Meta App Review: `ads_read` Advanced Access; later `ads_management` | Meta reporting beyond our own accounts; Meta writes; G7 | Business verification, App Review with screencasts | Weeks, can repeat on rejection **[TO VERIFY]** | **[TO FILL]** |
| Google Business Profile API access | Hours sync, reviews in, replies | Access request to Google | Weeks **[TO VERIFY]** | **[TO FILL]** |
| Reserve with Google (Actions Center) partner | G4 | Accepted as a partner, feeds, booking server, technical certification, ongoing active connection ([Google Actions Center](https://developers.google.com/actions-center/verticals/reservations/e2e/overview)) | Months **[TO VERIFY]**; acceptance not guaranteed | **[TO FILL]** |
| Toast partner programme (API access) | G10, Toast visits | Partner application and integration review; Open is a listed partner ([Toast directory](https://pos.toasttab.com/partners/directory/Open)) | Months **[TO VERIFY]**; acceptance not guaranteed | **[TO FILL]** |
| Square production app (and optional App Marketplace listing) | Square visits, order hand-off | Production OAuth credentials; marketplace review if listed | Days to weeks **[TO VERIFY]** | **[TO FILL]** |
| Anthropic API production limits | All agents | Account, spend limits, rate-limit tier | Days **[TO VERIFY]** | **[TO FILL]** |
| Resend sending domain | Email | DNS (SPF, DKIM) per sending domain | Days | **[TO FILL]** |
| DoorDash Drive / Uber Direct | Delivery (Q2 2028) | Developer access and commercial terms | **[TO VERIFY]** | Not started |

Fallbacks if an approval is refused or slow:

- **Reserve with Google:** booking link in the GBP profile, site and
  Instagram; leak audit shows the missing button honestly.
- **Toast:** keep Square and manual visit marking at the host stand;
  bookings already count as visits.
- **Meta writes:** proposals become instructions the owner applies, with a
  reminder; reporting stays read-only.

---

## 5. "Ready for founding restaurants"

The first of the 50 founding restaurants goes live only when **all** of
these are true. Each line is testable.

**Money**
- [ ] Deposits, gift cards and orders pay into the restaurant's own Stripe
      account through Connect. The Pass takes no cut and holds no funds.
- [ ] Refunds and expiry of unpaid deposits work end to end on live keys.
- [ ] Our own subscription billing is live at the founding prices, month to
      month, with self-serve cancellation.

**Switching**
- [ ] Import carries guests, notes, tags, allergies, visit history and future
      bookings from at least the system that restaurant is leaving, and
      produces a "nothing lost" report the owner signs off.
- [ ] Future bookings from the old system are held as table holds during
      the switch, so nothing double-books.
- [ ] Coexistence mode is available, and the lawyer has reviewed it, for a
      restaurant still under an OpenTable contract.
- [ ] Export of everything works in one click.

**Service**
- [ ] Host stand keeps working through a dropped connection for a full
      service and syncs cleanly afterwards.
- [ ] Reminders, confirmations and notify-list texts send from live Twilio
      on a registered 10DLC campaign; STOP is honoured and recorded.
- [ ] A named person at The Pass does each move and is reachable during the
      first two weekends. **[TO FILL: who]**

**Agents and trust**
- [ ] Every agent action that spends money or messages guests goes through
      the approval queue; `change_log` shows the actor for every change.
- [ ] Each live agent has passing evals on fixture restaurants.
- [ ] Terms of service, privacy policy and data processing terms reviewed by
      a lawyer and published; prices published.

**Measurement**
- [ ] Per restaurant: direct covers by source, fees saved, deposits
      collected, no-shows, messages sent and approval rate, all visible to
      the owner. Missing values show `—`.

Not required for founding restaurants: Reserve with Google, AI phone
answering, ordering modifiers, POS hand-off, closed-loop ads. These are
what keeps them through year one.
