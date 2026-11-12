-- The Pass — studio backend.
--
-- Three things live here: the clients and the website projects being
-- built for them, the mock reviews sent out for comment, and the
-- proposals generated for prospects.
--
-- Applied with `npm run db:migrate`. Every statement is guarded, so
-- running it against an existing database is safe and repeatable.

create extension if not exists pgcrypto;

-- --------------------------------------------------------------- who --

create table if not exists clients (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  contact_name text,
  contact_email text,
  -- Restaurant, mechanical contractor, and so on. Free text: the
  -- studio's segments change faster than a migration cycle.
  segment      text,
  notes        text,
  created_at   timestamptz not null default now()
);

-- Where a website build has got to. Kept as a small closed set because
-- the studio dashboard groups by it; adding one is a deliberate act.
do $$ begin
  create type project_stage as enum (
    'lead', 'proposal_sent', 'building', 'in_review', 'approved', 'live', 'archived'
  );
exception when duplicate_object then null; end $$;

create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  name        text not null,
  stage       project_stage not null default 'lead',
  -- Where the built mock actually lives, e.g. /spec/orravan.
  mock_path   text,
  live_url    text,
  monthly_fee numeric(10,2),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projects_client_idx on projects(client_id);
create index if not exists projects_stage_idx on projects(stage);

-- ------------------------------------------------------------ review --

-- One round of "here is the mock, tell us what to change". The token is
-- the client's whole credential: unguessable, revocable by closing the
-- round, and carried in the URL so a client never has to make an
-- account to leave a comment.
create table if not exists review_rounds (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  token       text not null unique,
  round       integer not null default 1,
  -- open: accepting comments. submitted: the client pressed send.
  -- closed: the studio is done with it.
  status      text not null default 'open',
  note        text,
  created_at  timestamptz not null default now(),
  submitted_at timestamptz
);

create index if not exists review_rounds_project_idx on review_rounds(project_id);

do $$ begin
  create type comment_kind as enum ('comment', 'edit');
exception when duplicate_object then null; end $$;

