import { db } from "@/lib/db";
import { newToken } from "./review";
import type { Client, Project, ProjectMock, ProjectStage, ReviewComment, ReviewRound } from "./types";

/** A project with everything the board needs to draw one row. */
export type ProjectRow = Project & {
  client_name: string;
  contact_name: string | null;
  open_comments: number;
  latest_round: number | null;
  latest_token: string | null;
  latest_status: string | null;
  latest_submitted_at: string | null;
  /** Submitted, and the studio has not opened it since. */
  is_new: boolean;
};

/**
 * The board. `q` filters on client and project name; an empty string
 * means everything, which is what the studio wants until it doesn't.
 *
 * "New" is deliberately not the same as "has unresolved comments". A
 * count of outstanding notes tells you how much work is left; is_new
 * tells you something arrived since you last looked. They answer
 * different questions and the second one is what a notification is.
 */
export async function listProjects(q = ""): Promise<ProjectRow[]> {
  const sql = db();
  if (!sql) return [];
  const like = `%${q.trim()}%`;
  return sql<ProjectRow[]>`
    select p.*,
           c.name         as client_name,
           c.contact_name as contact_name,
           coalesce(x.open_comments, 0)::int as open_comments,
           r.round  as latest_round,
           r.token  as latest_token,
           r.status as latest_status,
           r.submitted_at as latest_submitted_at,
           (r.status = 'submitted' and r.seen_at is null) as is_new
    from projects p
    join clients c on c.id = p.client_id
    -- The newest round per project, and how much of it is still unread.
    left join lateral (
      select * from review_rounds rr
      where rr.project_id = p.id
      order by rr.round desc
      limit 1
    ) r on true
    left join lateral (
      select count(*) as open_comments
      from review_comments rc
      join review_rounds rr2 on rr2.id = rc.round_id
      where rr2.project_id = p.id and rc.resolved = false
    ) x on true
    where p.stage <> 'archived'
      and c.archived_at is null
      and (${q.trim() === ""} or p.name ilike ${like} or c.name ilike ${like})
    order by (r.status = 'submitted' and r.seen_at is null) desc,
             x.open_comments desc nulls last,
             p.updated_at desc
  `;
}

/** Archived clients, for the search-the-back-catalogue case. */
export async function listArchivedClients(q = ""): Promise<Client[]> {
  const sql = db();
  if (!sql) return [];
  const like = `%${q.trim()}%`;
  return sql<Client[]>`
    select * from clients
    where archived_at is not null
      and (${q.trim() === ""} or name ilike ${like})
    order by archived_at desc
  `;
}

export async function archiveClient(id: string, archived: boolean) {
  const sql = db();
  if (!sql) return;
  await sql`
    update clients set archived_at = ${archived ? sql`now()` : null} where id = ${id}
  `;
}

/**
 * Hard delete. Everything below a client cascades — projects, rounds,
 * comments — so this is unrecoverable, which is why archiving exists
 * and why the UI asks twice.
 */
export async function deleteClient(id: string) {
  const sql = db();
  if (!sql) return;
  await sql`delete from clients where id = ${id}`;
}

/** Called when the studio opens a project, which is what makes a
 *  submitted round stop being new. */
export async function markRoundsSeen(projectId: string) {
  const sql = db();
  if (!sql) return;
  await sql`
    update review_rounds
    set seen_at = now()
    where project_id = ${projectId} and status = 'submitted' and seen_at is null
  `;
}

export async function listClients(q = ""): Promise<Client[]> {
  const sql = db();
  if (!sql) return [];
  const like = `%${q.trim()}%`;
  return sql<Client[]>`
    select * from clients
    where archived_at is null
      and (${q.trim() === ""} or name ilike ${like})
    order by name
  `;
}

