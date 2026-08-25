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
