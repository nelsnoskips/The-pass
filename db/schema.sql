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
