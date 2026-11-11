# The Pass

Next.js (App Router) · TypeScript · Tailwind v4 · Postgres (postgres.js,
Neon in production) · Netlify. See README.md for routes.

## Direction

The Pass is becoming an all-in-one, agent-run restaurant platform:
website, reservations, guest list, SMS/email, loyalty and ads. The
studio site stays until the app is ready, then the homepage switches to
platform-only.

**Every agent follows `docs/AGENTIC-PLATFORM.md`**: triggers → model with
tools → policy check in code → change log / approval queue. Read it
before building or changing an agent, a tool an agent calls, or
anything that spends money or messages guests.

## Rules

- Platform data is per restaurant group (org). Every query is scoped by
  `org_id`, and an org_id only comes from a `Tenant`
  (`lib/platform/tenant.ts`). Check permissions with `can`/`assertCan`.
- Record changes in `change_log` with the actor (email, `guest`, or
  `agent:<id>`).
- Money is integer cents. Missing metrics render `—`, never `$0`.
- Schema changes go in `db/schema.sql` and must be idempotent (guarded
  `create … if not exists`, `alter … add column if not exists`); it is
  applied on every deploy.

## Tests

- `npm test` — unit tests, no database.
- `npm run test:db` with `TEST_DATABASE_URL` pointing at a Postgres with
  `db/schema.sql` applied — reservations, isolation and race tests.
