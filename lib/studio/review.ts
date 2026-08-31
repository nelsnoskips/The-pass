import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { Project, ProjectMock, ReviewComment, ReviewRound } from "./types";

/**
 * Review rounds: the "here is the mock, tell us what to change" loop.
 *
 * The token in the URL is the client's entire credential. That is a
 * deliberate trade — asking a restaurant owner to create an account
 * before they can say "the logo is too big" loses more feedback than
 * the risk of an unguessable link leaking is worth. 24 bytes of
 * randomness is not brute-forceable, the round can be closed the
 * moment it is done, and nothing behind it is destructive: the worst a
 * leaked link allows is reading a mock and adding a comment.
 */
export function newToken() {
  return randomBytes(24).toString("base64url");
}

/**
 * What the client is actually shown. A project sold as three concepts
 * carries a `mocks` list; one sold as a single build carries only
 * `mock_path`. Both arrive here as a list so the workspace has one
 * shape to render, and a one-entry list renders without a switcher.
 */
export function mocksFor(project: Project): ProjectMock[] {
  const listed = Array.isArray(project.mocks) ? project.mocks : [];
  const clean = listed
    .filter((m) => m && typeof m.path === "string" && m.path.trim().length > 0)
    .map((m) => ({ label: (m.label ?? "").trim() || m.path, path: m.path.trim() }));
  if (clean.length > 0) return clean;
  return project.mock_path ? [{ label: "The mock", path: project.mock_path }] : [];
}

/**
 * The mock list, typed as one line per concept: `Label /path`, or just
 * `/path` to let the path stand as its own label. A textarea rather
 * than repeating fields because three concepts is a list you write in
 * one go and re-order by moving a line, and because the form has to
 * survive a fourth being added without a schema change.
 */
export function parseMocks(raw: string | null): ProjectMock[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // The path is the last whitespace-separated token that looks like
      // one, so a label may contain spaces without being quoted.
      const parts = line.split(/\s+/);
      const at = parts.map((t) => t.startsWith("/")).lastIndexOf(true);
      if (at === -1) return null;
      const path = parts[at];
      const label = parts.slice(0, at).join(" ").replace(/[\u2014\u2013-]\s*$/, "").trim();
      return { label: label || path, path };
    })
    .filter((m): m is ProjectMock => m !== null);
}

export type ReviewContext = {
  round: ReviewRound;
  project: Project;
  clientName: string;
  comments: ReviewComment[];
};

export async function getReviewByToken(token: string): Promise<ReviewContext | null> {
  const sql = db();
  if (!sql) return null;

  const rows = await sql<(ReviewRound & { project: Project; client_name: string })[]>`
    select r.*,
           to_jsonb(p.*) as project,
           c.name        as client_name
    from review_rounds r
    join projects p on p.id = r.project_id
    join clients  c on c.id = p.client_id
    where r.token = ${token}
    limit 1
  `;
  if (rows.length === 0) return null;

  const row = rows[0];
  const comments = await sql<ReviewComment[]>`
    select * from review_comments
    where round_id = ${row.id}
    order by created_at asc
  `;

  return {
    round: row,
    project: row.project,
    clientName: row.client_name,
    comments,
  };
}

export type IncomingComment = {
  kind: "comment" | "edit";
  pagePath: string;
  selector?: string | null;
  xPct?: number | null;
  yPct?: number | null;
  originalText?: string | null;
  suggestedText?: string | null;
  body?: string | null;
};

/**
 * Writes a whole submission in one transaction and marks the round
 * submitted. Partial saves are the failure mode that matters here: a
 * client who writes eleven notes and loses three has no way of knowing
 * which three, so either all of them land or none do. The chosen
 * direction rides in the same transaction for the same reason.
 */
export async function submitReview(
  token: string,
  author: string | null,
  comments: IncomingComment[],
  chosen: string | null = null,
): Promise<{ round: ReviewRound; inserted: number } | null> {
  const sql = db();
  if (!sql) return null;

  return sql.begin(async (tx) => {
    const rounds = await tx<ReviewRound[]>`
      select * from review_rounds where token = ${token} limit 1
    `;
    if (rounds.length === 0) return null;
    const round = rounds[0];
    if (round.status === "closed") return null;

    for (const c of comments) {
      await tx`
        insert into review_comments
          (round_id, kind, page_path, selector, x_pct, y_pct,
           original_text, suggested_text, body, author)
        values
          (${round.id}, ${c.kind}, ${c.pagePath}, ${c.selector ?? null},
           ${c.xPct ?? null}, ${c.yPct ?? null}, ${c.originalText ?? null},
           ${c.suggestedText ?? null}, ${c.body ?? null}, ${author})
      `;
    }

    // A blank choice must not wipe one already recorded: a client who
    // picks a direction, sends, then reopens the link to add a note
    // should not lose the pick by leaving the selector alone.
    const [updated] = await tx<ReviewRound[]>`
      update review_rounds
      set status = 'submitted',
          submitted_at = now(),
          chosen = coalesce(${chosen}, chosen)
      where id = ${round.id}
      returning *
    `;

    return { round: updated, inserted: comments.length };
  }) as Promise<{ round: ReviewRound; inserted: number } | null>;
}
