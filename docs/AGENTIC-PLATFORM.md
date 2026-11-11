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

1. **Triggers** — background jobs (Inngest) start an agent on a schedule
   or an event. Agents never run inside a page request.
2. **Model + instructions** — Claude via tool calling (Claude Agent SDK
   or the Messages API). A role, a goal, the restaurant's context.
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
| Paid Ads + Search Terms agents (rules, approval queue) | Built, rules only, demo data | `lib/agents/`, `/agents` |
| Triggers (Inngest) | Not yet | — |
| Model + tool calling runtime | Not yet | — |
| Policy layer as code | Partly (roles, consent field) | — |
| Live Google/Meta/GBP/Twilio tools | Not yet | `lib/connectors/` |

## Agent roster

Live: **Paid Ads**, **Search Terms**. Planned: **Local SEO** (Google
Business Profile), **Website** (describe the change → preview →
publish), **Reservations** (fill slow shifts, waitlist, no-show
follow-up), **Guest Marketing** (SMS/email to the right regulars),
**Guest Support** (questions on site and by text), **Loyalty**.

The edge over platforms built on ordering data is reservations data:
covers, visit frequency, occasions and no-shows. Agents should use it.