-- A single pin dropped on the mock. Position is stored two ways on
-- purpose: the CSS selector survives a re-render and a different
-- viewport, the percentages survive a changed selector. Whichever one
-- still resolves, the pin lands close to what the client meant.
create table if not exists review_comments (
  id            uuid primary key default gen_random_uuid(),
  round_id      uuid not null references review_rounds(id) on delete cascade,
  kind          comment_kind not null default 'comment',
  page_path     text not null,
  selector      text,
  x_pct         real,
  y_pct         real,
  -- For an edit: what the text said, and what they want it to say.
  original_text text,
  suggested_text text,
  body          text,
  author        text,
  resolved      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists review_comments_round_idx on review_comments(round_id);

-- ---------------------------------------------------------- proposals --

-- Generated quotes. Line items are jsonb because every quote has a
-- different shape — one number for one client, two competing options
-- for another — and a line_items table would be five joins to render
-- one page.
create table if not exists proposals (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references clients(id) on delete set null,
  slug         text not null unique,
  company      text not null,
  contact_name text,
  headline     text not null,
  intro        text,
  monthly_fee  numeric(10,2),
  line_items   jsonb not null default '[]'::jsonb,
  includes     text,
  footnote     text,
  pullquote    text,
  valid_days   integer not null default 30,
  status       text not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------- auth --

-- Studio login. One row per magic link issued; consumed on first use so
-- a forwarded email cannot be replayed.
create table if not exists login_tokens (
  token      text primary key,
  email      text not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token      text primary key,
  email      text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_expiry_idx on sessions(expires_at);

-- ------------------------------------------------ added after launch --
-- Written as guarded ALTERs rather than edits to the CREATE statements
-- above, so a database that already has data can be brought forward by
-- running this file again.

-- A durable per-project token for the client's own status page. Unlike
-- a review token, which belongs to one round and is closed with it,
-- this one stays valid for the life of the project so a client can
-- bookmark "where are we at" and it keeps working.
alter table projects add column if not exists status_token text unique;

-- When the studio last opened a submitted round. This is what makes
-- "new" mean new — a count of unresolved comments says how much work
-- is outstanding, which is a different question from whether anything
-- has arrived since you last looked.
alter table review_rounds add column if not exists seen_at timestamptz;

-- Archived clients drop out of the board but keep their history. The
-- alternative, deleting them, loses the record of work actually done.
alter table clients add column if not exists archived_at timestamptz;

create index if not exists clients_archived_idx on clients(archived_at);

-- Backfill status tokens for any project created before this existed.
update projects
set status_token = encode(gen_random_bytes(18), 'base64')
where status_token is null;

-- base64 can contain / and +, which are awkward in a URL. Normalise to
-- the url-safe alphabet rather than asking every reader to escape them.
update projects
set status_token = replace(replace(replace(status_token, '/', '_'), '+', '-'), '=', '')
where status_token like '%/%' or status_token like '%+%' or status_token like '%=%';

-- Electronic signatures on hosted agreements. The row is the record of
-- who accepted which agreement and when; the emails that go out are
-- notifications, not the record. Slug identifies the agreement page
-- (e.g. orravan-agreement) so one table serves every future client.
create table if not exists agreement_signatures (
  id bigint generated always as identity primary key,
  agreement_slug text not null,
  signer_name text not null,
  signer_title text,
  signer_email text not null,
  user_agent text,
  signed_at timestamptz not null default now()
);

create index if not exists agreement_signatures_slug_idx
  on agreement_signatures(agreement_slug);

-- Several mocks on one project. A website redesign is sold as three
-- concepts the client picks from, so the review tool has to be able to
-- put all three behind one link rather than making the client hold
-- three tabs open and tell us which was which. `mock_path` stays as
-- the single-mock case and as the fallback for every project that
-- predates this.
alter table projects add column if not exists mocks jsonb not null default '[]'::jsonb;

-- Which direction the client picked, recorded on the round they picked
-- it in. Notes say what to change; this says what to change *about
-- what*, and without it a three-concept round comes back unanswerable.
alter table review_rounds add column if not exists chosen text;

-- ==================================================================
-- The platform: restaurant accounts, reservations, guests.
--
-- Everything below belongs to one restaurant group (an "org"), and
-- every row carries org_id directly — not only through a parent — so
-- that every query can be scoped with one equality and a missing
-- scope is visible in review. lib/platform/tenant.ts is the only way
-- application code gets an org_id.
-- ==================================================================

-- Exclusion constraints over (uuid, range) need gist support for =.
create extension if not exists btree_gist;

create table if not exists orgs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

-- Who can sign in to an org, and as what. Studio staff are not listed
-- here: the studio allowlist makes them staff across every org.
--   owner   — everything, including billing and spend approvals
--   manager — runs the restaurant and approves spend
--   host    — the host stand: bookings, seating, guests
--   viewer  — read only
-- venue_ids null means every venue in the org.
create table if not exists org_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs(id) on delete cascade,
  email      text not null,
  role       text not null check (role in ('owner', 'manager', 'host', 'viewer')),
  venue_ids  uuid[],
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create index if not exists org_members_email_idx on org_members(lower(email));

-- A physical restaurant. Times for a venue are always reasoned about in
-- its own timezone; storage is timestamptz.
create table if not exists venues (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs(id) on delete cascade,
  name       text not null,
  slug       text not null,
  timezone   text not null default 'America/New_York',
  phone      text,
  address    text,
  -- Online booking window and cut-off.
  booking_horizon_days integer not null default 60,
  min_notice_minutes   integer not null default 60,
  max_party_online     integer not null default 8,
  created_at timestamptz not null default now(),
  unique (org_id, slug)
);

create table if not exists dining_tables (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  venue_id    uuid not null references venues(id) on delete cascade,
  label       text not null,
  area        text,
  min_covers  integer not null default 1 check (min_covers >= 1),
  max_covers  integer not null check (max_covers >= min_covers),
  -- Held back from online booking (the walk-in two-top by the bar).
  online      boolean not null default true,
  active      boolean not null default true,
  unique (venue_id, label)
);

-- When the room takes bookings. first_seating/last_seating are local
-- wall-clock times; days_of_week uses 0 = Sunday.
create table if not exists service_periods (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  venue_id       uuid not null references venues(id) on delete cascade,
  name           text not null,
  days_of_week   smallint[] not null,
  first_seating  time not null,
  last_seating   time not null,
  slot_minutes   integer not null default 15 check (slot_minutes > 0),
  -- How long a party holds a table, by size. Keys are max party size,
  -- e.g. {"2":75,"4":90,"99":120}; the smallest key >= party wins.
  turn_minutes   jsonb not null default '{"2":75,"4":90,"6":105,"99":120}'::jsonb,
  -- Pacing: most covers allowed to start in one slot. Null = no cap.
  max_covers_per_slot integer,
  -- Deposit per cover for this period, in cents. 0 = none.
  deposit_cents_per_cover integer not null default 0
);

create table if not exists venue_closures (
  id       uuid primary key default gen_random_uuid(),
  org_id   uuid not null references orgs(id) on delete cascade,
  venue_id uuid not null references venues(id) on delete cascade,
  date     date not null,
  reason   text,
  unique (venue_id, date)
);

-- A guest belongs to the org, not a venue: a regular at one location is
-- a regular of the group. Phone (E.164) is the identity, because it is
-- what a host types and what SMS needs.
create table if not exists guests (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  phone          text not null,
  name           text not null,
  email          text,
  notes          text,
  tags           text[] not null default '{}',
  -- Marketing consent is a record, not a flag: when, and how. Booking
  -- confirmations are transactional and do not need it; promotions do.
  sms_consent_at     timestamptz,
  sms_consent_source text,
  sms_opted_out_at   timestamptz,
  visit_count    integer not null default 0,
  no_show_count  integer not null default 0,
  last_visit_at  timestamptz,
  created_at     timestamptz not null default now(),
  unique (org_id, phone)
);

do $$ begin
  create type reservation_status as enum (
    'booked', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'
  );
exception when duplicate_object then null; end $$;

create table if not exists reservations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  venue_id     uuid not null references venues(id) on delete cascade,
  guest_id     uuid not null references guests(id),
  party_size   integer not null check (party_size >= 1),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null check (ends_at > starts_at),
  status       reservation_status not null default 'booked',
  -- website, google, instagram, phone, walk_in, import, agent
  source       text not null default 'website',
  notes        text,
  deposit_cents  integer not null default 0,
  deposit_status text not null default 'none'
    check (deposit_status in ('none', 'pending', 'held', 'captured', 'refunded')),
  stripe_payment_intent text,
  -- The guest's own link to view, change or cancel. Their whole
  -- credential, like a review token.
  manage_token text not null unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists reservations_venue_day_idx on reservations(venue_id, starts_at);
create index if not exists reservations_guest_idx on reservations(guest_id);

-- Which tables a reservation holds, and when. The exclusion constraint
-- is the double-booking guarantee: two live holds on one table cannot
-- overlap in time, whatever the application does and however many
-- requests race. Cancelling releases the hold by clearing `live`.
create table if not exists reservation_tables (
  reservation_id uuid not null references reservations(id) on delete cascade,
  table_id       uuid not null references dining_tables(id),
  org_id         uuid not null references orgs(id) on delete cascade,
  during         tstzrange not null,
  live           boolean not null default true,
  primary key (reservation_id, table_id)
);

do $$ begin
  alter table reservation_tables
    add constraint reservation_tables_no_overlap
    exclude using gist (table_id with =, during with &&) where (live);
exception when duplicate_object or duplicate_table then null; end $$;

-- Every change that matters, by whom: a person (their email), a guest
-- ('guest'), or an agent ('agent:paid_ads'). The answer to "who moved
-- my budget / cancelled this table" is a query, not a guess.
create table if not exists change_log (
  id         bigint generated always as identity primary key,
  org_id     uuid not null references orgs(id) on delete cascade,
  actor      text not null,
  action     text not null,
  entity     text not null,
  entity_id  text,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists change_log_org_idx on change_log(org_id, created_at desc);

-- Approve/dismiss on agent proposals, replacing the browser-only record.
create table if not exists agent_decisions (
  org_id      uuid not null references orgs(id) on delete cascade,
  proposal_id text not null,
  decision    text not null check (decision in ('approved', 'dismissed')),
  decided_by  text not null,
  decided_at  timestamptz not null default now(),
  primary key (org_id, proposal_id)
);

-- ------------------------------------------------- agent runtime --
-- One row per time an agent ran: what woke it, how it ended, what it
-- cost. The change_log holds the individual actions.
create table if not exists agent_runs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  agent_id    text not null,
  trigger     text not null,
  status      text not null default 'running'
    check (status in ('running', 'completed', 'failed', 'stopped')),
  summary     text,
  error       text,
  usage       jsonb not null default '{}'::jsonb,
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists agent_runs_org_idx on agent_runs(org_id, started_at desc);

-- An action an agent wanted to take that policy says a person must
-- approve. The tool and its exact input are stored, so approval runs
-- precisely what was reviewed — no model is involved at approval time.
create table if not exists agent_proposals (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  agent_id    text not null,
  run_id      uuid references agent_runs(id) on delete set null,
  tool        text not null,
  input       jsonb not null,
  title       text not null,
  rationale   text not null,
  status      text not null default 'pending'
    check (status in ('pending', 'executed', 'rejected', 'failed', 'blocked')),
  result      jsonb,
  decided_by  text,
  decided_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists agent_proposals_org_idx on agent_proposals(org_id, status, created_at desc);

-- Every message to a guest, sent or not. The record behind frequency
-- caps ("not more than one promotion a week") and behind any question
-- about who was texted what, when, and on whose say-so.
create table if not exists guest_messages (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  guest_id    uuid not null references guests(id) on delete cascade,
  channel     text not null default 'sms',
  -- transactional: about the guest's own booking. marketing: needs consent.
  kind        text not null check (kind in ('transactional', 'marketing')),
  body        text not null,
  -- dry_run: no SMS provider configured, nothing left the building.
  status      text not null check (status in ('sent', 'dry_run', 'failed')),
  provider_id text,
  error       text,
  sent_by     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists guest_messages_guest_idx on guest_messages(guest_id, created_at desc);

-- ------------------------------------------------------ site engine --
-- A restaurant's website. The content is not here: it is in
-- site_versions, and published_version_id says which one is live.
create table if not exists sites (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  -- The venue the site takes bookings for.
  venue_id    uuid not null references venues(id) on delete cascade,
  slug        text not null unique,
  theme       text not null default 'classic',
  custom_domain text unique,
  published_version_id uuid,
  created_at  timestamptz not null default now()
);

-- Every save is a new row and no row is ever edited, so preview,
-- history and rollback are all just "which row".
create table if not exists site_versions (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  site_id     uuid not null references sites(id) on delete cascade,
  content     jsonb not null,
  note        text,
  created_by  text not null,
  created_at  timestamptz not null default now()
);

create index if not exists site_versions_site_idx on site_versions(site_id, created_at desc);

-- ------------------------------------------------ restaurant logins --
-- Separate from the studio's login_tokens/sessions on purpose: a studio
-- session opens clients and proposals, and a host at a restaurant must
-- never hold one. Same magic-link shape, different tables and cookie.
create table if not exists member_login_tokens (
  token      text primary key,
  email      text not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists member_sessions (
  token      text primary key,
  email      text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists member_sessions_expiry_idx on member_sessions(expires_at);

-- Counters for public endpoints (booking, sign-in links). The key is a
-- hash, never a raw address or phone number.
create table if not exists rate_events (
  key        text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_events_key_idx on rate_events(key, created_at desc);

-- When the reminder text went out, so it goes out once. Cleared when a
-- guest moves the booking, so the new time gets its own reminder.
alter table reservations add column if not exists reminder_sent_at timestamptz;

-- "Tell me if a table opens." One row per request; texted in the order
-- they asked when a matching table frees up.
create table if not exists waitlist_requests (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  venue_id    uuid not null references venues(id) on delete cascade,
  name        text not null,
  phone       text not null,
  date        date not null,
  party_size  integer not null check (party_size >= 1),
  status      text not null default 'waiting' check (status in ('waiting', 'notified', 'closed')),
  notified_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (venue_id, phone, date)
);

create index if not exists waitlist_venue_date_idx on waitlist_requests(venue_id, date, status, created_at);

-- ---------------------------------------------------- integrations --
-- A restaurant's connection to an outside service (its Google Business
-- Profile, its Square account). Platform-wide services (Twilio, Stripe,
-- the AI model) are configured by environment, not here.
create table if not exists org_integrations (
  org_id       uuid not null references orgs(id) on delete cascade,
  provider     text not null,
  status       text not null default 'requested'
    check (status in ('requested', 'connected', 'error', 'disconnected')),
  account_label text,
  settings     jsonb not null default '{}'::jsonb,
  error        text,
  updated_by   text not null,
  updated_at   timestamptz not null default now(),
  primary key (org_id, provider)
);

-- Payments against a reservation (deposits now; no-show fees later).
-- Provider-neutral: the provider's own id is kept, never card data.
create table if not exists payments (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  reservation_id uuid references reservations(id) on delete set null,
  kind           text not null check (kind in ('deposit', 'no_show_fee')),
  amount_cents   integer not null check (amount_cents > 0),
  status         text not null default 'pending'
    check (status in ('pending', 'held', 'captured', 'refunded', 'failed', 'canceled')),
  provider       text not null,
  provider_ref   text,
  checkout_url   text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists payments_reservation_idx on payments(reservation_id);

-- The policy a guest is shown before booking, per venue.
alter table venues add column if not exists cancellation_policy text not null default '';
alter table venues add column if not exists cancel_cutoff_hours integer not null default 24;

-- The processor's id for the money itself (Stripe payment intent), kept
-- apart from provider_ref (the checkout session) because refunds need it.
alter table payments add column if not exists provider_charge_ref text;
create index if not exists payments_provider_ref_idx on payments(provider, provider_ref);

-- Provider credentials for a restaurant's own account (OAuth refresh
-- tokens), encrypted with INTEGRATIONS_KEY before they reach the row.
alter table org_integrations add column if not exists secret text;

-- Reviews pulled from Google (and later others). The reply is ours to
-- write; posting it back is an approve-tier action.
create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  source       text not null,
  external_id  text not null,
  author       text,
  rating       smallint check (rating between 1 and 5),
  body         text,
  reviewed_at  timestamptz,
  reply        text,
  replied_at   timestamptz,
  created_at   timestamptz not null default now(),
  unique (org_id, source, external_id)
);

create index if not exists reviews_org_idx on reviews(org_id, reviewed_at desc);

-- ------------------------------------------------- visits & spend --
-- A closed check from the point of sale, matched to a guest. One row per
-- check (unique per source), so a webhook delivered twice counts once.
create table if not exists guest_checks (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  guest_id     uuid references guests(id) on delete set null,
  source       text not null,
  external_id  text not null,
  amount_cents integer not null check (amount_cents >= 0),
  closed_at    timestamptz not null,
  created_at   timestamptz not null default now(),
  unique (org_id, source, external_id)
);

create index if not exists guest_checks_guest_idx on guest_checks(guest_id, closed_at desc);

alter table guests add column if not exists total_spend_cents bigint not null default 0;

-- ---------------------------------------------------------- loyalty --
-- Visit-based rewards: every N visits earns the reward. Simple enough to
-- explain at the host stand in one sentence.
create table if not exists loyalty_programs (
  org_id          uuid primary key references orgs(id) on delete cascade,
  active          boolean not null default false,
  visits_required integer not null default 5 check (visits_required between 2 and 50),
  reward          text not null default 'A dessert on us',
  updated_at      timestamptz not null default now()
);

create table if not exists loyalty_rewards (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  guest_id    uuid not null references guests(id) on delete cascade,
  reward      text not null,
  earned_at_visit integer not null,
  earned_at   timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_by text,
  unique (guest_id, earned_at_visit)
);

create index if not exists loyalty_rewards_guest_idx on loyalty_rewards(guest_id) where redeemed_at is null;

-- Email marketing consent, kept apart from SMS: a guest can want one and
-- not the other. Same shape — when, how, and when they left.
alter table guests add column if not exists email_consent_at timestamptz;
alter table guests add column if not exists email_consent_source text;
alter table guests add column if not exists email_opted_out_at timestamptz;

-- ------------------------------------------------------- gift cards --
create table if not exists gift_cards (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references orgs(id) on delete cascade,
  -- XXXX-XXXX-XXXX from an alphabet without look-alikes (no 0/O, 1/I/L).
  code            text not null unique,
  initial_cents   integer not null check (initial_cents between 500 and 100000),
  balance_cents   integer not null check (balance_cents >= 0),
  status          text not null default 'pending' check (status in ('pending', 'active', 'void')),
  purchaser_name  text not null,
  purchaser_email text not null,
  recipient_name  text,
  recipient_email text,
  message         text,
  activated_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists gift_cards_org_idx on gift_cards(org_id, created_at desc);

create table if not exists gift_card_redemptions (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  gift_card_id uuid not null references gift_cards(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  redeemed_by  text not null,
  created_at   timestamptz not null default now()
);

-- Payments can now be for a gift card as well as a reservation.
alter table payments add column if not exists gift_card_id uuid references gift_cards(id) on delete set null;
do $$ begin
  alter table payments drop constraint if exists payments_kind_check;
  alter table payments add constraint payments_kind_check check (kind in ('deposit', 'no_show_fee', 'gift_card', 'order'));
exception when others then null; end $$;

-- ------------------------------------------------------ ads reporting --
-- Campaigns and their daily numbers, as the ad platforms report them.
-- One row per campaign per day, keyed on the platform's own ids, so a
-- re-sync of a window replaces rather than adds (conversions arrive
-- late; the nightly sync re-reads the last 30 days).
create table if not exists ad_campaigns (
  org_id       uuid not null references orgs(id) on delete cascade,
  platform     text not null check (platform in ('google', 'meta')),
  account_id   text not null,
  campaign_id  text not null,
  name         text not null,
  status       text,
  channel      text,
  updated_at   timestamptz not null default now(),
  primary key (org_id, platform, campaign_id)
);

create table if not exists ad_daily (
  org_id         uuid not null references orgs(id) on delete cascade,
  platform       text not null check (platform in ('google', 'meta')),
  campaign_id    text not null,
  date           date not null,
  spend_cents    bigint not null default 0,
  impressions    bigint not null default 0,
  clicks         bigint not null default 0,
  -- Meta reports unique reach; Google doesn't (null, shown as —).
  reach          bigint,
  conversions    numeric(12, 2) not null default 0,
  conversion_value_cents bigint not null default 0,
  synced_at      timestamptz not null default now(),
  primary key (org_id, platform, campaign_id, date)
);

create index if not exists ad_daily_org_date_idx on ad_daily(org_id, date);

-- Each sync, for the reporting tab's "last updated" and for errors.
create table if not exists ad_syncs (
  id         bigint generated always as identity primary key,
  org_id     uuid not null references orgs(id) on delete cascade,
  platform   text not null,
  status     text not null check (status in ('ok', 'failed')),
  rows       integer not null default 0,
  error      text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Budgets, for the Paid Ads Agent. Google keeps a budget as its own
-- object (budget_ref is its resource name); a budget shared by several
-- campaigns is never changed from one campaign's numbers. Meta budgets
-- are read-only here until write access is approved.
alter table ad_campaigns add column if not exists daily_budget_cents bigint;
alter table ad_campaigns add column if not exists budget_ref text;
alter table ad_campaigns add column if not exists budget_shared boolean not null default false;

-- What people actually searched before clicking a Google ad, totalled
-- over the sync window. Replaced on every sync.
create table if not exists ad_search_terms (
  org_id       uuid not null references orgs(id) on delete cascade,
  platform     text not null default 'google' check (platform in ('google')),
  campaign_id  text not null,
  ad_group_id  text not null,
  term         text not null,
  impressions  bigint not null default 0,
  clicks       bigint not null default 0,
  spend_cents  bigint not null default 0,
  conversions  numeric(12, 2) not null default 0,
  since        date not null,
  until        date not null,
  primary key (org_id, platform, campaign_id, ad_group_id, term)
);

-- ------------------------------------------------- online ordering --
-- Pickup and catering orders from the restaurant's own site. Prices
-- come from the published menu at the moment of ordering and are copied
-- into the order, so a later menu edit never changes what a guest paid.
create table if not exists ordering_settings (
  org_id              uuid primary key references orgs(id) on delete cascade,
  pickup_enabled      boolean not null default false,
  catering_enabled    boolean not null default false,
  -- Sales tax in basis points (7% = 700).
  tax_bps             integer not null default 0 check (tax_bps between 0 and 2500),
  lead_minutes        integer not null default 25 check (lead_minutes between 5 and 240),
  catering_lead_hours integer not null default 48 check (catering_lead_hours between 2 and 720),
  catering_min_cents  integer not null default 0 check (catering_min_cents >= 0),
  -- "We're slammed": no new pickup orders until this time.
  paused_until        timestamptz,
  -- Menu item ids that are sold out (86'd) today.
  sold_out            text[] not null default '{}',
  updated_by          text,
  updated_at          timestamptz not null default now()
);

create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references orgs(id) on delete cascade,
  venue_id       uuid not null references venues(id) on delete cascade,
  guest_id       uuid references guests(id) on delete set null,
  -- Short, readable at the counter: "Order 4821".
  number         integer not null,
  kind           text not null check (kind in ('pickup', 'catering')),
  status         text not null default 'placed'
    check (status in ('awaiting_payment', 'placed', 'accepted', 'ready', 'completed', 'cancelled')),
  payment        text not null default 'at_pickup' check (payment in ('at_pickup', 'pending', 'paid', 'refunded')),
  name           text not null,
  phone          text not null,
  email          text,
  ready_at       timestamptz not null,
  headcount      integer,
  notes          text not null default '',
  items          jsonb not null,
  subtotal_cents integer not null check (subtotal_cents >= 0),
  tax_cents      integer not null default 0,
  tip_cents      integer not null default 0 check (tip_cents >= 0),
  total_cents    integer not null check (total_cents >= 0),
  manage_token   text not null unique,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists orders_org_ready_idx on orders(org_id, ready_at);

alter table payments add column if not exists order_id uuid references orders(id) on delete set null;
do $$ begin
  alter table payments drop constraint if exists payments_kind_check;
  alter table payments add constraint payments_kind_check check (kind in ('deposit', 'no_show_fee', 'gift_card', 'order'));
end $$;

-- ------------------------------------------------------- assistant --
-- The chat: a restaurant's conversations with its assistant, and every
-- change the assistant made or proposed, with before and after, so a
-- person can see exactly what happened and undo or apply it.
create table if not exists chat_threads (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  title       text not null default 'New chat',
  created_by  text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists chat_threads_org_idx on chat_threads(org_id, updated_at desc);

create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references chat_threads(id) on delete cascade,
  org_id      uuid not null references orgs(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists chat_messages_thread_idx on chat_messages(thread_id, created_at);

create table if not exists chat_changes (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  thread_id    uuid not null references chat_threads(id) on delete cascade,
  message_id   uuid references chat_messages(id) on delete set null,
  pillar       text not null,
  lever        text not null,
  label        text not null,
  value        text not null,
  before       jsonb,
  after        jsonb,
  risk         text not null check (risk in ('auto', 'confirm')),
  status       text not null check (status in ('applied', 'pending', 'undone', 'dismissed', 'failed')),
  reason       text not null default '',
  error        text,
  requested_by text not null,
  decided_by   text,
  created_at   timestamptz not null default now(),
  decided_at   timestamptz
);
create index if not exists chat_changes_thread_idx on chat_changes(thread_id, created_at);

-- agents: settings; chat actions ------------------------------------------

-- What a restaurant has told each agent: on or off, notes in its own
-- words (voice, things never to say), and limits. Limits are read back
-- through lib/agent-runtime/settings.ts, which clamps them to the code's
-- hard limits: an owner can make an agent stricter, never looser.
create table if not exists agent_settings (
  org_id       uuid not null references orgs(id) on delete cascade,
  agent_id     text not null,
  enabled      boolean not null default true,
  instructions text not null default '' check (char_length(instructions) <= 2000),
  goals        jsonb not null default '{}'::jsonb,
  updated_by   text,
  updated_at   timestamptz not null default now(),
  primary key (org_id, agent_id)
);

-- An agent's own entries in the change log, for its activity page.
create index if not exists change_log_actor_idx on change_log(org_id, actor, created_at desc);

-- Chat changes are either a lever (a setting, before → after) or an
-- action (make a booking, cancel one, move an order, add to the team),
-- stored with its exact input so Apply runs precisely what was shown.
alter table chat_changes add column if not exists kind text not null default 'lever';
alter table chat_changes add column if not exists action text;
alter table chat_changes add column if not exists action_input jsonb;
alter table chat_changes add column if not exists result jsonb;
do $$ begin
  alter table chat_changes add constraint chat_changes_kind_check check (kind in ('lever', 'action'));
exception when duplicate_object then null; end $$;
-- marketing: segments, campaigns, promotions
-- ------------------------------------------------------------------
-- Saved guest audiences. The rules are data (lib/marketing/segments.ts
-- turns them into SQL and into a plain-English description); the
-- members are worked out live, never stored, so a segment is always
-- current. The built-in segments live in code, not here.
create table if not exists segments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  name        text not null,
  rules       jsonb not null default '{}'::jsonb,
  created_by  text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists segments_org_idx on segments(org_id, created_at desc);

-- A text or email to a segment. Drafted by a person or an agent, sent
-- (or scheduled) only by a person with message_guests. `segment` is a
-- built-in key ('regulars') or a segments.id. Results are read from
-- guest_messages by campaign_id, not copied here.
create table if not exists campaigns (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  name          text not null,
  channel       text not null check (channel in ('sms', 'email')),
  segment       text not null,
  segment_name  text not null,
  subject       text,
  body          text not null,
  status        text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_for timestamptz,
  scheduled_by  text,
  sent_at       timestamptz,
  sent_by       text,
  skipped       integer not null default 0,
  last_error    text,
  -- A person's email, or agent:<id> for a draft an agent wrote.
  created_by    text not null,
  -- For agent drafts: the person who asked for it.
  requested_by  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists campaigns_org_idx on campaigns(org_id, created_at desc);
create index if not exists campaigns_due_idx on campaigns(scheduled_for) where status = 'scheduled';

alter table guest_messages add column if not exists campaign_id uuid references campaigns(id) on delete set null;
create index if not exists guest_messages_campaign_idx on guest_messages(campaign_id) where campaign_id is not null;

-- Promo codes and automatic discounts for online ordering. code null =
-- automatic (applies without a code). Uses are counted from orders, so
-- a cancelled order gives its use back.
create table if not exists promotions (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references orgs(id) on delete cascade,
  name                text not null,
  code                text,
  kind                text not null check (kind in ('percent_order', 'amount_order', 'amount_item')),
  percent             integer check (percent between 1 and 100),
  amount_cents        integer check (amount_cents > 0),
  item_id             text,
  min_subtotal_cents  integer not null default 0 check (min_subtotal_cents >= 0),
  starts_at           timestamptz,
  ends_at             timestamptz,
  max_uses            integer check (max_uses > 0),
  max_uses_per_phone  integer check (max_uses_per_phone > 0),
  active              boolean not null default true,
  created_by          text not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index if not exists promotions_org_code_idx on promotions(org_id, upper(code)) where code is not null;

-- An order's discount: total = subtotal - discount + tax on the
-- discounted subtotal + tip. The discount never exceeds the subtotal.
alter table orders add column if not exists discount_cents integer not null default 0;
alter table orders add column if not exists promotion_id uuid references promotions(id) on delete set null;
create index if not exists orders_promotion_idx on orders(promotion_id) where promotion_id is not null;

-- Who scheduled a campaign and in what role, so the send can re-check
-- their permission at the moment it goes out.
alter table campaigns add column if not exists scheduled_role text;
