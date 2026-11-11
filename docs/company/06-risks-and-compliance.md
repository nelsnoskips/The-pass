# 06 · Risks and compliance

Status: working draft, November 2026. **This is not legal advice.** Items
marked ⚖️ need a lawyer before launch or before the feature ships. Legal
research for this draft was thin in places: TCPA, CTIA and CAN-SPAM detail
was **not** pulled from primary sources (FCC, CTIA, FTC), and state
gift-card statutes were not verified. Treat the descriptions as a starting
list for counsel, not as conclusions.

Scale: **Likelihood** and **Impact** are High / Medium / Low. **[TO FILL]**
marks an owner or fact we don't have.

---

## 1. Risk register

### Market

| ID | Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|---|
| M1 | Independents won't pay a flat fee at our price points; no willingness-to-pay data exists for a flat all-in-one at this scale (main report) | M | H | 20–30 discovery interviews before fixing prices; founding offer as a priced test; watch audit → paid conversion (see `04`) | [TO FILL] |
| M2 | The segment shrinks: independents fell 2.3% in 2025, full-service independents down ~2.6% ([Restaurant Business](https://www.restaurantbusinessonline.com/operations/number-independent-restaurants-declined-23-2025); [FES](https://fesmag.com/topics/perspectives/this-week-in-foodservice/23426-a-changing-landscape-independents-contract-as-chains-rethink-operations)); ~10% of full-service restaurants at risk of closure in 2026 ([PMQ](https://www.pmq.com/study-nearly-10-of-full-service-restaurants-face-risk-of-closure-in-2026/)) | H | M | Model churn with a closure floor; aim at 2–20 location groups where closure risk is spread; month-to-month means no bad-debt contracts to chase | [TO FILL] |
| M3 | Operators are cutting costs (82% actively reducing expenses, [Popmenu](https://get.popmenu.com/toolkit/state-of-the-plate-2025)) and treat new software as a cost, not a saving | H | M | Lead with fees saved (per-cover, 2% deposits, agency %) in the leak audit; show the monthly saving in the product | [TO FILL] |
| M4 | Restaurants value a diner network more than ownership; leaving OpenTable/Resy loses covers | M | H | Coexistence mode to measure network covers before leaving; Reserve with Google; ads agent with cost per seated cover | [TO FILL] |

### Competitive

| ID | Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|---|
| C1 | Owner.com ($240M Series D, Aug 2026, [PR Newswire](https://www.prnewswire.com/news-releases/owner-raises-240m-led-by-goldman-sachs-alternatives-to-build-the-ai-native-platform-for-every-local-business-302862420.html)) adds reservations and a host stand | M | H | Move fast on dine-in depth (import fidelity, offline host stand, booking-aware agents) that an ordering-first product won't prioritise; don't fight on ordering | [TO FILL] |
| C2 | DashOS bundles reservations with $10–12 diner credits and "no cover fees ever" ([Food On Demand](https://foodondemand.com/05122026/doordash-ramps-up-reservations-with-largest-expansion-yet/)) | M | M | Neutrality and data ownership in the contract; guests belong to the restaurant | [TO FILL] |
| C3 | OpenTable changes terms (e.g. drops cover fees or the system-of-record clause) and removes our switching trigger | M | M | Triggers are a calendar, not the product; lead with ownership, month-to-month and agents | [TO FILL] |
| C4 | Toast bundles IQ Grow agents more cheaply for its ~189k locations ([Toast 8-K](https://www.sec.gov/Archives/edgar/data/0001650164/000165016426000214/tost-20260930xexhibit991.htm)) | H | M | Integrate with Toast instead of competing; be POS-independent so the guest record survives a POS switch | [TO FILL] |
| C5 | Google ships free AI review replies in Business Profile ([SE Roundtable](https://www.seroundtable.com/google-reply-to-reviews-with-al-41095.html)) | H | L | Already assumed: win on booking context and reply hygiene, not drafting | [TO FILL] |
| C6 | A platform partner (Toast, Google, Meta) denies or revokes API access | M | H | Apply early; fallbacks in `05` §4; no single partner on the critical path for the wedge | [TO FILL] |

### Product and technology

| ID | Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|---|
| P1 | Import loses guest notes or history during a switch (as at Union Square Cafe, [Caper](https://caper.media/p/union-square-hospitality-group-reservation-move-sevenrooms-opentable)) | M | H | Import v2 with a signed "nothing lost" report; dry run first (built) | [TO FILL] |
| P2 | Host stand fails during service (connection drop, outage) | M | H | Offline mode before founding launch; status page; on-call during weekends | [TO FILL] |
| P3 | An agent sends the wrong message or changes spend wrongly | M | H | Policy in code before every action; approve tier for spend and marketing; hard caps; evals per agent; `change_log` and undo (built) | [TO FILL] |
| P4 | AI model cost per location runs above plan; per-token prices in our notes are unverified | M | M | Measure per agent; route routine work to cheaper models; prompt caching; skip runs with no work (built) | [TO FILL] |
| P5 | A data-isolation bug exposes one restaurant's guests to another | L | H | Every query scoped by `org_id` from a `Tenant`; isolation tests (built); security review before launch | [TO FILL] |
| P6 | Third-party API versions retire (Google Ads ~yearly, Meta on a schedule) and break syncs | H | L | Versions set by environment variable (built); sync health shown as "needs attention" | [TO FILL] |
| P7 | Double bookings during a switch, when two systems take bookings | M | M | Database exclusion constraint (built); import future bookings as holds; coexistence mode takes direct bookings only | [TO FILL] |

### Operational

| ID | Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|---|
| O1 | White-glove switching doesn't scale; support cost eats margin (largest cost line in `04` §3) | H | M | Measure support hours per location; build self-serve import for the common systems; paid onboarding only as a last resort | [TO FILL] |
| O2 | Founder-led sales caps growth at ~5 restaurants a month | H | M | Leak audit as the self-serve funnel; first sales hire in 2028 (base case) | [TO FILL] |
| O3 | Key-person dependency in a small team | M | H | Documented runbooks; `docs/` as the contract for agents | [TO FILL] |
| O4 | Funding: base case burns ~$3.5M over three years with no break-even | M | H | Raise against the base case plus buffer; milestones tied to suite mix and payback | [TO FILL] |
| O5 | SMS deliverability: carrier filtering or a 10DLC rejection stops reminders for a restaurant | M | H | Per-restaurant registration; transactional and marketing traffic on separate campaigns; monitor failure rates | [TO FILL] |

### Legal and regulatory

| ID | Risk | L | I | Mitigation | Owner |
|---|---|---|---|---|---|
| L1 | TCPA claim over a marketing text: statutory damages of $500–1,500 per message (`docs/AGENTIC-PLATFORM.md`) | M | H | Consent as a record checked at send (built); inbound STOP recorded (to build); quiet hours (built); ⚖️ review | [TO FILL] |
| L2 | The Pass holds restaurant funds (deposits, gift cards, orders) in its own Stripe account, which could raise money-transmission questions | H today | H | Move to Stripe Connect before production so funds go to the restaurant's account; ⚖️ review of flows | [TO FILL] |
| L3 | A restaurant breaches its OpenTable contract by switching to us; OpenTable blames us (tortious interference) | M | M | Coexistence mode; restaurants confirm contract status; no inducement to breach; ⚖️ review | [TO FILL] |
| L4 | FTC Consumer Review Rule violation through review requests or AI replies | L | H | No gating; requests to every seated guest, logged; no fake or AI-written reviews; ⚖️ review | [TO FILL] |
| L5 | Gift card law: expiry, fees or escheat handled wrong in some state | M | M | No expiry and no fees by default; per-state liability report; ⚖️ review | [TO FILL] |
| L6 | Privacy law (CCPA/CPRA and other state laws) obligations as a processor of guest data | M | M | Processor terms with restaurants; access and delete flows; minimal data; ⚖️ review | [TO FILL] |
| L7 | Our own pricing and cancellation practices draw the scrutiny the FTC case against Toast shows ([DLA Piper](https://www.dlapiper.com/en/insights/publications/2026/11/ftc-and-seven-states-sue-toast)) | L | H | Month to month, self-serve online cancellation, no add-ons billed without consent, prices published | [TO FILL] |

---

## 2. Compliance checklist

Status uses the code today: **Built**, **Partial**, **To build**. ⚖️ =
needs a lawyer.

### SMS: TCPA, 10DLC and CTIA

| Requirement | How The Pass handles it | Status |
|---|---|---|
| Prior express written consent before marketing texts (TCPA) ⚖️ | Consent stored as a record (`sms_consent_at`, `sms_consent_source`); checked in code before every marketing send; import never assumes consent; opt-in is a separate, unticked checkbox | Built |
| Transactional vs marketing separation | Confirmations, reminders and waitlist texts are transactional; promotions need consent | Built. ⚖️ confirm reminder wording stays transactional |
| Opt-out honoured promptly; STOP/HELP keywords (CTIA) | Opt-out line appended to marketing texts. **Inbound STOP is not yet written to `sms_opted_out_at`**; carrier-level opt-out depends on the Twilio set-up | **Partial — must build before launch** |
| Revocation of consent "by any reasonable means" (FCC rules effective 2025) ⚖️ | Not researched from primary sources. Staff need a way to record an opt-out received by phone or in person | To build; ⚖️ |
| Quiet hours ⚖️ | Marketing sends only 10:00–20:00 local; policy refuses outside it. The federal TCPA rule for telephone solicitations is 8am–9pm local (47 CFR 64.1200(c)(1); from general knowledge, not our research); some states are stricter **[TO VERIFY by state]** | Built |
| Frequency | At most one marketing text per guest per week | Built |
| 10DLC brand and campaign registration per sender | Single `TWILIO_FROM` for all restaurants today; need per-restaurant brand and campaign under a Twilio ISV set-up ([Twilio](https://support.twilio.com/hc/en-us/articles/11587910480155-A2P-10DLC-Campaign-Vetting-FAQ)) | To build |
| Message content rules (CTIA; carrier filtering of SHAFT content, link shorteners) | Not researched. Agent prompts and policy should block alcohol/cannabis promotion where restricted and shortened links **[TO VERIFY]** | To build |
| Consent records retained and exportable | Export includes consent and opt-out history | Built |

### Email: CAN-SPAM

| Requirement | How | Status |
|---|---|---|
| Working unsubscribe, honoured promptly | One-click unsubscribe in body and `List-Unsubscribe` header; signed link | Built |
| Separate email consent | `email_consent_at` / `_source`, apart from SMS | Built |
| Accurate sender identity and subject lines | Restaurant name as sender **[TO VERIFY in templates]** | Partial |
| Physical postal address of the sender in each marketing email ⚖️ | Not checked in the current templates | To verify |
| Sender authentication (SPF, DKIM) | Resend sending-domain set-up | To do at launch |

### Reviews: FTC Consumer Review Rule (16 CFR 465, effective October 2024)

Bans fake reviews (AI-generated reviews count), sentiment-conditioned
incentives and review suppression. The FTC sent warning letters about
review gating in late 2025 / January 2026 ([Morgan Lewis](https://www.morganlewis.com/pubs/2024/08/ftc-issues-final-rule-on-consumer-reviews-and-testimonials);
[Arnold & Porter](https://www.arnoldporter.com/en/perspectives/blogs/consumer-products-and-retail-navigator/2026/01/ftc-warning-letters-over-consumer-review-rule)).

| Requirement | How | Status |
|---|---|---|
| No review gating: every guest gets the same chance to leave a public review | Review requests to all seated guests regardless of sentiment; private feedback never suppresses the public link | To build (with G5) |
| Proof of no gating | `change_log` records who was asked | To build |
| No incentives conditioned on positive sentiment | Policy refuses offers tied to review content | To build |
| No fake or AI-written reviews | Agents write **replies** only, never reviews; every reply approved by a person | Built |
| Replies are not misleading | Approval queue; booking-context facts checked against data | Partial |

### Gift cards and unclaimed property

| Requirement | How | Status |
|---|---|---|
| Federal CARD Act: no expiry within 5 years of purchase or last load; dormancy fees only after 12 months of inactivity, disclosed ([NRN](https://nrn.com/casual-dining/new-rules-for-gift-cards-go-into-effect)) | No expiry field; no fees | Built (no expiry, no fees) |
| Stricter state laws (e.g. cash-back for small balances in some states) ⚖️ | Not verified ([DWT chart](https://www.dwt.com/files/Uploads/Documents/Publications/Gift%20Card%20Chart%20(3).pdf)) | ⚖️ To verify |
| State escheat (unclaimed property): rules and dormancy periods vary, 2–5 years; some states exempt no-expiry, no-fee cards ⚖️ | Track issue date, last activity and selling state; per-state liability report. Who reports (the restaurant, not The Pass) set in the terms | To build |
| Promotional (bonus) cards tracked apart from paid value ([Baker Tilly](https://bakertilly.com/insights/balancing-act-how-account-restaurant-gift-cards)) | Not supported yet | To build |
| Who holds the funds ⚖️ | Today one platform Stripe account; must move to Stripe Connect so proceeds go to the restaurant | **To build before launch** |

### Reservation resale laws

New York requires a written agreement before a third party lists a
restaurant's reservations, with fines of $1,000 per day ([Holland & Knight](https://hklaw.com/en/insights/publications/2025/02/new-york-curbs-scalping-of-restaurant-reservations)).
Florida, Hawaii and Nevada have similar laws; Philadelphia has an ordinance;
California AB 1640 passed the Assembly, final status unverified
([SC Daily Gazette](https://scdailygazette.com/2025/06/27/black-market-dining-reservations-sell-for-thousands-states-want-to-stop-that/);
[LegiScan](https://legiscan.com/CA/bill/AB1640/2172)).

| Requirement | How | Status |
|---|---|---|
| The Pass is the restaurant's authorized booking platform, in writing | Restaurant agreement names The Pass as its platform ⚖️ | To do in terms |
| Bookings tied to a guest, not resellable | One live booking per phone per service; rate limits | Built |
| Broker-pattern flags for the host | — | To build |
| Reserve with Google and other channels are authorized by the restaurant | Restaurant enables each channel | To build with G4 |

### Payments and PCI scope

| Requirement | How | Status |
|---|---|---|
| Card data never touches our servers | Stripe Checkout hosted pages; signed webhooks; idempotency keys | Built |
| PCI DSS scope kept minimal ⚖️ / QSA | With hosted Checkout we expect the simplest self-assessment (SAQ A) **[TO VERIFY with Stripe/QSA]** | To confirm |
| Funds go to the restaurant; no platform cut | Stripe Connect (see above) | To build |
| Deposit and no-show policy stated before booking; no-show charge needs a host, is logged, can't hit a seated party | Policy shown before booking; status rules prevent seated → no-show | Built (live Stripe pending) |

### Data privacy (CCPA/CPRA and other state laws)

| Requirement | How | Status |
|---|---|---|
| Role: The Pass as a service provider/processor to each restaurant ⚖️ | Data processing terms with each restaurant | To do |
| Thresholds: whether CCPA applies to The Pass directly ⚖️ | Not assessed | ⚖️ |
| Notice to guests at collection | Booking and sign-up forms link to the restaurant's and our privacy notices **[TO VERIFY]**; privacy page exists at `/privacy` | Partial |
| Access, deletion and export requests | Export built; per-guest delete flow **[TO VERIFY]** | Partial |
| Data minimisation and isolation | Hold only what a booking needs; every query scoped by org; isolation tests | Built |
| Never market a guest for anyone but their restaurant | Messages mention only that restaurant | Built |
| Secrets and tokens | OAuth tokens sealed; webhooks signed | Built |
| Sub-processor list (Twilio, Resend, Stripe, Anthropic, Google, Meta, Square, Netlify, Neon) | Published in the privacy policy | To verify |
| Breach response plan | — | To write |

### AI-agent accountability

| Requirement | How | Status |
|---|---|---|
| A person approves anything that spends money or messages guests | Approve tier in the policy layer; role checks (`approve_spend`, `message_guests`) | Built |
| Policy decided by code, not the model | Tier fixed at tool registration; `check` runs at proposal and again at execution | Built |
| Full record of every action and who did it | `change_log` with actor `agent:<id>`, reason and numbers; `agent_decisions`, `agent_runs`, `agent_proposals` | Built |
| Undo | Website versions roll back; other actions **[TO VERIFY per tool]** | Partial |
| Honest claims: estimates shown, `null` when unknown, no claimed causation | Rule in `docs/AGENTIC-PLATFORM.md`; holdout groups to prove lift | Partial |
| Evals before shipping an agent change | Scripted-model tests exist; fixture evals per agent | Partial |
| Disclose AI use to restaurants (and, for phone answering, to callers) ⚖️ | Some states regulate AI disclosure and call recording **[TO VERIFY]** | To do before G8 |

### The OpenTable "system of record" clause

OpenTable's March 2026 agreement requires the restaurant to make OpenTable
its primary system for reservations, table and guest management, to put all
tables on the OpenTable marketplace, and charges 100% of remaining fees for
cancelling in the initial term (50% of subscription in a renewal term)
([Restaurant Business](https://www.restaurantbusinessonline.com/technology/opentable-will-require-restaurants-make-it-their-primary-reservations-system);
[Yahoo Finance](https://finance.yahoo.com/sectors/technology/articles/why-restaurants-anxious-opentable-terms-105500851.html)).
Washington's AG antitrust division said it would review the terms
([Washington State Standard](https://washingtonstatestandard.com/2026/04/15/opentables-new-rules-have-a-seattle-business-leader-calling-foul/)).

Questions for counsel ⚖️:

1. Can a restaurant under these terms run The Pass for direct bookings only
   (website, Google, Instagram) without breaching "primary system"?
2. Does importing the restaurant's guest data from OpenTable breach any
   data clause? The restaurant's right to its own guest data needs checking.
3. What may our sales materials say about the clause and early-termination
   costs without inducing breach?
4. Should we publish a contract-anniversary checker in the leak audit?

Until answered: coexistence mode is offered only after the restaurant
confirms its contract status, and we never advise a restaurant to breach.

### Our own terms (lessons from the Toast case)

- [ ] Month to month; cancel online, any day, without a phone call.
- [ ] No add-on billed without an explicit, logged opt-in.
- [ ] Prices public; founding price lock written into the agreement.
- [ ] No exclusivity, no inventory requirements, export any time — in the
      contract, not only in marketing.
- [ ] ⚖️ Terms of service, privacy policy and data processing terms
      reviewed before the first founding restaurant.

---

## 3. What needs a lawyer, in order

1. Money flows: Stripe Connect structure for deposits, gift cards and orders
   (L2), and PCI scope.
2. TCPA and 10DLC: consent language, reminder wording, revocation handling,
   state quiet hours (L1).
3. OpenTable coexistence mode and switch-kit marketing (L3).
4. Customer agreement, privacy policy, data processing terms, sub-processors (L6, L7).
5. Gift-card state rules and escheat responsibility (L5).
6. Review requests and reply practices under the FTC rule (L4).
7. AI phone answering: disclosure and call recording, before G8 ships.

**[TO FILL: counsel engaged, budget, target dates]**
