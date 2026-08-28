# The Pass

**Restaurant marketing intelligence.** Every restaurant location. Every
campaign. Every meaningful result. One clear view.

The Pass is a multi-location restaurant marketing reporting platform that
turns Google Ads and Meta Ads data into a clear, owner-friendly view of
spend, guest actions (reservations, orders, calls), cost per result, and
marketing return — wrapped in a managed-service experience: a daily
executive briefing, a transparent Pass Score, a prioritized opportunity
feed, and visible management activity.

Built with **Next.js (App Router) · TypeScript · Tailwind CSS v4** in the
**Hospitality Intelligence** design system (warm ivory canvas, ink-navy
navigation, cobalt interaction color, editorial serif headlines).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

No environment variables are needed — the app ships with a fully seeded
demo brand (**Santorini by Georgios**, Fort Lauderdale + Miami Beach) whose
daily fact data is generated deterministically and sums exactly to the
blueprint's Last-30-Days totals.

```bash
npm test           # vitest: metrics, dates, data layer, authorization
npm run lint       # eslint
npm run build      # production build
```

## What's inside

| Route | Purpose |
| --- | --- |
| `/` | Command Center: Daily Pass briefing, Return Hero, Pass Score, opportunities, Marketing Pulse, management activity, location comparison, campaign breakdown |
| `/campaigns`, `/campaigns/[id]` | Campaign ledger + detail (Search keywords/terms, PMax insights, Meta ad sets) |
| `/keywords` | Keywords · Search Terms · PMax Search Insights · Location Keywords |
| `/conversions` | Normalized conversion categories, mapping, attribution disclosures |
| `/locations`, `/locations/[id]` | Location comparison and profiles/mappings |
| `/calendar` | Month/week/list marketing calendar with item drawer |
| `/reports` | Executive Report + The Month in Review (print/PDF), saved reports |
| `/integrations` | Connection status, mappings, sync history (demo mode) |
| `/settings` | Brand settings, demo role switching, notification preferences |
| `/api/reports/campaign-performance` | Scoped reporting endpoint |

Concept rooms (the Test Kitchen — demo restaurant sites, not part of the app):

| Route | Concept |
| --- | --- |
| `/serein` | SEREIN: a tasting room that loses its light as you scroll |
| `/house-issue` | HOUSE ISSUE: a deli that publishes everything it makes |
| `/feedback` | FEEDBACK: a burger counter you have to turn up before it feeds you |

## Architecture notes

- **Data access:** pages talk only to `lib/data/` query functions returning
  normalized types (`lib/types.ts`). The seeded demo source and future live
  connectors (`lib/connectors/`) implement the same contract.
- **Authorization:** roles and location grants are enforced in the data
  layer and API, not by hiding UI. Switch demo users in Settings to verify.
- **Metric rules:** ratios with zero denominators and unsupported platform
  metrics render `—`, never a false `$0`. Money is stored in integer cents.
- **Filters:** brand/location/platform/date/comparison state lives in the
  URL and persists across pages and exports.

Deploying: `netlify.toml` is included; connect the repo in Netlify (or
Vercel) and deploy with defaults.
