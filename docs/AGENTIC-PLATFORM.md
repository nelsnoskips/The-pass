# The Pass, agentic: the architecture every agent is built on

The Pass is becoming an all-in-one restaurant platform — website,
reservations, guest list, SMS and email, loyalty, and ads — run by
agents. This document is the contract for how those agents are built.
New agents, and changes to existing ones, follow it.

## What an agent is here

An agent watches a restaurant's data, decides what to change, acts
through tools, and reports what it did and why. It is not a trained
model. It is five pieces, and the value lives in pieces 3–5:

```
 TRIGGERS                 THE AGENT                       TOOLS
 nightly schedule  ──┐    ┌──────────────────────┐   ┌──▶ our data: menu, hours, guests,
 new booking/order ──┼──▶ │ instructions + goal  │   │    bookings, campaigns
 guest message     ──┤    │ model (Claude) picks │───┼──▶ Google Business Profile API
 data sync done    ──┘    │ the next tool to call│   ├──▶ Google Ads / Meta APIs
                          └──────────┬───────────┘   ├──▶ Twilio SMS, email
                                     │               └──▶ website content
                          POLICY CHECK (code, before every action)
                          act alone │ needs approval │ never
                                     │
                          CHANGE LOG · APPROVAL QUEUE · UNDO
```

1. **Triggers** — `netlify/functions/scheduled-jobs.mts` runs hourly:
   booking reminders every hour, and at 15:00 UTC each restaurant's
   Reservations Agent via `/api/agents/run` (bearer `AGENT_CRON_SECRET`).
   Inngest replaces it when we need retries, fan-out and event triggers. Agents never run inside a page
   request a guest or owner is waiting on.
2. **Model + instructions** — Claude through the Messages API with a
   manual tool loop (`lib/agent-runtime/runner.ts`), so the policy check
   sits in front of every call. A role, a goal, the restaurant's context.
3. **Tools** — typed functions over our own data and external APIs. Each
   tool is scoped to one org through a `Tenant`
   (`lib/platform/tenant.ts`) and cannot reach another restaurant's rows.
4. **Policy** — plain code, never the model, decides whether an action
   may run. See tiers below.
5. **Record** — every action, proposed or taken, is written to
   `change_log` with the actor `agent:<id>`, the reason, and the numbers
   behind it. Approvals live in `agent_decisions`.

## Policy tiers

Every tool is registered with a tier. The model cannot change it.

| Tier | Meaning | Examples |
|---|---|---|
| **auto** | Runs without asking; shown in the log and the daily summary | Correct hours from the restaurant's own settings; booking confirmations and reminders; answering a guest question from known facts |
| **approve** | Becomes a proposal in the queue; runs only after a person with the right role approves | Any ad spend or budget change; any marketing SMS or email blast; any discount or offer; review replies; publishing website copy the owner didn't write |
| **never** | Refused by the policy layer whatever the model asks | Marketing SMS to a guest without recorded consent or after STOP; messages in quiet hours; spend above the org's cap; touching another org's data |

Approve-tier actions need a role that `can(tenant, ...)` grants:
`approve_spend` for money, `message_guests` for marketing.

## Rules that don't bend

- **Agents propose, people approve** anything that spends money or
  messages guests, until a restaurant explicitly moves an action to auto.
- **Show the work.** Every proposal carries the evidence and an honest
  estimate; `null` when it can't be estimated. No claimed causation.
- **SMS consent is a record** (`guests.sms_consent_at` / `_source`),
  checked in code before every marketing send. TCPA exposure is
  $500–1,500 per message.
- **The restaurant owns its accounts, guests and data.** Ad campaigns
  live in the restaurant's own ad accounts.
- **Deterministic first.** Where a rule can find the problem (as the
  paid-ads and search-terms agents do), the rule finds it and the model
  explains and drafts. The model is not asked to do arithmetic.
- **Every agent has evals**: fixture restaurants with known problems and
  the proposals we expect. A change that drops a known-good proposal or
  adds a bad one doesn't ship.

## Where we are