export async function getProject(id: string) {
  const sql = db();
  if (!sql) return null;
  const rows = await sql<(Project & { client_name: string; contact_email: string | null })[]>`
    select p.*, c.name as client_name, c.contact_email
    from projects p join clients c on c.id = p.client_id
    where p.id = ${id} limit 1
  `;
  if (rows.length === 0) return null;

  const rounds = await sql<ReviewRound[]>`
    select * from review_rounds where project_id = ${id} order by round desc
  `;
  const comments = await sql<(ReviewComment & { round: number })[]>`
    select rc.*, rr.round
    from review_comments rc
    join review_rounds rr on rr.id = rc.round_id
    where rr.project_id = ${id}
    order by rc.created_at desc
  `;
  return { project: rows[0], rounds, comments };
}

export async function createClient(input: {
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  segment?: string | null;
}): Promise<Client | null> {
  const sql = db();
  if (!sql) return null;
  const [row] = await sql<Client[]>`
    insert into clients (name, contact_name, contact_email, segment)
    values (${input.name}, ${input.contactName ?? null},
            ${input.contactEmail ?? null}, ${input.segment ?? null})
    returning *
  `;
  return row;
}

export async function createProject(input: {
  clientId: string;
  name: string;
  stage?: ProjectStage;
  mockPath?: string | null;
  monthlyFee?: number | null;
}): Promise<Project | null> {
  const sql = db();
  if (!sql) return null;
  const [row] = await sql<Project[]>`
    insert into projects (client_id, name, stage, mock_path, monthly_fee)
    values (${input.clientId}, ${input.name}, ${input.stage ?? "lead"},
            ${input.mockPath ?? null}, ${input.monthlyFee ?? null})
    returning *
  `;
  return row;
}

/**
 * Replaces a project's mock list. Stored whole rather than diffed:
 * three concepts are named and ordered together, and a partial update
 * would let a re-order silently drop one.
 */
export async function setProjectMocks(projectId: string, mocks: ProjectMock[]) {
  const sql = db();
  if (!sql) return;
  await sql`
    update projects
    set mocks = ${sql.json(mocks)}, updated_at = now()
    where id = ${projectId}
  `;
}

export async function setStage(projectId: string, stage: ProjectStage) {
  const sql = db();
  if (!sql) return;
  await sql`
    update projects set stage = ${stage}, updated_at = now() where id = ${projectId}
  `;
}

/**
 * Opens the next round for a project. Rounds are numbered per project
 * rather than globally, because "round 3" means something to a client
 * and "round 47" does not.
 */
export async function openRound(projectId: string, note?: string | null) {
  const sql = db();
  if (!sql) return null;
  const [{ next }] = await sql<{ next: number }[]>`
    select coalesce(max(round), 0) + 1 as next
    from review_rounds where project_id = ${projectId}
  `;
  const [row] = await sql<ReviewRound[]>`
    insert into review_rounds (project_id, token, round, note)
    values (${projectId}, ${newToken()}, ${next}, ${note ?? null})
    returning *
  `;
  await sql`update projects set stage = 'in_review', updated_at = now() where id = ${projectId}`;
  return row;
}

export async function setCommentResolved(commentId: string, resolved: boolean) {
  const sql = db();
  if (!sql) return;
  await sql`update review_comments set resolved = ${resolved} where id = ${commentId}`;
}

/** What a client sees on their own status page. */
export type ClientStatus = {
  clientName: string;
  projectName: string;
  stage: ProjectStage;
  mockPath: string | null;
  liveUrl: string | null;
  rounds: {
    round: number;
    status: string;
    createdAt: string;
    submittedAt: string | null;
    noteCount: number;
    resolvedCount: number;
    token: string;
  }[];
};

/**
 * The client's own view, by durable project token.
 *
 * Shows progress and nothing else — no pricing, no internal notes, no
 * other clients. The point is that "where are we at" stops being an
 * email, so it has to be worth bookmarking and safe to forward inside
 * their own company.
 */
