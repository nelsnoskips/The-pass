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