| Piece | Status | Where |
|---|---|---|
| Tenant scoping and roles | Built | `lib/platform/tenant.ts` |
| Change log, agent decisions tables | Built | `db/schema.sql` |
| Reservations engine (the guest data source) | Built | `lib/reservations/` |
| Paid Ads + Search Terms agents (rules, approval queue) | Built on real Google Ads and Meta data; Google writes (budget, pause, negative keyword) on approval; Meta read-only | `lib/agent-runtime/agents/paid-ads.ts` |
| Agent runtime: tools with tiers, policy, loop, proposals | Built | `lib/agent-runtime/` |
| Triggers | Built: hourly Netlify schedule, agent and reminder endpoints (need `AGENT_CRON_SECRET`, `ANTHROPIC_API_KEY`) | `netlify/functions`, `app/api/agents/run`, `app/api/jobs` |
| Reservations agent (fill quiet shifts by SMS) | Built on the runtime | `lib/agent-runtime/agents/reservations.ts` |
| Website agent (describe a change → draft → preview → publish) | Built on the runtime; saves drafts only | `lib/agent-runtime/agents/website.ts` |
| Reviews agent (draft replies → approve → posted to Google) | Built on the runtime | `lib/agent-runtime/agents/reviews.ts` |
| Connections: Stripe deposits, Google Business Profile, Square | Built (OAuth, sealed tokens, signed webhooks) | `lib/payments`, `lib/integrations` |
| Loyalty and visits from the point of sale | Built | `lib/guests` |
| Toast (read-only, Standard API access) | Built: owner pastes credentials (sealed); hourly sync of closed checks → guests, visits, spend, loyalty; 86 list → sold-out lever (`via "Toast"`); menu import as a website draft on request. Toast only shares guest details on takeout/delivery, so dine-in checks count in sales but match no guest. Open: confirm with Toast that a vendor may use a restaurant's standard credentials on its behalf; order injection, webhooks and two-way menus need the Integration Partner program | `lib/integrations/toast.ts`, `/api/jobs/pos-sync` |
| SMS sending | Built; dry run until Twilio keys are set | `lib/messaging/sms.ts` |
| Proposal queue UI for runtime agents | Built | `/r/<org>/agents` |
| Per-restaurant agent settings: on/off, owner's instructions (appended to the system prompt in a fenced block that can't override policy), tighter-only limits enforced in tool checks, activity log | Built | `lib/agent-runtime/settings.ts`, `/r/<org>/agents/<id>` |
| STOP / START by text | Built: signed Twilio webhook sets `guests.sms_opted_out_at` for the phone at every restaurant (one shared sending number) | `app/api/webhooks/twilio`, `lib/messaging/inbound.ts` |
| Live Google/Meta/GBP tools | Google Business Profile (hours, reviews, replies) and Google Ads (reporting, approved budget/pause/negative-keyword changes) live; Meta read-only | `lib/integrations/`, `lib/ads/` |

## Writing a new agent

1. Write its tools with `defineTool`: a schema, a tier (`auto` or
   `approve`), the permission it `requires`, and a `check` for the hard
   rules. `check` runs when the agent asks and again when the action
   fires; rules about the moment of sending belong to the `execute` phase.
2. Write the `AgentSpec`: a system prompt that states the goal, when
   doing nothing is the right answer, and that a refused tool is not to
   be worked around.
3. Register it in `lib/agent-runtime/registry.ts`. If the owner should be
   able to set limits for it, add them to `AGENT_GOALS` in
   `lib/agent-runtime/settings.ts` with hard bounds, read them in the
   tool's `check` with `agentGoals(ctx)`, and never let a stored value
   loosen a limit the code sets.
4. Test it with a scripted model (`tests/agent-runtime.db.test.ts`):
   the guarantees are about what policy does with whatever the model
   asks for, so they don't need a live model to prove.

## Agent roster

Live: **Reservations** (fill quiet shifts from lapsed regulars),
**Website** (describe the change → draft → owner publishes), **Reviews**
(draft a reply to each Google review → approve → posted), **Paid Ads**
with search terms (real Google Ads and Meta numbers; Google budget,
pause and negative-keyword changes on approval). Planned: **Local SEO**
(listing drift guard, holiday hours), **Guest Marketing** (SMS/email to
the right regulars), **Guest Support** (questions on site and by text),
**Loyalty**.

The edge over platforms built on ordering data is reservations data:
covers, visit frequency, occasions and no-shows. Agents should use it.

## Product build order

The twelve storefront, marketing and data products, in the order we
build them. The order follows dependencies: each wave runs on what the
wave before it produced. Reservations (engine built) ships inside the
Website wave as its booking page and host stand.

| Wave | Product | Why here | State |
|---|---|---|---|
| 1 | **Website** | Everything a guest touches lives on it: booking, ordering, gift cards, sign-up. Needs the shared site engine | Bespoke sites only; no engine |
| 1 | **CRM** (guest list) | Every marketing product reads it | `guests` table built; no screen |
| 1 | **Reporting** | Already the strongest part; extend from ads to bookings, guests, messages | Ads reporting built |
| 2 | **SMS** | Confirmations and reminders first, then campaigns | Sender and consent rules built; dry run |
| 2 | **Email** | Same campaign model as SMS, on Resend | Resend wired for studio mail only |
| 2 | **Loyalty** | Visit-based rewards on the CRM | Visit counts built |
| 2 | **Referrals** | A small layer on loyalty + SMS | Not started |
| 3 | **Gift cards** | Self-contained on Stripe; money in before it's spent | Built: sold on the site, emailed codes, partial redemption (`lib/giftcards`) |
| 3 | **Ordering** | The largest build: menu, cart, payment, tax, tips, kitchen/POS hand-off | Pickup built: site menu, server-side pricing, tax, tips, Stripe, kitchen board, pause, sold-out, ready texts (`lib/ordering`). Still to do: delivery, modifiers, POS hand-off |
| 3 | **Catering** | Ordering for large orders: quotes, deposits, invoices | Orders with notice, headcount and a minimum built; quotes and invoices to do |
| 4 | **Mobile app** | A shell over ordering + loyalty; app-store review | Built as an installable web app (PWA): builder with live phone preview, draft/publish, levers for the assistant, offline menu and hours (`lib/app`, `/r/<org>/app`, `/s/<site>/app`). App-store wrapping to do |
| 4 | **Push** | Needs the app | Shell: guests' "Get updates" subscriptions stored once `VAPID_PUBLIC_KEY` is set; sending not built |