export async function getClientStatus(token: string): Promise<ClientStatus | null> {
  const sql = db();
  if (!sql) return null;

  const rows = await sql<(Project & { client_name: string })[]>`
    select p.*, c.name as client_name
    from projects p join clients c on c.id = p.client_id
    where p.status_token = ${token}
    limit 1
  `;
  if (rows.length === 0) return null;
  const p = rows[0];

  const rounds = await sql<{
    round: number; status: string; created_at: string; submitted_at: string | null;
    token: string; note_count: number; resolved_count: number;
  }[]>`
    select r.round, r.status, r.created_at, r.submitted_at, r.token,
           count(rc.id)::int                                as note_count,
           count(rc.id) filter (where rc.resolved)::int     as resolved_count
    from review_rounds r
    left join review_comments rc on rc.round_id = r.id
    where r.project_id = ${p.id}
    group by r.id
    order by r.round desc
  `;

  return {
    clientName: p.client_name,
    projectName: p.name,
    stage: p.stage,
    mockPath: p.mock_path,
    liveUrl: p.live_url,
    rounds: rounds.map((r) => ({
      round: r.round,
      status: r.status,
      createdAt: r.created_at,
      submittedAt: r.submitted_at,
      noteCount: r.note_count,
      resolvedCount: r.resolved_count,
      token: r.token,
    })),
  };
}

export async function statusTokenFor(projectId: string): Promise<string | null> {
  const sql = db();
  if (!sql) return null;
  const rows = await sql<{ status_token: string | null }[]>`
    select status_token from projects where id = ${projectId} limit 1
  `;
  return rows[0]?.status_token ?? null;
}

export async function getClient(id: string): Promise<Client | null> {
  const sql = db();
  if (!sql) return null;
  const rows = await sql<Client[]>`select * from clients where id = ${id} limit 1`;
  return rows[0] ?? null;
}

export async function projectsForClient(clientId: string): Promise<Project[]> {
  const sql = db();
  if (!sql) return [];
  return sql<Project[]>`
    select * from projects where client_id = ${clientId} order by created_at desc
  `;
}

/**
 * One client's whole record, in time order.
 *
 * Derived from what already exists rather than written to an events
 * table on the side. An audit table would drift the moment anything is
 * edited outside it; a union over the real rows cannot, because there
 * is nothing to keep in step.
 */
export type HistoryEvent = {
  at: string;
  kind: "client" | "project" | "proposal" | "round_opened" | "round_submitted";
  title: string;
  detail: string | null;
  href: string | null;
};

export async function clientHistory(clientId: string): Promise<HistoryEvent[]> {
  const sql = db();
  if (!sql) return [];
  return sql<HistoryEvent[]>`
    select at, kind, title, detail, href from (
      select c.created_at as at, 'client' as kind,
             'Client added' as title, c.segment as detail,
             null::text as href
      from clients c where c.id = ${clientId}

      union all
      select p.created_at, 'project',
             'Project started', p.name,
             '/studio/projects/' || p.id
      from projects p where p.client_id = ${clientId}

      union all
      select q.created_at, 'proposal',
             'Proposal generated', q.company,
             '/proposals/' || q.slug
      from proposals q where q.client_id = ${clientId}

      union all
      select r.created_at, 'round_opened',
             'Review round ' || r.round || ' opened', p.name,
             '/review/' || r.token
      from review_rounds r join projects p on p.id = r.project_id
      where p.client_id = ${clientId}

      union all
      select r.submitted_at, 'round_submitted',
             'Round ' || r.round || ' submitted',
             p.name || ' — ' || (
               select count(*) from review_comments rc where rc.round_id = r.id
             ) || ' notes',
             '/studio/projects/' || p.id
      from review_rounds r join projects p on p.id = r.project_id
      where p.client_id = ${clientId} and r.submitted_at is not null
    ) events
    order by at desc
  `;
}

export async function proposalsForClient(clientId: string) {
  const sql = db();
  if (!sql) return [];
  return sql<{ id: string; slug: string; company: string; monthly_fee: string | null; created_at: string }[]>`
    select id, slug, company, monthly_fee, created_at
    from proposals where client_id = ${clientId}
    order by updated_at desc
  `;
}
