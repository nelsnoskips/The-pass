import { db } from "@/lib/db";
import { newToken } from "./review";
import type { Client, Project, ProjectStage, ReviewComment, ReviewRound } from "./types";

/** A project with everything the board needs to draw one row. */
export type ProjectRow = Project & {
  client_name: string;
  contact_name: string | null;
  open_comments: number;
  latest_round: number | null;
  latest_token: string | null;
  latest_status: string | null;
};

export async function listProjects(): Promise<ProjectRow[]> {
  const sql = db();
  if (!sql) return [];
  return sql<ProjectRow[]>`
    select p.*,
           c.name         as client_name,
           c.contact_name as contact_name,
           coalesce(x.open_comments, 0)::int as open_comments,
           r.round  as latest_round,
           r.token  as latest_token,
           r.status as latest_status
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
    order by x.open_comments desc nulls last, p.updated_at desc
  `;
}

export async function listClients(): Promise<Client[]> {
  const sql = db();
  if (!sql) return [];
  return sql<Client[]>`select * from clients order by name`;
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
